"""
Archive worker for franchising submissions.

The form Lambda (aws/franchise-form) puts each validated submission on an SQS
queue after the SES email has gone out. This function drains the queue and
writes each one to DynamoDB.

Properties that matter:

* Idempotent. The write is conditional on the submission id not existing, so
  SQS delivering a message twice (it can) never creates a duplicate row and
  never overwrites a row someone has since edited in the dashboard.
* Per-message failure. A bad message is reported back individually, so one bad
  apple does not make SQS redeliver the other nine. After five tries it lands
  in the dead-letter queue, which has an alarm.
* No PII in logs. Only the message id, the submission id and an error class.
"""

import json
import logging
import os

import boto3
from botocore.exceptions import ClientError

LOG = logging.getLogger()
LOG.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "atl-franchise-submissions")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# Same field names as the form handler's FIELDS. "message" is optional there.
REQUIRED = ("firstName", "lastName", "email", "phone", "territory")
OPTIONAL = ("message",)

_ddb = None


def _dynamodb():
    global _ddb
    if _ddb is None:
        _ddb = boto3.client("dynamodb", region_name=AWS_REGION)
    return _ddb


class BadMessage(Exception):
    """The message is not a submission we can store. Retrying will not fix it."""


def _item(msg):
    if not isinstance(msg, dict):
        raise BadMessage("not an object")
    sid, created = msg.get("submissionId"), msg.get("createdAt")
    if not isinstance(sid, str) or not sid or not isinstance(created, str) or not created:
        raise BadMessage("missing submissionId/createdAt")

    item = {
        "submissionId": {"S": sid},
        "createdAt": {"S": created},
        # Constant used by the by-created index to list everything newest-first.
        "entity": {"S": "SUB"},
        # Pipeline state. The dashboard moves it; this worker only sets it once.
        "status": {"S": "new"},
        "schemaVersion": {"N": "1"},
    }
    for name in REQUIRED:
        value = msg.get(name)
        if not isinstance(value, str) or not value:
            raise BadMessage(f"missing {name}")
        item[name] = {"S": value}
    for name in OPTIONAL:
        value = msg.get(name)
        if isinstance(value, str) and value:
            item[name] = {"S": value}
    return item


def _store(msg):
    try:
        _dynamodb().put_item(
            TableName=TABLE_NAME,
            Item=_item(msg),
            ConditionExpression="attribute_not_exists(submissionId)",
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return "duplicate"
        raise
    return "stored"


def handler(event, context):
    failures = []
    for record in (event or {}).get("Records", []):
        message_id = record.get("messageId")
        try:
            msg = json.loads(record["body"])
            result = _store(msg)
            LOG.info(json.dumps({
                "event": "archived" if result == "stored" else "duplicate_ignored",
                "messageId": message_id,
                "submissionId": msg.get("submissionId"),
            }))
        except Exception as exc:  # noqa: BLE001 - reported per message, never raised
            LOG.error(json.dumps({
                "event": "archive_failed",
                "messageId": message_id,
                "error": type(exc).__name__,
            }))
            failures.append({"itemIdentifier": message_id})
    return {"batchItemFailures": failures}
