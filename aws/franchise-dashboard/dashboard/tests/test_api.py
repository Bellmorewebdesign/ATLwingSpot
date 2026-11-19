"""
Tests for the dashboard API.

Run from aws/franchise-dashboard/dashboard:  python -m pytest -q
Needs boto3, pytest and moto[dynamodb]. No AWS access: DynamoDB is moto's
in-memory implementation, with the same keys and indexes as the real tables.
"""

import json
import os
import sys

import boto3
import pytest
from moto import mock_aws

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src", "api"))

os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")

import api  # noqa: E402

ADMIN = "ATLWingSpotAdmin"


@pytest.fixture
def ddb(monkeypatch):
    with mock_aws():
        client = boto3.client("dynamodb", region_name="us-east-1")
        client.create_table(
            TableName=api.TABLE_NAME,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": n, "AttributeType": "S"}
                for n in ("submissionId", "createdAt", "status", "entity")
            ],
            KeySchema=[{"AttributeName": "submissionId", "KeyType": "HASH"}],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "by-created",
                    "KeySchema": [
                        {"AttributeName": "entity", "KeyType": "HASH"},
                        {"AttributeName": "createdAt", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "by-status",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "createdAt", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
        )
        client.create_table(
            TableName=api.AUDIT_TABLE,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": "submissionId", "AttributeType": "S"},
                {"AttributeName": "at", "AttributeType": "S"},
            ],
            KeySchema=[
                {"AttributeName": "submissionId", "KeyType": "HASH"},
                {"AttributeName": "at", "KeyType": "RANGE"},
            ],
        )
        client.create_table(
            TableName=api.SESSIONS_TABLE,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[{"AttributeName": "sid", "AttributeType": "S"}],
            KeySchema=[{"AttributeName": "sid", "KeyType": "HASH"}],
        )
        monkeypatch.setattr(api, "_ddb", client)
        yield client


CHROME_WIN = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/131.0.0.0 Safari/537.36")
VIEWER = {"user-agent": CHROME_WIN, "cloudfront-viewer-address": "203.0.113.7:51234",
          "cloudfront-viewer-country": "US", "cloudfront-viewer-country-region": "NY",
          "cloudfront-viewer-city": "Bellmore"}


def call(method, path, body=None, qs=None, sid=None, user=ADMIN, raw=None, session="sess-1",
         headers=None, route=None, auth_time="now"):
    route_path = route or ("/api/submissions/{id}" if sid is not None else "/api/submissions")
    if auth_time == "now":
        auth_time = str(int(api._now().timestamp()) - 60)    # signed in a minute ago
    claims = {"username": user, "origin_jti": session, "auth_time": auth_time}
    if session is None:
        del claims["origin_jti"]
    if auth_time is None:
        del claims["auth_time"]
    event = {
        "routeKey": f"{method} {route_path}",
        "requestContext": {"authorizer": {"jwt": {"claims": claims}}} if user else {},
        "headers": dict(VIEWER, **(headers or {})),
        "queryStringParameters": qs,
        "pathParameters": {"id": sid} if sid is not None else None,
        "body": raw if raw is not None else (json.dumps(body) if body is not None else None),
    }
    resp = api.handler(event, None)
    return resp["statusCode"], json.loads(resp["body"]), resp


def form_row(ddb, sid, created, status="new", **extra):
    """A row exactly as the archive worker writes it."""
    item = {
        "submissionId": {"S": sid},
        "createdAt": {"S": created},
        "entity": {"S": "SUB"},
        "status": {"S": status},
        "schemaVersion": {"N": "1"},
        "firstName": {"S": "Dana"},
        "lastName": {"S": "Okafor"},
        "email": {"S": "dana@example.com"},
        "phone": {"S": "516-555-0142"},
        "territory": {"S": "Georgia"},
    }
    item.update({k: {"S": v} for k, v in extra.items()})
    ddb.put_item(TableName=api.TABLE_NAME, Item=item)


NEW = {"firstName": "Ada", "lastName": "Lovelace", "email": "ada@example.com",
       "phone": "404-555-0100", "territory": "Georgia", "message": "Two units."}


# ------------------------------------------------------------------ auth

def test_no_identity_is_refused(ddb):
    status, body, _ = call("GET", "/", user=None)
    assert status == 401


def test_unknown_route_is_404(ddb):
    resp = api.handler({"routeKey": "DELETE /api/submissions/{id}",
                        "requestContext": {"authorizer": {"jwt": {"claims": {"username": ADMIN}}}}}, None)
    assert resp["statusCode"] == 404


def test_responses_are_never_cached(ddb):
    _, _, resp = call("GET", "/")
    assert resp["headers"]["cache-control"] == "no-store"


# ------------------------------------------------------------------ list

def test_list_is_newest_first_and_reads_worker_rows(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    form_row(ddb, "b", "2026-11-03T10:00:00Z")
    form_row(ddb, "c", "2026-11-02T10:00:00Z")
    status, body, _ = call("GET", "/")
    assert status == 200
    assert [i["submissionId"] for i in body["items"]] == ["b", "c", "a"]
    assert body["items"][0]["schemaVersion"] == 1
    assert body["nextCursor"] is None


def test_list_filters_by_status(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z", status="new")
    form_row(ddb, "b", "2026-11-02T10:00:00Z", status="contacted")
    _, body, _ = call("GET", "/", qs={"status": "contacted"})
    assert [i["submissionId"] for i in body["items"]] == ["b"]


def test_list_rejects_unknown_status(ddb):
    assert call("GET", "/", qs={"status": "bogus"})[0] == 400


def test_archived_rows_are_hidden_unless_asked_for(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    form_row(ddb, "b", "2026-11-02T10:00:00Z", archivedAt="2026-11-05T00:00:00Z")
    _, body, _ = call("GET", "/")
    assert [i["submissionId"] for i in body["items"]] == ["a"]
    _, body, _ = call("GET", "/", qs={"archived": "1"})
    assert [i["submissionId"] for i in body["items"]] == ["b"]


def test_pagination_walks_every_row_once(ddb, monkeypatch):
    monkeypatch.setattr(api, "PAGE_LIMIT", 2)
    for n in range(5):
        form_row(ddb, f"s{n}", f"2026-11-0{n + 1}T10:00:00Z")
    seen, cursor = [], None
    for _ in range(10):
        _, body, _ = call("GET", "/", qs={"cursor": cursor} if cursor else None)
        seen += [i["submissionId"] for i in body["items"]]
        cursor = body["nextCursor"]
        if not cursor:
            break
    assert seen == ["s4", "s3", "s2", "s1", "s0"]


@pytest.mark.parametrize("cursor", ["not-base64!!", "eyJ4IjogMX0", "W10"])
def test_bad_cursor_is_refused(ddb, cursor):
    assert call("GET", "/", qs={"cursor": cursor})[0] == 400


# ------------------------------------------------------------------- get

def test_get_returns_submission_and_history(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    call("PATCH", "", {"status": "contacted"}, sid="a")
    status, body, _ = call("GET", "", sid="a")
    assert status == 200
    assert body["submission"]["status"] == "contacted"
    assert body["history"][0]["actor"] == ADMIN
    assert body["history"][0]["changes"]["status"] == {"from": "new", "to": "contacted"}


@pytest.mark.parametrize("sid", ["missing", "../etc", "x" * 101])
def test_get_unknown_or_malformed_id_is_404(ddb, sid):
    assert call("GET", "", sid=sid)[0] == 404


# ----------------------------------------------------------------- update

def test_update_status_records_who_and_what(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    status, body, _ = call("PATCH", "", {"status": "qualified"}, sid="a")
    assert status == 200
    assert body["submission"]["status"] == "qualified"
    assert body["submission"]["updatedBy"] == ADMIN
    _, got, _ = call("GET", "", sid="a")
    assert got["submission"]["status"] == "qualified"
    _, listed, _ = call("GET", "/", qs={"status": "qualified"})
    assert [i["submissionId"] for i in listed["items"]] == ["a"]


def test_update_refuses_unknown_status(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    assert call("PATCH", "", {"status": "won"}, sid="a")[0] == 400


@pytest.mark.parametrize("field", ["email", "firstName", "message", "createdAt", "submissionId", "entity"])
def test_update_cannot_change_what_the_applicant_sent(ddb, field):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    status, _, _ = call("PATCH", "", {field: "changed"}, sid="a")
    assert status == 400
    _, got, _ = call("GET", "", sid="a")
    assert got["submission"].get(field) != "changed"


def test_update_never_creates_a_row(ddb):
    status, _, _ = call("PATCH", "", {"status": "contacted"}, sid="ghost")
    assert status == 404
    assert "Item" not in ddb.get_item(TableName=api.TABLE_NAME, Key={"submissionId": {"S": "ghost"}})


def test_notes_can_be_set_and_cleared(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    call("PATCH", "", {"notes": "Called, left voicemail.  "}, sid="a")
    _, got, _ = call("GET", "", sid="a")
    assert got["submission"]["notes"] == "Called, left voicemail."
    call("PATCH", "", {"notes": ""}, sid="a")
    _, got, _ = call("GET", "", sid="a")
    assert "notes" not in got["submission"]


def test_overlong_notes_are_refused(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    assert call("PATCH", "", {"notes": "x" * (api.MAX_NOTES + 1)}, sid="a")[0] == 400


def test_long_notes_are_trimmed_in_the_audit_not_the_row(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    call("PATCH", "", {"notes": "y" * 2000}, sid="a")
    _, got, _ = call("GET", "", sid="a")
    assert len(got["submission"]["notes"]) == 2000
    assert len(got["history"][0]["changes"]["notes"]["to"]) <= api.AUDIT_VALUE_CHARS + 1


@pytest.mark.parametrize("value,ok", [
    ("2026-11-10", True),
    ("2026-02-30", False),
    ("11/10/2026", False),
    ("2099-01-01", False),
    ("", True),
])
def test_last_contacted_dates(ddb, value, ok):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    assert (call("PATCH", "", {"lastContactedAt": value}, sid="a")[0] == 200) is ok


def test_archive_keeps_the_first_time_and_unarchive_restores(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    _, first, _ = call("PATCH", "", {"archived": True}, sid="a")
    stamp = first["submission"]["archivedAt"]
    _, again, _ = call("PATCH", "", {"archived": True}, sid="a")
    assert again["submission"]["archivedAt"] == stamp
    _, got, _ = call("GET", "", sid="a")
    assert got["submission"]["archivedAt"] == stamp
    assert [h["changes"] for h in got["history"]].count({"archived": {"from": False, "to": True}}) == 1
    call("PATCH", "", {"archived": False}, sid="a")
    _, listed, _ = call("GET", "/")
    assert [i["submissionId"] for i in listed["items"]] == ["a"]


def test_archived_must_be_a_boolean(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    assert call("PATCH", "", {"archived": "yes"}, sid="a")[0] == 400


def test_a_no_op_update_writes_no_history(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    call("PATCH", "", {"status": "new"}, sid="a")
    _, got, _ = call("GET", "", sid="a")
    assert got["history"] == []


def test_empty_update_is_refused(ddb):
    form_row(ddb, "a", "2026-11-01T10:00:00Z")
    assert call("PATCH", "", {}, sid="a")[0] == 400


# ----------------------------------------------------------------- create

def test_manual_add(ddb):
    status, body, _ = call("POST", "/", NEW)
    assert status == 201
    sub = body["submission"]
    assert sub["status"] == "new" and sub["source"] == "manual" and sub["createdBy"] == ADMIN
    _, listed, _ = call("GET", "/")
    assert listed["items"][0]["email"] == "ada@example.com"


def test_only_name_and_email_are_required(ddb):
    status, _, _ = call("POST", "/", {"firstName": "A", "lastName": "B", "email": "a@b.co"})
    assert status == 201


@pytest.mark.parametrize("missing", ["firstName", "lastName", "email"])
def test_add_requires_name_and_email(ddb, missing):
    row = dict(NEW)
    del row[missing]
    status, body, _ = call("POST", "/", row)
    assert status == 400 and missing in body["fields"]


def test_add_rejects_bad_email_and_unknown_fields(ddb):
    assert call("POST", "/", dict(NEW, email="nope"))[0] == 400
    assert call("POST", "/", dict(NEW, submissionId="mine"))[0] == 400
    assert call("POST", "/", dict(NEW, phone=5551234))[0] == 400


def test_import_is_idempotent(ddb):
    row = dict(NEW, createdAt="2026-03-14")
    status, first, _ = call("POST", "/", row)
    assert status == 201
    assert first["submission"]["createdAt"] == "2026-03-14T12:00:00Z"
    assert first["submission"]["source"] == "import"
    status, dup, _ = call("POST", "/", dict(row, email="ADA@example.com"))
    assert status == 409 and dup["fields"]["submissionId"] == first["submission"]["submissionId"]
    _, listed, _ = call("GET", "/")
    assert len(listed["items"]) == 1


@pytest.mark.parametrize("value,expected", [
    ("2026-03-14T09:30:00Z", "2026-03-14T09:30:00Z"),
    ("2026-03-14T09:30:00-05:00", "2026-03-14T14:30:00Z"),
    ("2026-03-14T09:30", "2026-03-14T09:30:00Z"),
])
def test_import_dates_are_normalised_to_utc(ddb, value, expected):
    _, body, _ = call("POST", "/", dict(NEW, createdAt=value))
    assert body["submission"]["createdAt"] == expected


@pytest.mark.parametrize("value", ["2099-01-01", "1999-12-31", "yesterday", "2026-13-01"])
def test_import_rejects_bad_dates(ddb, value):
    assert call("POST", "/", dict(NEW, createdAt=value))[0] == 400


def test_import_can_carry_status_and_notes(ddb):
    _, body, _ = call("POST", "/", dict(NEW, createdAt="2026-01-05", status="signed", notes="Opened Q2."))
    assert body["submission"]["status"] == "signed"
    assert body["submission"]["notes"] == "Opened Q2."


# --------------------------------------------------------------- plumbing

def test_bad_json_and_oversized_bodies(ddb):
    assert call("POST", "/", raw="{nope")[0] == 400
    assert call("POST", "/", raw="[1,2]")[0] == 400
    assert call("POST", "/", raw=json.dumps({"notes": "x" * (api.MAX_BODY_BYTES + 1)}))[0] == 413


def test_storage_failure_is_a_clean_500(ddb, monkeypatch):
    class Broken:
        def query(self, **kw):
            raise RuntimeError("boom")
    monkeypatch.setattr(api, "_ddb", Broken())
    status, body, _ = call("GET", "/")
    assert status == 500 and "boom" not in json.dumps(body)


def test_logs_carry_no_applicant_details(ddb, caplog):
    caplog.set_level("INFO")
    call("POST", "/", NEW)
    _, listed, _ = call("GET", "/")
    sid = listed["items"][0]["submissionId"]
    call("PATCH", "", {"notes": "Secret note"}, sid=sid)
    call("POST", "/", dict(NEW, email="bad"))
    text = caplog.text
    for secret in ("Ada", "Lovelace", "ada@example.com", "404-555-0100", "Two units", "Secret note"):
        assert secret not in text


# ------------------------------------------------------- origin lock

def test_requests_without_the_cloudfront_secret_are_refused(ddb, monkeypatch):
    monkeypatch.setattr(api, "ORIGIN_SECRET", "s3cret-from-cloudfront")
    assert call("GET", "/")[0] == 403
    assert call("GET", "/", headers={"x-origin-verify": "guess"})[0] == 403
    assert call("GET", "/", headers={"X-Origin-Verify": "s3cret-from-cloudfront"})[0] == 200


def test_origin_is_checked_before_anything_else(ddb, monkeypatch):
    monkeypatch.setattr(api, "ORIGIN_SECRET", "s3cret")
    status, body, _ = call("GET", "/", user=None)
    assert status == 403 and body["error"] == "forbidden"


# ---------------------------------------------------------- sessions

def sessions(**kw):
    status, body, _ = call("GET", "", route="/api/sessions", **kw)
    assert status == 200
    return body["sessions"]


def test_a_sign_in_is_recorded_with_ip_place_browser_and_os(ddb):
    signed_in = int(api._now().timestamp()) - 300
    call("GET", "/", auth_time=str(signed_in))
    [s] = sessions()
    assert s["id"] == "sess-1" and s["current"] is True and s["status"] == "active"
    assert s["username"] == ADMIN
    assert (s["firstIp"], s["lastIp"]) == ("203.0.113.7", "203.0.113.7")
    assert (s["browser"], s["os"], s["device"]) == ("Chrome", "Windows", "Computer")
    assert (s["city"], s["region"], s["country"]) == ("Bellmore", "NY", "US")
    assert s["signedInAt"] == api._iso(api.datetime.fromtimestamp(signed_in, tz=api.timezone.utc))


def test_last_seen_follows_the_device_but_first_ip_is_kept(ddb):
    call("GET", "/")
    call("GET", "/", headers={"cloudfront-viewer-address": "[2001:db8::7]:443"})
    [s] = sessions(headers={"cloudfront-viewer-address": "2001:db8::9:5555"})
    assert s["firstIp"] == "203.0.113.7"
    assert s["lastIp"] == "2001:db8::9"


def test_two_devices_are_two_sessions(ddb):
    call("GET", "/", session="phone-1", headers={"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1"})
    call("GET", "/", session="laptop-1")
    rows = {s["id"]: s for s in sessions(session="laptop-1")}
    assert set(rows) == {"phone-1", "laptop-1"}
    assert (rows["phone-1"]["browser"], rows["phone-1"]["os"], rows["phone-1"]["device"]) == ("Safari", "iOS", "Phone")
    assert rows["laptop-1"]["current"] and not rows["phone-1"]["current"]


def test_signing_a_device_out_locks_it_out_immediately(ddb):
    call("GET", "/", session="phone-1")
    status, body, _ = call("DELETE", "", route="/api/sessions/{id}", sid="phone-1", session="laptop-1")
    assert status == 200 and body == {"revoked": "phone-1", "current": False}
    status, body, _ = call("GET", "/", session="phone-1")
    assert status == 401 and body["error"] == "session_revoked"
    assert call("GET", "/", session="laptop-1")[0] == 200
    phone = [s for s in sessions(session="laptop-1") if s["id"] == "phone-1"][0]
    assert phone["status"] == "signed_out" and phone["revokedBy"] == ADMIN


def test_sign_out_everywhere_else_keeps_this_device(ddb):
    for sid in ("a", "b", "c"):
        call("GET", "/", session=sid)
    status, body, _ = call("POST", "", route="/api/sessions/revoke-others", session="b")
    assert status == 200 and body == {"revoked": 2}
    assert call("GET", "/", session="a")[0] == 401
    assert call("GET", "/", session="c")[0] == 401
    assert call("GET", "/", session="b")[0] == 200
    status, body, _ = call("POST", "", route="/api/sessions/revoke-others", session="b")
    assert body == {"revoked": 0}


def test_signing_out_an_unknown_device_is_404_and_bad_ids_are_refused(ddb):
    call("GET", "/")
    assert call("DELETE", "", route="/api/sessions/{id}", sid="nope")[0] == 404
    assert call("DELETE", "", route="/api/sessions/{id}", sid="../../x")[0] == 404


def test_revoking_twice_keeps_the_first_time(ddb):
    call("GET", "/", session="old")
    call("DELETE", "", route="/api/sessions/{id}", sid="old", session="me")
    first = [s for s in sessions(session="me") if s["id"] == "old"][0]["revokedAt"]
    call("DELETE", "", route="/api/sessions/{id}", sid="old", session="me")
    assert [s for s in sessions(session="me") if s["id"] == "old"][0]["revokedAt"] == first


def test_old_sign_ins_show_as_expired(ddb, monkeypatch):
    call("GET", "/", session="old", auth_time="1700000000")
    rows = {s["id"]: s for s in sessions(session="new", auth_time=str(int(api._now().timestamp())))}
    assert rows["old"]["status"] == "expired"
    assert rows["new"]["status"] == "active"


def test_session_rows_expire_from_the_log_after_30_days(ddb):
    call("GET", "/")
    item = ddb.get_item(TableName=api.SESSIONS_TABLE, Key={"sid": {"S": "sess-1"}})["Item"]
    days = (int(item["expiresAt"]["N"]) - api._now().timestamp()) / 86400
    assert 29.9 < days <= 30


def test_without_a_session_id_the_request_is_refused(ddb):
    assert call("GET", "/", session=None, auth_time=None)[0] == 401


def test_auth_time_is_the_fallback_session_id(ddb):
    assert call("GET", "/", session=None, auth_time="1795000000")[0] == 200
    assert sessions(session=None, auth_time="1795000000")[0]["id"] == f"{ADMIN}@1795000000"


@pytest.mark.parametrize("ua,expected", [
    ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0", ("Edge", "Windows", "Computer")),
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15", ("Safari", "macOS", "Computer")),
    ("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36", ("Chrome", "Android", "Phone")),
    ("Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36", ("Samsung Internet", "Android", "Phone")),
    ("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1", ("Chrome", "iPadOS", "Tablet")),
    ("Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0", ("Firefox", "Linux", "Computer")),
    ("Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", ("Chrome", "ChromeOS", "Computer")),
    ("", ("Unknown", "Unknown", "Unknown")),
])
def test_user_agents_are_described_plainly(ua, expected):
    assert api.describe_user_agent(ua) == expected
