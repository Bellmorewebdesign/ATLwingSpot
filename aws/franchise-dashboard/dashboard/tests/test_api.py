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
        monkeypatch.setattr(api, "_ddb", client)
        yield client


def call(method, path, body=None, qs=None, sid=None, user=ADMIN, raw=None):
    route_path = "/api/submissions/{id}" if sid is not None else "/api/submissions"
    event = {
        "routeKey": f"{method} {route_path}",
        "requestContext": {"authorizer": {"jwt": {"claims": {"username": user}}}} if user else {},
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
