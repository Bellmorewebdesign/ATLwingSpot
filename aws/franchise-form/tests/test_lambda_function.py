"""
Tests for the franchising form handler.

Run from this directory:  python -m pytest -q
Requires boto3 (for botocore's exception types) and pytest. No AWS access and
no network: both clients are replaced with the fakes in fakes.py.
"""

import importlib
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from botocore.exceptions import ClientError, EndpointConnectionError

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(0, HERE)

from fakes import FakeDynamoDB, FakeSES  # noqa: E402

ENV = {
    # Stand-ins. The real sender and recipient live only in the Lambda's
    # environment; putting the recipient inbox in a public repo would just be
    # handing it to scrapers.
    "SES_FROM": "forms@example.com",
    "FRANCHISE_RECIPIENT": "franchise-inbox@example.com",
    "RATE_LIMIT_SECRET": "test-secret-not-a-real-one",
    "RATE_LIMIT_TABLE": "test-table",
    "MIN_INTERVAL_SECONDS": "60",
    "PER_IP_HOURLY_LIMIT": "3",
    "PER_IP_DAILY_LIMIT": "10",
    "GLOBAL_DAILY_LIMIT": "50",
    "AWS_REGION": "us-east-1",
}


@pytest.fixture
def mod(monkeypatch):
    """A freshly imported handler, so env changes are picked up."""
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    import lambda_function
    importlib.reload(lambda_function)
    lambda_function._ddb = FakeDynamoDB()
    lambda_function._ses = FakeSES()
    return lambda_function


def event(body=None, ip="203.0.113.10", method="POST", raw=None):
    if raw is None:
        raw = json.dumps(body if body is not None else {})
    http = {"method": method}
    if ip is not None:
        http["sourceIp"] = ip
    return {"requestContext": {"http": http}, "body": raw}


GOOD = {
    "firstName": "Dana",
    "lastName": "Okafor",
    "email": "dana@example.com",
    "phone": "516-555-0142",
    "territory": "New Jersey",
    "message": "Interested in two units.",
}


def body_of(resp):
    return json.loads(resp["body"])


# ---------------------------------------------------------------- happy path

def test_valid_submission_sends_one_email(mod):
    resp = mod.lambda_handler(event(GOOD), None)
    assert resp["statusCode"] == 200
    assert body_of(resp) == {"ok": True}
    assert len(mod._ses.sent) == 1


def test_email_contents_match_the_specified_format(mod):
    mod.lambda_handler(event(GOOD), None)
    sent = mod._ses.sent[0]
    assert sent["Source"] == "ATL Wing Spot <forms@example.com>"
    assert sent["Destination"]["ToAddresses"] == ["franchise-inbox@example.com"]
    assert sent["ReplyToAddresses"] == ["dana@example.com"]
    assert sent["Message"]["Subject"]["Data"] == "New ATL Wing Spot Franchising Inquiry"
    assert sent["Message"]["Body"]["Text"]["Data"] == (
        "A new franchising form submission has come in.\n"
        "\n"
        "Name: Dana Okafor\n"
        "Email: dana@example.com\n"
        "Phone: 516-555-0142\n"
        "State / territory: New Jersey\n"
        "\n"
        "Message:\n"
        "Interested in two units.\n"
    )


def test_recipient_cannot_be_overridden_from_the_body(mod):
    hostile = dict(GOOD, FRANCHISE_RECIPIENT="attacker@example.net",
                   to="attacker@example.net", recipient="attacker@example.net")
    mod.lambda_handler(event(hostile), None)
    assert mod._ses.sent[0]["Destination"]["ToAddresses"] == ["franchise-inbox@example.com"]


def test_message_is_optional(mod):
    no_message = {k: v for k, v in GOOD.items() if k != "message"}
    assert mod.lambda_handler(event(no_message), None)["statusCode"] == 200


# ---------------------------------------------------------------- validation

@pytest.mark.parametrize("missing", ["firstName", "lastName", "email", "phone", "territory"])
def test_missing_required_field_is_rejected_without_sending(mod, missing):
    payload = {k: v for k, v in GOOD.items() if k != missing}
    resp = mod.lambda_handler(event(payload), None)
    assert resp["statusCode"] == 400
    assert missing in body_of(resp)["fields"]
    assert mod._ses.sent == []
    assert mod._ddb.calls == 0          # not even a quota write


@pytest.mark.parametrize("bad", ["nope", "a@b", "two@@at.com", "sp ace@example.com",
                                 "with\nnewline@example.com", "@example.com"])
def test_invalid_emails_are_rejected(mod, bad):
    resp = mod.lambda_handler(event(dict(GOOD, email=bad)), None)
    assert resp["statusCode"] == 400
    assert "email" in body_of(resp)["fields"]
    assert mod._ses.sent == []


def test_header_injection_through_reply_to_is_rejected(mod):
    evil = "ok@example.com\nBcc: everyone@example.net"
    resp = mod.lambda_handler(event(dict(GOOD, email=evil)), None)
    assert resp["statusCode"] == 400
    assert mod._ses.sent == []


def test_non_string_fields_are_rejected_not_coerced(mod):
    resp = mod.lambda_handler(event(dict(GOOD, firstName=["Dana"], phone=5165550142)), None)
    assert resp["statusCode"] == 400
    fields = body_of(resp)["fields"]
    assert "firstName" in fields and "phone" in fields
    assert mod._ses.sent == []


def test_overlong_field_is_rejected(mod):
    resp = mod.lambda_handler(event(dict(GOOD, firstName="x" * 101)), None)
    assert resp["statusCode"] == 400
    assert "firstName" in body_of(resp)["fields"]
    assert mod._ses.sent == []


def test_oversized_request_is_rejected_before_parsing(mod):
    resp = mod.lambda_handler(event(raw="x" * (mod.MAX_BODY_BYTES + 1)), None)
    assert resp["statusCode"] == 413
    assert mod._ses.sent == []
    assert mod._ddb.calls == 0


def test_malformed_json_is_rejected(mod):
    resp = mod.lambda_handler(event(raw="{not json"), None)
    assert resp["statusCode"] == 400
    assert body_of(resp)["error"] == "invalid_json"
    assert mod._ses.sent == []


def test_json_that_is_not_an_object_is_rejected(mod):
    resp = mod.lambda_handler(event(raw='["a", "b"]'), None)
    assert resp["statusCode"] == 400
    assert mod._ses.sent == []


def test_non_post_is_rejected(mod):
    assert mod.lambda_handler(event(GOOD, method="GET"), None)["statusCode"] == 405
    assert mod._ses.sent == []


# ----------------------------------------------------------------- honeypot

def test_filled_honeypot_looks_accepted_but_sends_nothing(mod):
    payload = dict(GOOD)
    payload[mod.HONEYPOT_FIELD] = "http://spam.example"
    resp = mod.lambda_handler(event(payload), None)
    assert resp["statusCode"] == 200          # no feedback for the bot
    assert body_of(resp) == {"ok": True}
    assert mod._ses.sent == []
    assert mod._ddb.calls == 0                # and it costs no quota


def test_empty_honeypot_is_fine(mod):
    payload = dict(GOOD)
    payload[mod.HONEYPOT_FIELD] = "   "
    assert mod.lambda_handler(event(payload), None)["statusCode"] == 200
    assert len(mod._ses.sent) == 1


# -------------------------------------------------------------- rate limits

def test_second_submission_within_the_interval_is_refused(mod):
    assert mod.lambda_handler(event(GOOD), None)["statusCode"] == 200
    resp = mod.lambda_handler(event(GOOD), None)
    assert resp["statusCode"] == 429
    assert body_of(resp)["error"] == "rate_limited"
    assert int(resp["headers"]["retry-after"]) > 0
    assert len(mod._ses.sent) == 1


def test_retry_after_counts_down_as_the_interval_elapses(mod):
    mod.acquire_quota("hash", now=1_000_000)
    with pytest.raises(mod.RateLimited) as caught:
        mod.acquire_quota("hash", now=1_000_040)
    assert caught.value.scope == "interval"
    assert caught.value.retry_after == 20       # 60 - 40


def test_interval_allows_the_next_one_once_it_has_passed(mod):
    mod.acquire_quota("hash", now=1_000_000)
    mod.acquire_quota("hash", now=1_000_060)    # exactly at the boundary
    assert mod._ddb.calls == 2


def test_hourly_cap_blocks_the_fourth_in_the_same_hour(mod):
    base = 1_000_000 - (1_000_000 % 3600)       # top of an hour
    for i in range(3):
        mod.acquire_quota("hash", now=base + i * 70)
    with pytest.raises(mod.RateLimited) as caught:
        mod.acquire_quota("hash", now=base + 300)
    assert caught.value.scope == "hourly"


def test_hourly_window_resets_at_the_boundary(mod):
    base = 1_000_000 - (1_000_000 % 3600)
    for i in range(3):
        mod.acquire_quota("hash", now=base + i * 70)
    # First second of the next hour: a new key, so a fresh allowance. This is
    # the documented fixed-window edge, asserted so it cannot change silently.
    mod.acquire_quota("hash", now=base + 3600)


def test_daily_cap_blocks_once_reached(mod, monkeypatch):
    monkeypatch.setattr(mod, "PER_IP_HOURLY_LIMIT", 100)
    start = 1_700_000_000 - (1_700_000_000 % 86400)
    for i in range(mod.PER_IP_DAILY_LIMIT):
        mod.acquire_quota("hash", now=start + i * 100)
    with pytest.raises(mod.RateLimited) as caught:
        mod.acquire_quota("hash", now=start + 5000)
    assert caught.value.scope == "daily"


def test_global_cap_blocks_every_ip(mod, monkeypatch):
    monkeypatch.setattr(mod, "GLOBAL_DAILY_LIMIT", 3)
    start = 1_700_000_000 - (1_700_000_000 % 86400)
    for i in range(3):
        mod.acquire_quota(f"hash{i}", now=start + i * 10)
    with pytest.raises(mod.RateLimited) as caught:
        mod.acquire_quota("a-completely-different-ip", now=start + 100)
    assert caught.value.scope == "global"


def test_daily_counters_reset_on_the_next_utc_day(mod, monkeypatch):
    monkeypatch.setattr(mod, "GLOBAL_DAILY_LIMIT", 2)
    start = 1_700_000_000 - (1_700_000_000 % 86400)
    mod.acquire_quota("a", now=start)
    mod.acquire_quota("b", now=start + 10)
    with pytest.raises(mod.RateLimited):
        mod.acquire_quota("c", now=start + 20)
    mod.acquire_quota("c", now=start + 86400)   # next UTC day, new key


# ------------------------------------------------------------ missing source IP

def test_missing_source_ip_is_still_rate_limited(mod):
    first = mod.lambda_handler(event(GOOD, ip=None), None)
    second = mod.lambda_handler(event(GOOD, ip=None), None)
    assert first["statusCode"] == 200
    assert second["statusCode"] == 429
    assert len(mod._ses.sent) == 1


def test_missing_source_ip_shares_one_bucket_not_a_free_one(mod):
    mod.lambda_handler(event(GOOD, ip=None), None)
    blank = mod.lambda_handler(event(GOOD, ip="   "), None)
    assert blank["statusCode"] == 429


def test_spoofed_ip_in_body_or_headers_is_ignored(mod):
    mod.lambda_handler(event(GOOD), None)
    spoofed = event(dict(GOOD, sourceIp="198.51.100.9", ip="198.51.100.9"))
    spoofed["headers"] = {"x-forwarded-for": "198.51.100.9"}
    assert mod.lambda_handler(spoofed, None)["statusCode"] == 429


# --------------------------------------------------------------- concurrency

def test_concurrent_requests_cannot_exceed_the_hourly_cap(mod, monkeypatch):
    """Twenty threads race for three places. Exactly three may win."""
    monkeypatch.setattr(mod, "MIN_INTERVAL_SECONDS", 0)
    base = 1_000_000 - (1_000_000 % 3600)
    wins, losses = [], []
    barrier = threading.Barrier(20)

    def attempt(_):
        barrier.wait()
        try:
            mod.acquire_quota("same-ip", now=base + 1)
            wins.append(1)
        except mod.RateLimited as exc:
            losses.append(exc.scope)

    with ThreadPoolExecutor(max_workers=20) as pool:
        list(pool.map(attempt, range(20)))

    assert len(wins) == 3
    assert len(losses) == 17
    assert mod._ddb.items[f"ip#same-ip#h#{base // 3600}"]["n"]["N"] == "3"


def test_concurrent_requests_cannot_exceed_the_global_cap(mod, monkeypatch):
    monkeypatch.setattr(mod, "GLOBAL_DAILY_LIMIT", 5)
    start = 1_700_000_000 - (1_700_000_000 % 86400)
    wins = []
    barrier = threading.Barrier(25)

    def attempt(i):
        barrier.wait()
        try:
            mod.acquire_quota(f"ip-{i}", now=start + 1)   # all different IPs
            wins.append(1)
        except mod.RateLimited:
            pass

    with ThreadPoolExecutor(max_workers=25) as pool:
        list(pool.map(attempt, range(25)))

    assert len(wins) == 5


# ------------------------------------------------------------ store failures

def _client_error(code):
    return ClientError({"Error": {"Code": code, "Message": code}}, "TransactWriteItems")


@pytest.mark.parametrize("failure", [
    _client_error("ProvisionedThroughputExceededException"),
    _client_error("ResourceNotFoundException"),
    _client_error("AccessDeniedException"),
    EndpointConnectionError(endpoint_url="https://dynamodb.us-east-1.amazonaws.com"),
])
def test_rate_limit_store_failure_fails_closed_without_sending(mod, failure):
    mod._ddb = FakeDynamoDB(fail_with=failure)
    resp = mod.lambda_handler(event(GOOD), None)
    assert resp["statusCode"] == 503
    assert body_of(resp)["error"] == "unavailable"
    assert mod._ses.sent == []


def test_missing_rate_limit_secret_fails_closed(monkeypatch):
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setenv("RATE_LIMIT_SECRET", "")
    import lambda_function
    importlib.reload(lambda_function)
    lambda_function._ddb = FakeDynamoDB()
    lambda_function._ses = FakeSES()
    resp = lambda_function.lambda_handler(event(GOOD), None)
    assert resp["statusCode"] == 503
    assert lambda_function._ses.sent == []


def test_missing_recipient_fails_closed(monkeypatch):
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setenv("FRANCHISE_RECIPIENT", "")
    import lambda_function
    importlib.reload(lambda_function)
    lambda_function._ddb = FakeDynamoDB()
    lambda_function._ses = FakeSES()
    assert lambda_function.lambda_handler(event(GOOD), None)["statusCode"] == 503


# --------------------------------------------------------------- SES failure

def test_ses_failure_returns_502_and_keeps_the_quota(mod):
    mod._ses = FakeSES(fail_with=_client_error("MessageRejected"))
    resp = mod.lambda_handler(event(GOOD), None)
    assert resp["statusCode"] == 502
    # The quota was taken and deliberately not returned, so an immediate
    # retry is refused by the interval limit. Documented, and asserted so it
    # cannot regress into a refund.
    mod._ses = FakeSES()
    assert mod.lambda_handler(event(GOOD), None)["statusCode"] == 429
    assert mod._ses.sent == []


# ------------------------------------------------------------------- logging

def test_personal_details_are_never_logged(mod, caplog):
    caplog.set_level("INFO")
    mod.lambda_handler(event(GOOD), None)
    mod.lambda_handler(event(GOOD), None)              # a 429 as well
    mod.lambda_handler(event(dict(GOOD, email="nope")), None)
    logged = "\n".join(r.getMessage() for r in caplog.records)
    for secret in ["Dana", "Okafor", "dana@example.com", "516-555-0142",
                   "Interested in two units", "203.0.113.10"]:
        assert secret not in logged


def test_ip_hash_is_not_reversible_without_the_secret(mod):
    import hashlib
    plain = hashlib.sha256(b"203.0.113.10").hexdigest()
    assert mod._ip_hash("203.0.113.10") != plain
