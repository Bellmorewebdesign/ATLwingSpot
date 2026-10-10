"""
ATL Wing Spot franchising form: validation, rate limiting and SES delivery.

Deployed as the Lambda `atl-franchise-form` behind the HTTP API route
POST /franchise. See README.md in this directory for deployment.

WHAT THIS GUARANTEES, AND WHAT IT DOES NOT

Quota is acquired in DynamoDB before SES is called, in a single
TransactWriteItems with a condition on every counter. The transaction is
all-or-nothing, so concurrent invocations cannot push a counter past its
limit: either every condition holds and the whole thing commits, or nothing
is written and the request is refused. There is no read-then-write anywhere,
and no state is kept in Lambda memory or on local disk, so it does not matter
how many execution environments are running.

What it does NOT guarantee is exactly-once email. Quota is taken first and
deliberately never given back, so a submission whose SES call fails, times out
or returns an uncertain result has still consumed quota. That is the
conservative direction: a lost allowance is an inconvenience, a refunded one
is a way to send unlimited mail by making the send fail. A caller who retries
after a failure will be refused by the interval limit until it expires.

Nothing here is a CAPTCHA and nothing here is a defence against a distributed
sender: a botnet with many source addresses gets a fresh per-IP allowance for
each of them, and only the global daily cap stands behind that.
"""

import hashlib
import hmac
import json
import logging
import os
import re
import time
from datetime import datetime, timezone

import boto3
from botocore.exceptions import BotoCoreError, ClientError

LOG = logging.getLogger()
LOG.setLevel(logging.INFO)


# --------------------------------------------------------------------------
# Configuration. Everything tunable is an environment variable so the limits
# can be changed without a code deploy.
# --------------------------------------------------------------------------

def _int_env(name, default):
    raw = os.environ.get(name)
    if raw is None or str(raw).strip() == "":
        return default
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        LOG.warning("env %s is not an integer, using default", name)
        return default
    return value if value > 0 else default


SES_FROM = os.environ.get("SES_FROM", "").strip()
SES_FROM_NAME = os.environ.get("SES_FROM_NAME", "ATL Wing Spot").strip()
FRANCHISE_RECIPIENT = os.environ.get("FRANCHISE_RECIPIENT", "").strip()
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

RATE_LIMIT_TABLE = os.environ.get("RATE_LIMIT_TABLE", "atl-franchise-form-ratelimit").strip()
# HMAC key for the IP identifiers. Required: see _ip_hash.
RATE_LIMIT_SECRET = os.environ.get("RATE_LIMIT_SECRET", "")

MIN_INTERVAL_SECONDS = _int_env("MIN_INTERVAL_SECONDS", 60)
PER_IP_HOURLY_LIMIT = _int_env("PER_IP_HOURLY_LIMIT", 3)
PER_IP_DAILY_LIMIT = _int_env("PER_IP_DAILY_LIMIT", 10)
GLOBAL_DAILY_LIMIT = _int_env("GLOBAL_DAILY_LIMIT", 50)
MAX_BODY_BYTES = _int_env("MAX_BODY_BYTES", 16384)

SUBJECT = "New ATL Wing Spot Franchising Inquiry"

# name -> (label, required, max length)
FIELDS = {
    "firstName": ("First name", True, 100),
    "lastName": ("Last name", True, 100),
    "email": ("Email", True, 254),
    "phone": ("Phone", True, 40),
    "territory": ("State or territory", True, 120),
    "message": ("Message", False, 4000),
}

# The form carries a decoy input under this name. A real browser cannot focus
# it, see it, or autofill it, so anything in it came from something filling
# every field it found.
HONEYPOT_FIELD = "contactReason2"

# Deliberately permissive on the local part and strict about the things that
# matter here: no whitespace (which would let a header be smuggled into
# Reply-To), exactly one @, and a dotted domain.
EMAIL_RE = re.compile(r"^[^\s@<>,;:\\\"]{1,64}@[A-Za-z0-9.-]{1,252}\.[A-Za-z]{2,}$")

_ddb = None
_ses = None


def _dynamodb():
    global _ddb
    if _ddb is None:
        _ddb = boto3.client("dynamodb", region_name=AWS_REGION)
    return _ddb


def _sesclient():
    global _ses
    if _ses is None:
        _ses = boto3.client("ses", region_name=AWS_REGION)
    return _ses


# --------------------------------------------------------------------------
# HTTP plumbing
# --------------------------------------------------------------------------

def _response(status, payload, extra_headers=None):
    """
    No CORS headers here on purpose. CORS is configured on the HTTP API, and
    API Gateway writes those headers itself; adding a second copy from the
    integration is how you end up with a duplicated
    Access-Control-Allow-Origin that every browser rejects.
    """
    headers = {"content-type": "application/json", "cache-control": "no-store"}
    if extra_headers:
        headers.update(extra_headers)
    return {"statusCode": status, "headers": headers, "body": json.dumps(payload)}


def _error(status, code, message, extra_headers=None, fields=None):
    payload = {"ok": False, "error": code, "message": message}
    if fields:
        payload["fields"] = fields
    return _response(status, payload, extra_headers)


# --------------------------------------------------------------------------
# Identity
# --------------------------------------------------------------------------

def _source_ip(event):
    """
    Only requestContext.http.sourceIp, which API Gateway sets from the TCP
    peer. X-Forwarded-For and anything in the body are attacker-controlled: a
    sender who could pick their own bucket could pick a fresh one per request
    and the limiter would be decoration.

    A missing value is not a free pass. It returns None, and the caller maps
    that onto one shared bucket, so requests that arrive without a source
    address compete with each other for a single allowance.
    """
    http = (event.get("requestContext") or {}).get("http") or {}
    ip = http.get("sourceIp")
    if isinstance(ip, str) and ip.strip():
        return ip.strip()
    return None


def _ip_hash(ip):
    """
    HMAC rather than a bare hash. The IPv4 space is small enough to enumerate
    in minutes, so a plain SHA-256 of an address is reversible by brute force
    and the table would effectively be a log of who submitted. Keyed with a
    secret that never leaves the Lambda, the digests are not reversible by
    anyone who only has the table.
    """
    key = RATE_LIMIT_SECRET.encode("utf-8")
    msg = (ip if ip is not None else "\x00no-source-ip").encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------

def _validate(data):
    """Returns (cleaned, field_errors). Rejects before anything is sent."""
    errors = {}
    cleaned = {}

    for name, (label, required, max_len) in FIELDS.items():
        raw = data.get(name)
        if raw is None:
            raw = ""
        if not isinstance(raw, str):
            # Numbers, lists and objects are all rejected rather than coerced:
            # a caller sending the wrong type is a caller to distrust.
            errors[name] = f"{label} must be text"
            continue
        value = raw.strip()
        if required and not value:
            errors[name] = f"{label} is required"
            continue
        if len(value) > max_len:
            errors[name] = f"{label} must be {max_len} characters or fewer"
            continue
        cleaned[name] = value

    email = cleaned.get("email", "")
    if email and not EMAIL_RE.match(email):
        errors["email"] = "Enter a valid email address"

    phone = cleaned.get("phone", "")
    if phone and len(re.sub(r"\D", "", phone)) < 7:
        errors["phone"] = "Enter a valid phone number"

    return cleaned, errors


# --------------------------------------------------------------------------
# Rate limiting
# --------------------------------------------------------------------------

class RateLimited(Exception):
    def __init__(self, scope, retry_after):
        super().__init__(scope)
        self.scope = scope
        self.retry_after = max(1, int(retry_after))


class RateLimitUnavailable(Exception):
    pass


def _seconds_to_next_hour(now):
    return 3600 - int(now) % 3600


def _seconds_to_next_utc_day(now):
    dt = datetime.fromtimestamp(now, tz=timezone.utc)
    return 86400 - (dt.hour * 3600 + dt.minute * 60 + dt.second)


def _n(value):
    return {"N": str(int(value))}


def acquire_quota(ip_hash, now=None):
    """
    Take one unit from every window at once, or take nothing.

    FIXED WINDOWS, NOT SLIDING. The hourly and daily caps are counted against
    wall-clock boundaries (the UTC hour and the UTC calendar day), not against
    a trailing window. The consequence is worth stating plainly: a sender can
    use their whole hourly allowance at 10:59 and the whole of the next one at
    11:01, so the real worst case across a boundary is twice the limit in a
    couple of minutes. The minimum interval is what stops that being a burst
    of three in three seconds. Sliding windows would need either a read of
    recent history or a counter per request, and neither is worth the cost
    here.

    The four conditions are evaluated by DynamoDB inside one transaction, so
    two invocations that race both see the same committed state and exactly
    one of them wins. Nothing is read first and incremented after.
    """
    if now is None:
        now = time.time()
    now = int(now)

    hour_bucket = now // 3600
    day_bucket = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y-%m-%d")

    # Keys are window-specific, so a stale row is never consulted again: the
    # counter for 2026-10-09 is simply not the key any later request builds.
    # TTL is housekeeping to stop the table growing without bound, and
    # correctness does not depend on the sweeper being prompt (it routinely
    # runs hours late).
    interval_key = f"ip#{ip_hash}#last"
    hour_key = f"ip#{ip_hash}#h#{hour_bucket}"
    day_key = f"ip#{ip_hash}#d#{day_bucket}"
    global_key = f"global#d#{day_bucket}"

    hour_expiry = (hour_bucket + 2) * 3600
    day_expiry = now + _seconds_to_next_utc_day(now) + 86400

    items = [
        {
            "Put": {
                "TableName": RATE_LIMIT_TABLE,
                "Item": {
                    "pk": {"S": interval_key},
                    "last_ts": _n(now),
                    "expires_at": _n(now + max(MIN_INTERVAL_SECONDS * 4, 3600)),
                },
                "ConditionExpression": "attribute_not_exists(pk) OR last_ts <= :cutoff",
                "ExpressionAttributeValues": {":cutoff": _n(now - MIN_INTERVAL_SECONDS)},
                # So a refusal can say how long is actually left rather than
                # guessing the full interval.
                "ReturnValuesOnConditionCheckFailure": "ALL_OLD",
            }
        },
        {
            "Update": {
                "TableName": RATE_LIMIT_TABLE,
                "Key": {"pk": {"S": hour_key}},
                "UpdateExpression": "SET #n = if_not_exists(#n, :zero) + :one, expires_at = :exp",
                "ConditionExpression": "attribute_not_exists(#n) OR #n < :limit",
                "ExpressionAttributeNames": {"#n": "n"},
                "ExpressionAttributeValues": {
                    ":zero": _n(0),
                    ":one": _n(1),
                    ":limit": _n(PER_IP_HOURLY_LIMIT),
                    ":exp": _n(hour_expiry),
                },
            }
        },
        {
            "Update": {
                "TableName": RATE_LIMIT_TABLE,
                "Key": {"pk": {"S": day_key}},
                "UpdateExpression": "SET #n = if_not_exists(#n, :zero) + :one, expires_at = :exp",
                "ConditionExpression": "attribute_not_exists(#n) OR #n < :limit",
                "ExpressionAttributeNames": {"#n": "n"},
                "ExpressionAttributeValues": {
                    ":zero": _n(0),
                    ":one": _n(1),
                    ":limit": _n(PER_IP_DAILY_LIMIT),
                    ":exp": _n(day_expiry),
                },
            }
        },
        {
            "Update": {
                "TableName": RATE_LIMIT_TABLE,
                "Key": {"pk": {"S": global_key}},
                "UpdateExpression": "SET #n = if_not_exists(#n, :zero) + :one, expires_at = :exp",
                "ConditionExpression": "attribute_not_exists(#n) OR #n < :limit",
                "ExpressionAttributeNames": {"#n": "n"},
                "ExpressionAttributeValues": {
                    ":zero": _n(0),
                    ":one": _n(1),
                    ":limit": _n(GLOBAL_DAILY_LIMIT),
                    ":exp": _n(day_expiry),
                },
            }
        },
    ]

    try:
        _dynamodb().transact_write_items(TransactItems=items)
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code == "TransactionCanceledException":
            raise _cancellation_to_limit(exc, now)
        # Throttling, a missing table, a permissions problem: all of them mean
        # the limiter did not run, and an unenforced send is worse than a
        # refused one.
        LOG.error("rate limit store error: %s", code)
        raise RateLimitUnavailable(code)
    except BotoCoreError as exc:
        LOG.error("rate limit store unreachable: %s", type(exc).__name__)
        raise RateLimitUnavailable(type(exc).__name__)


def _cancellation_to_limit(exc, now):
    """Map the per-item cancellation reasons onto a scope and a Retry-After."""
    reasons = exc.response.get("CancellationReasons") or []

    def failed(i):
        return i < len(reasons) and reasons[i].get("Code") == "ConditionalCheckFailed"

    if failed(0):
        retry = MIN_INTERVAL_SECONDS
        item = reasons[0].get("Item") or {}
        last = item.get("last_ts", {}).get("N")
        if last is not None:
            try:
                retry = MIN_INTERVAL_SECONDS - (now - int(last))
            except (TypeError, ValueError):
                pass
        return RateLimited("interval", retry)
    if failed(1):
        return RateLimited("hourly", _seconds_to_next_hour(now))
    if failed(2):
        return RateLimited("daily", _seconds_to_next_utc_day(now))
    if failed(3):
        return RateLimited("global", _seconds_to_next_utc_day(now))
    # Cancelled for a reason that is not a failed condition (a capacity
    # problem, say). Treat it as the store being unavailable.
    raise RateLimitUnavailable("TransactionCanceled")


_LIMIT_MESSAGES = {
    "interval": "You just sent a request. Give it a minute and try again.",
    "hourly": "That is a few requests in a short time. Try again shortly.",
    "daily": "You have reached today's limit for this form. Try again tomorrow, "
             "or reach us on Instagram.",
    "global": "This form is at its limit for today. Please try again tomorrow, "
              "or reach us on Instagram.",
}


# --------------------------------------------------------------------------
# Email
# --------------------------------------------------------------------------

def _body_text(c):
    return (
        "A new franchising form submission has come in.\n"
        "\n"
        f"Name: {c['firstName']} {c['lastName']}\n"
        f"Email: {c['email']}\n"
        f"Phone: {c['phone']}\n"
        f"State / territory: {c['territory']}\n"
        "\n"
        "Message:\n"
        f"{c.get('message', '')}\n"
    )


def _send_email(cleaned):
    source = f"{SES_FROM_NAME} <{SES_FROM}>" if SES_FROM_NAME else SES_FROM
    return _sesclient().send_email(
        Source=source,
        Destination={"ToAddresses": [FRANCHISE_RECIPIENT]},
        # The applicant address has already been through EMAIL_RE, which
        # rejects whitespace, so it cannot carry a second header in here.
        ReplyToAddresses=[cleaned["email"]],
        Message={
            "Subject": {"Data": SUBJECT, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": _body_text(cleaned), "Charset": "UTF-8"}},
        },
    )


# --------------------------------------------------------------------------
# Handler
# --------------------------------------------------------------------------

def lambda_handler(event, context):
    event = event or {}

    method = ((event.get("requestContext") or {}).get("http") or {}).get("method", "POST")
    if method.upper() == "OPTIONS":
        # Only reached if API Gateway CORS is ever turned off; normally the
        # API answers preflight itself and this never runs.
        return _response(204, {})
    if method.upper() != "POST":
        return _error(405, "method_not_allowed", "Use POST.")

    if not SES_FROM or not FRANCHISE_RECIPIENT:
        LOG.error("misconfigured: SES_FROM or FRANCHISE_RECIPIENT is empty")
        return _error(503, "unavailable", "The form is temporarily unavailable.")
    if not RATE_LIMIT_SECRET:
        # Without the key the identifiers would be plain hashes of addresses.
        # Failing closed is the right way round: a form that is briefly down
        # is recoverable, a table of recoverable IPs is not.
        LOG.error("misconfigured: RATE_LIMIT_SECRET is empty")
        return _error(503, "unavailable", "The form is temporarily unavailable.")

    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        import base64
        try:
            raw = base64.b64decode(raw).decode("utf-8")
        except Exception:
            return _error(400, "invalid_body", "Could not read the submission.")

    # Checked before parsing: a megabyte of JSON should not be parsed just to
    # discover it is too big.
    if len(raw.encode("utf-8")) > MAX_BODY_BYTES:
        return _error(413, "too_large", "That submission is too large.")

    try:
        data = json.loads(raw) if raw else {}
    except (ValueError, TypeError):
        return _error(400, "invalid_json", "Could not read the submission.")
    if not isinstance(data, dict):
        return _error(400, "invalid_json", "Could not read the submission.")

    # Honeypot first, and before any DynamoDB write. A bot that trips it gets
    # a plain 200 and no email: an error would tell it which field to leave
    # alone next time. Skipping the quota write keeps a flood of obvious bot
    # traffic from eating the global daily allowance that real people need.
    honey = data.get(HONEYPOT_FIELD)
    if isinstance(honey, str) and honey.strip():
        LOG.info(json.dumps({"event": "honeypot"}))
        return _response(200, {"ok": True})

    cleaned, errors = _validate(data)
    if errors:
        LOG.info(json.dumps({"event": "invalid", "fields": sorted(errors)}))
        return _error(400, "validation", "Please check the highlighted fields.", fields=errors)

    ip = _source_ip(event)
    ip_hash = _ip_hash(ip)

    try:
        acquire_quota(ip_hash)
    except RateLimited as limited:
        LOG.info(json.dumps({
            "event": "rate_limited",
            "scope": limited.scope,
            "ip": ip_hash[:12],
            "had_source_ip": ip is not None,
        }))
        return _error(
            429,
            "rate_limited",
            _LIMIT_MESSAGES.get(limited.scope, "Too many requests. Try again later."),
            extra_headers={"retry-after": str(limited.retry_after)},
        )
    except RateLimitUnavailable:
        # Fail closed. No email goes out that was not counted.
        return _error(503, "unavailable", "The form is temporarily unavailable. Please try again shortly.")

    try:
        _send_email(cleaned)
    except (ClientError, BotoCoreError) as exc:
        # Quota is NOT returned. See the module docstring: refunding it on
        # failure is a way to send without limit by making sends fail.
        LOG.error(json.dumps({
            "event": "ses_failed",
            "ip": ip_hash[:12],
            "error": type(exc).__name__,
        }))
        return _error(502, "send_failed", "We could not send that just now. Please try again in a few minutes.")

    # Nothing about the person is logged: no name, no email, no phone, no
    # message. The truncated hash is enough to correlate abuse and is not an
    # address.
    LOG.info(json.dumps({"event": "sent", "ip": ip_hash[:12], "had_source_ip": ip is not None}))
    return _response(200, {"ok": True})
