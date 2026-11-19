"""
API behind the franchise dashboard.

Routes (all behind the Cognito JWT authorizer on the HTTP API):

    GET   /api/submissions            list, newest first; ?status= ?archived=1 ?cursor=
    POST  /api/submissions            add one by hand, or one row of a CSV import
    GET   /api/submissions/{id}       one submission plus its change history
    PATCH /api/submissions/{id}       status, notes, lastContactedAt, archived

What it deliberately cannot do:

* Delete. There is no DeleteItem permission and no route for it. "Archive" sets
  a timestamp, and unarchiving removes it.
* Change what the applicant sent. Name, email, phone, territory and message
  are only ever written on create; PATCH refuses them.
* Create a row by accident. Every PATCH is conditional on the row existing.

Every change is written to the audit table with who made it and the before
and after values. Nothing about applicants is written to CloudWatch.
"""

import base64
import binascii
import hashlib
import json
import logging
import os
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.types import TypeDeserializer, TypeSerializer
from botocore.exceptions import ClientError

LOG = logging.getLogger()
LOG.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "atl-franchise-submissions")
AUDIT_TABLE = os.environ.get("AUDIT_TABLE", "atl-franchise-audit")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

STATUSES = ("new", "contacted", "qualified", "discovery", "fdd_sent", "signed", "declined")

# Same names and limits as the form handler, so imported and form rows match.
FIELDS = {
    "firstName": 100,
    "lastName": 100,
    "email": 254,
    "phone": 40,
    "territory": 120,
    "message": 4000,
}
REQUIRED_ON_CREATE = ("firstName", "lastName", "email")
EDITABLE = ("status", "notes", "lastContactedAt", "archived")

EMAIL_RE = re.compile(r"^[^\s@<>,;:\\\"]{1,64}@[A-Za-z0-9.-]{1,252}\.[A-Za-z]{2,}$")
ID_RE = re.compile(r"^[A-Za-z0-9-]{1,100}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

MAX_NOTES = 10000
MAX_BODY_BYTES = 65536
PAGE_LIMIT = 200
HISTORY_LIMIT = 100
AUDIT_VALUE_CHARS = 500

_ddb = None
_ser = TypeSerializer()
_deser = TypeDeserializer()


def _dynamodb():
    global _ddb
    if _ddb is None:
        _ddb = boto3.client("dynamodb", region_name=AWS_REGION)
    return _ddb


class HttpError(Exception):
    def __init__(self, status, code, message, fields=None):
        super().__init__(message)
        self.status, self.code, self.message, self.fields = status, code, message, fields


# --------------------------------------------------------------- helpers

def _now():
    return datetime.now(timezone.utc)


def _iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _plain(item):
    out = {}
    for k, v in (item or {}).items():
        value = _deser.deserialize(v)
        out[k] = _undecimal(value)
    return out


def _undecimal(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {k: _undecimal(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_undecimal(v) for v in value]
    return value


def _typed(d):
    return {k: _ser.serialize(v) for k, v in d.items()}


def _response(status, payload):
    return {
        "statusCode": status,
        "headers": {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
        },
        "body": json.dumps(payload),
    }


def _actor(event):
    claims = (((event.get("requestContext") or {}).get("authorizer") or {}).get("jwt") or {}).get("claims") or {}
    who = claims.get("username") or claims.get("cognito:username")
    if not who:
        # Only reachable if a route were ever deployed without the authorizer.
        raise HttpError(401, "unauthorized", "Sign in again.")
    return who


def _body(event):
    raw = event.get("body") or ""
    if event.get("isBase64Encoded"):
        try:
            raw = base64.b64decode(raw).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError):
            raise HttpError(400, "bad_request", "The request body could not be read.")
    if len(raw.encode("utf-8")) > MAX_BODY_BYTES:
        raise HttpError(413, "too_large", "That request is too large.")
    try:
        data = json.loads(raw or "{}")
    except ValueError:
        raise HttpError(400, "bad_request", "The request body is not valid JSON.")
    if not isinstance(data, dict):
        raise HttpError(400, "bad_request", "The request body must be an object.")
    return data


def _submission_id(event):
    sid = (event.get("pathParameters") or {}).get("id") or ""
    if not ID_RE.match(sid):
        raise HttpError(404, "not_found", "No such submission.")
    return sid


def _encode_cursor(key):
    if not key:
        return None
    return base64.urlsafe_b64encode(json.dumps(key, sort_keys=True).encode()).decode().rstrip("=")


_CURSOR_KEYS = {"submissionId", "createdAt", "status", "entity"}


def _decode_cursor(cursor):
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        key = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, binascii.Error, UnicodeDecodeError):
        raise HttpError(400, "bad_cursor", "That page link is no longer valid.")
    ok = (
        isinstance(key, dict)
        and key
        and set(key) <= _CURSOR_KEYS
        and all(isinstance(v, dict) and set(v) == {"S"} and isinstance(v["S"], str) for v in key.values())
    )
    if not ok:
        raise HttpError(400, "bad_cursor", "That page link is no longer valid.")
    return key


def _parse_date(value, field):
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise HttpError(400, "invalid", "Use a date like 2026-11-18.", {field: "Use YYYY-MM-DD"})
    try:
        d = date.fromisoformat(value)
    except ValueError:
        raise HttpError(400, "invalid", "That is not a real date.", {field: "Not a real date"})
    return d


def _normalize_created(value):
    """Accepts YYYY-MM-DD or an ISO date-time; returns UTC YYYY-MM-DDTHH:MM:SSZ."""
    if not isinstance(value, str) or not value.strip():
        raise HttpError(400, "invalid", "Received date is not valid.", {"createdAt": "Not a date"})
    value = value.strip()
    if DATE_RE.match(value):
        d = _parse_date(value, "createdAt")
        # Noon UTC, so a date-only import shows on the same calendar day in
        # every US time zone.
        dt = datetime(d.year, d.month, d.day, 12, 0, 0, tzinfo=timezone.utc)
    else:
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            raise HttpError(400, "invalid", "Received date is not valid.", {"createdAt": "Not a date"})
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc).replace(microsecond=0)
    if dt > _now() + timedelta(days=1):
        raise HttpError(400, "invalid", "Received date is in the future.", {"createdAt": "In the future"})
    if dt.year < 2000:
        raise HttpError(400, "invalid", "Received date is too far in the past.", {"createdAt": "Too old"})
    return _iso(dt)


def _audit(sid, actor, action, changes):
    now = _now()
    item = {
        "submissionId": sid,
        "at": f"{_iso(now)}#{uuid.uuid4().hex[:8]}",
        "actor": actor,
        "action": action,
        "changes": changes,
    }
    _dynamodb().put_item(TableName=AUDIT_TABLE, Item=_typed(item))


def _trim(value):
    if isinstance(value, str) and len(value) > AUDIT_VALUE_CHARS:
        return value[:AUDIT_VALUE_CHARS] + "…"
    return value


# ---------------------------------------------------------------- routes

def list_submissions(event, actor):
    qs = event.get("queryStringParameters") or {}
    status = qs.get("status") or ""
    if status and status not in STATUSES:
        raise HttpError(400, "invalid", "Unknown status.")
    archived = qs.get("archived") == "1"

    kwargs = {"TableName": TABLE_NAME, "ScanIndexForward": False, "Limit": PAGE_LIMIT}
    if status:
        kwargs.update(
            IndexName="by-status",
            KeyConditionExpression="#k = :k",
            ExpressionAttributeNames={"#k": "status"},
            ExpressionAttributeValues={":k": {"S": status}},
        )
    else:
        kwargs.update(
            IndexName="by-created",
            KeyConditionExpression="#k = :k",
            ExpressionAttributeNames={"#k": "entity"},
            ExpressionAttributeValues={":k": {"S": "SUB"}},
        )
    kwargs["ExpressionAttributeNames"]["#a"] = "archivedAt"
    kwargs["FilterExpression"] = "attribute_exists(#a)" if archived else "attribute_not_exists(#a)"
    if qs.get("cursor"):
        kwargs["ExclusiveStartKey"] = _decode_cursor(qs["cursor"])

    res = _dynamodb().query(**kwargs)
    return 200, {
        "items": [_plain(i) for i in res.get("Items", [])],
        "nextCursor": _encode_cursor(res.get("LastEvaluatedKey")),
    }


def get_submission(event, actor):
    sid = _submission_id(event)
    res = _dynamodb().get_item(TableName=TABLE_NAME, Key={"submissionId": {"S": sid}})
    if "Item" not in res:
        raise HttpError(404, "not_found", "No such submission.")
    hist = _dynamodb().query(
        TableName=AUDIT_TABLE,
        KeyConditionExpression="submissionId = :id",
        ExpressionAttributeValues={":id": {"S": sid}},
        ScanIndexForward=False,
        Limit=HISTORY_LIMIT,
    )
    return 200, {
        "submission": _plain(res["Item"]),
        "history": [_plain(h) for h in hist.get("Items", [])],
    }


def update_submission(event, actor):
    sid = _submission_id(event)
    body = _body(event)
    unknown = sorted(set(body) - set(EDITABLE))
    if unknown:
        raise HttpError(400, "invalid", "Those fields cannot be changed here: " + ", ".join(unknown))
    if not body:
        raise HttpError(400, "invalid", "Nothing to change.")

    sets, removes = {}, []

    if "status" in body:
        if body["status"] not in STATUSES:
            raise HttpError(400, "invalid", "Unknown status.", {"status": "Unknown status"})
        sets["status"] = body["status"]

    if "notes" in body:
        notes = body["notes"]
        if not isinstance(notes, str):
            raise HttpError(400, "invalid", "Notes must be text.", {"notes": "Must be text"})
        notes = notes.rstrip()
        if len(notes) > MAX_NOTES:
            raise HttpError(400, "invalid", f"Notes must be {MAX_NOTES} characters or fewer.",
                            {"notes": "Too long"})
        if notes:
            sets["notes"] = notes
        else:
            removes.append("notes")

    if "lastContactedAt" in body:
        value = body["lastContactedAt"]
        if value in ("", None):
            removes.append("lastContactedAt")
        else:
            d = _parse_date(value, "lastContactedAt")
            if d > (_now() + timedelta(days=1)).date():
                raise HttpError(400, "invalid", "Last contacted is in the future.",
                                {"lastContactedAt": "In the future"})
            sets["lastContactedAt"] = d.isoformat()

    archive_to = None
    if "archived" in body:
        if not isinstance(body["archived"], bool):
            raise HttpError(400, "invalid", "archived must be true or false.")
        archive_to = body["archived"]
        if not archive_to:
            removes.append("archivedAt")

    now = _iso(_now())
    sets["updatedAt"] = now
    sets["updatedBy"] = actor

    names, values, set_parts = {}, {}, []
    for i, (k, v) in enumerate(sets.items()):
        names[f"#s{i}"] = k
        values[f":s{i}"] = _ser.serialize(v)
        set_parts.append(f"#s{i} = :s{i}")
    if archive_to:
        names["#arch"] = "archivedAt"
        values[":arch"] = _ser.serialize(now)
        set_parts.append("#arch = if_not_exists(#arch, :arch)")   # keep the first archive time
    expr = "SET " + ", ".join(set_parts)
    if removes:
        for i, k in enumerate(removes):
            names[f"#r{i}"] = k
        expr += " REMOVE " + ", ".join(f"#r{i}" for i in range(len(removes)))
    names["#id"] = "submissionId"

    try:
        res = _dynamodb().update_item(
            TableName=TABLE_NAME,
            Key={"submissionId": {"S": sid}},
            UpdateExpression=expr,
            ConditionExpression="attribute_exists(#id)",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues="ALL_OLD",
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise HttpError(404, "not_found", "No such submission.")
        raise

    old = _plain(res.get("Attributes"))
    new = dict(old)
    for k, v in sets.items():
        new[k] = v
    for k in removes:
        new.pop(k, None)
    if archive_to:
        new["archivedAt"] = old.get("archivedAt", now)

    changes = {}
    for k in ("status", "notes", "lastContactedAt"):
        if old.get(k) != new.get(k):
            changes[k] = {"from": _trim(old.get(k)), "to": _trim(new.get(k))}
    was_archived, is_archived = "archivedAt" in old, "archivedAt" in new
    if was_archived != is_archived:
        changes["archived"] = {"from": was_archived, "to": is_archived}
    if changes:
        _audit(sid, actor, "update", changes)

    return 200, {"submission": new}


def create_submission(event, actor):
    body = _body(event)
    allowed = set(FIELDS) | {"createdAt", "status", "notes"}
    unknown = sorted(set(body) - allowed)
    if unknown:
        raise HttpError(400, "invalid", "Unknown fields: " + ", ".join(unknown))

    item, errors = {}, {}
    for name, max_len in FIELDS.items():
        value = body.get(name)
        if value is None:
            value = ""
        if not isinstance(value, str):
            errors[name] = "Must be text"
            continue
        value = value.strip()
        if len(value) > max_len:
            errors[name] = f"{max_len} characters or fewer"
            continue
        if value:
            item[name] = value
    for name in REQUIRED_ON_CREATE:
        if name not in item and name not in errors:
            errors[name] = "Required"
    if "email" in item and not EMAIL_RE.match(item["email"]):
        errors["email"] = "Not a valid email address"

    status = body.get("status") or "new"
    if status not in STATUSES:
        errors["status"] = "Unknown status"

    notes = body.get("notes") or ""
    if not isinstance(notes, str):
        errors["notes"] = "Must be text"
        notes = ""
    notes = notes.rstrip()
    if len(notes) > MAX_NOTES:
        errors["notes"] = "Too long"

    if errors:
        raise HttpError(400, "invalid", "Some fields need fixing.", errors)

    created_raw = body.get("createdAt")
    if created_raw:
        created = _normalize_created(created_raw)
        # Deterministic id for imports, so importing the same file twice
        # cannot create duplicates: the second copy is refused as a 409.
        digest = hashlib.sha256(f"{item['email'].lower()}|{created}".encode()).hexdigest()
        sid, source = "imp-" + digest[:32], "import"
    else:
        created = _iso(_now())
        sid, source = str(uuid.uuid4()), "manual"

    item.update({
        "submissionId": sid,
        "createdAt": created,
        "entity": "SUB",
        "status": status,
        "schemaVersion": 1,
        "source": source,
        "createdBy": actor,
    })
    if notes:
        item["notes"] = notes

    try:
        _dynamodb().put_item(
            TableName=TABLE_NAME,
            Item=_typed(item),
            ConditionExpression="attribute_not_exists(submissionId)",
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise HttpError(409, "duplicate", "That submission is already in the list.",
                            {"submissionId": sid})
        raise
    _audit(sid, actor, "create", {"source": source})
    return 201, {"submission": item}


ROUTES = {
    "GET /api/submissions": list_submissions,
    "POST /api/submissions": create_submission,
    "GET /api/submissions/{id}": get_submission,
    "PATCH /api/submissions/{id}": update_submission,
}


def handler(event, context):
    event = event or {}
    route = event.get("routeKey", "")
    actor = None
    try:
        fn = ROUTES.get(route)
        if fn is None:
            raise HttpError(404, "not_found", "No such route.")
        actor = _actor(event)
        status, payload = fn(event, actor)
    except HttpError as err:
        status = err.status
        payload = {"error": err.code, "message": err.message}
        if err.fields:
            payload["fields"] = err.fields
    except Exception as exc:  # noqa: BLE001
        LOG.error(json.dumps({"event": "api_error", "route": route, "error": type(exc).__name__}))
        status, payload = 500, {"error": "server_error", "message": "Something went wrong. Try again."}
    # Route, outcome and who: never anything about the applicant.
    LOG.info(json.dumps({"event": "api", "route": route, "status": status, "actor": actor}))
    return _response(status, payload)
