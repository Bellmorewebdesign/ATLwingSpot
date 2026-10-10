"""
Test doubles for DynamoDB and SES.

The DynamoDB fake is not a general emulator. It understands exactly the two
item shapes acquire_quota builds, and it evaluates their conditions for real
under a lock, so a concurrency test against it is a genuine test of the
transaction logic rather than a decoration: if the handler ever stopped making
the writes conditional, or started reading a counter before incrementing it,
these tests would fail.
"""

import threading

from botocore.exceptions import ClientError


class FakeDynamoDB:
    def __init__(self, fail_with=None):
        self.items = {}
        self.calls = 0
        self.fail_with = fail_with          # an exception to raise instead
        self._lock = threading.Lock()

    # -- helpers ---------------------------------------------------------
    @staticmethod
    def _num(item, attr):
        cell = item.get(attr)
        return None if cell is None else int(cell["N"])

    def _check_put(self, spec):
        key = spec["Item"]["pk"]["S"]
        existing = self.items.get(key)
        if existing is None:
            return True, None
        cutoff = int(spec["ExpressionAttributeValues"][":cutoff"]["N"])
        last = self._num(existing, "last_ts")
        ok = last is not None and last <= cutoff
        return ok, existing

    def _check_update(self, spec):
        key = spec["Key"]["pk"]["S"]
        existing = self.items.get(key)
        limit = int(spec["ExpressionAttributeValues"][":limit"]["N"])
        current = self._num(existing or {}, "n")
        ok = current is None or current < limit
        return ok, existing

    # -- the one API the handler uses ------------------------------------
    def transact_write_items(self, TransactItems):
        if self.fail_with is not None:
            raise self.fail_with
        with self._lock:
            self.calls += 1
            reasons = []
            all_ok = True
            for entry in TransactItems:
                if "Put" in entry:
                    ok, existing = self._check_put(entry["Put"])
                    wants_old = entry["Put"].get("ReturnValuesOnConditionCheckFailure") == "ALL_OLD"
                else:
                    ok, existing = self._check_update(entry["Update"])
                    wants_old = False
                if ok:
                    reasons.append({"Code": "None"})
                else:
                    all_ok = False
                    reason = {"Code": "ConditionalCheckFailed"}
                    if wants_old and existing is not None:
                        reason["Item"] = existing
                    reasons.append(reason)

            if not all_ok:
                raise ClientError(
                    {
                        "Error": {"Code": "TransactionCanceledException",
                                  "Message": "Transaction cancelled"},
                        "CancellationReasons": reasons,
                    },
                    "TransactWriteItems",
                )

            # Commit every item, same as DynamoDB would.
            for entry in TransactItems:
                if "Put" in entry:
                    spec = entry["Put"]
                    self.items[spec["Item"]["pk"]["S"]] = dict(spec["Item"])
                else:
                    spec = entry["Update"]
                    key = spec["Key"]["pk"]["S"]
                    current = self._num(self.items.get(key) or {}, "n") or 0
                    self.items[key] = {
                        "pk": {"S": key},
                        "n": {"N": str(current + 1)},
                        "expires_at": spec["ExpressionAttributeValues"][":exp"],
                    }
            return {}


class FakeSES:
    def __init__(self, fail_with=None):
        self.sent = []
        self.fail_with = fail_with

    def send_email(self, **kwargs):
        if self.fail_with is not None:
            raise self.fail_with
        self.sent.append(kwargs)
        return {"MessageId": "fake-message-id"}
