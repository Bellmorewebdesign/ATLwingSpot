"""
Tests for the archive worker.

Run from aws/franchise-dashboard:  python -m pytest -q
Needs boto3 (for botocore's ClientError) and pytest. No AWS access, no network.
"""

import json
import os
import sys

import pytest
from botocore.exceptions import ClientError

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "src", "worker"))

import worker  # noqa: E402


class FakeDynamoDB:
    def __init__(self):
        self.items = {}
        self.fail_with = None

    def put_item(self, TableName, Item, ConditionExpression):
        assert ConditionExpression == "attribute_not_exists(submissionId)"
        if self.fail_with:
            raise ClientError({"Error": {"Code": self.fail_with}}, "PutItem")
        key = Item["submissionId"]["S"]
        if key in self.items:
            raise ClientError({"Error": {"Code": "ConditionalCheckFailedException"}}, "PutItem")
        self.items[key] = Item


@pytest.fixture
def ddb(monkeypatch):
    fake = FakeDynamoDB()
    monkeypatch.setattr(worker, "_ddb", fake)
    return fake


def msg(**over):
    base = {
        "submissionId": "11111111-1111-4111-8111-111111111111",
        "createdAt": "2026-11-18T15:04:05Z",
        "firstName": "Ada",
        "lastName": "Lovelace",
        "email": "ada@example.com",
        "phone": "404-555-0100",
        "territory": "Georgia",
        "message": "Interested in two units.",
    }
    base.update(over)
    return base


def event(*bodies):
    return {"Records": [{"messageId": f"m{i}", "body": json.dumps(b)} for i, b in enumerate(bodies)]}


def test_stores_submission_as_new(ddb):
    out = worker.handler(event(msg()), None)
    assert out == {"batchItemFailures": []}
    item = ddb.items["11111111-1111-4111-8111-111111111111"]
    assert item["status"] == {"S": "new"}
    assert item["entity"] == {"S": "SUB"}
    assert item["email"] == {"S": "ada@example.com"}
    assert item["message"] == {"S": "Interested in two units."}


def test_message_is_optional(ddb):
    out = worker.handler(event(msg(message="")), None)
    assert out == {"batchItemFailures": []}
    assert "message" not in ddb.items["11111111-1111-4111-8111-111111111111"]


def test_redelivery_is_a_no_op_and_does_not_overwrite(ddb):
    worker.handler(event(msg()), None)
    ddb.items["11111111-1111-4111-8111-111111111111"]["status"] = {"S": "contacted"}
    out = worker.handler(event(msg()), None)
    assert out == {"batchItemFailures": []}
    assert ddb.items["11111111-1111-4111-8111-111111111111"]["status"] == {"S": "contacted"}


@pytest.mark.parametrize("field", ["submissionId", "createdAt", "firstName", "lastName", "email", "phone", "territory"])
def test_missing_required_field_fails_that_message(ddb, field):
    bad = msg()
    del bad[field]
    out = worker.handler(event(bad), None)
    assert out == {"batchItemFailures": [{"itemIdentifier": "m0"}]}
    assert ddb.items == {}


def test_wrong_type_fails_that_message(ddb):
    out = worker.handler(event(msg(phone=4045550100)), None)
    assert out == {"batchItemFailures": [{"itemIdentifier": "m0"}]}


def test_one_bad_message_does_not_fail_the_batch(ddb):
    good = msg()
    bad = msg(submissionId="22222222-2222-4222-8222-222222222222")
    del bad["email"]
    also_good = msg(submissionId="33333333-3333-4333-8333-333333333333")
    out = worker.handler(event(good, bad, also_good), None)
    assert out == {"batchItemFailures": [{"itemIdentifier": "m1"}]}
    assert len(ddb.items) == 2


def test_non_json_body_fails_that_message(ddb):
    out = worker.handler({"Records": [{"messageId": "x", "body": "not json"}]}, None)
    assert out == {"batchItemFailures": [{"itemIdentifier": "x"}]}


def test_dynamodb_outage_is_reported_so_sqs_retries(ddb):
    ddb.fail_with = "ProvisionedThroughputExceededException"
    out = worker.handler(event(msg()), None)
    assert out == {"batchItemFailures": [{"itemIdentifier": "m0"}]}


def test_logs_carry_no_personal_data(ddb, caplog):
    caplog.set_level("INFO")
    worker.handler(event(msg()), None)
    bad = msg(submissionId="44444444-4444-4444-8444-444444444444")
    del bad["phone"]
    worker.handler(event(bad), None)
    text = caplog.text
    for secret in ("ada@example.com", "Ada", "Lovelace", "404-555-0100", "Interested"):
        assert secret not in text


def test_empty_event(ddb):
    assert worker.handler({}, None) == {"batchItemFailures": []}
    assert worker.handler(None, None) == {"batchItemFailures": []}
