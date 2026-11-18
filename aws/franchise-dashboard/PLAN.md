# Franchise submissions: archive and dashboard

A durable, login-protected copy of every franchising submission, kept alongside
the existing email. Email keeps working exactly as it does today (it is where
replies happen). The database is a second copy that cannot be deleted by
accident and that the whole team can search.

Status: **phase 1 is written and tested, not deployed.** Phases 2 and 3 are a
plan only.

## Ground rules

1. **The email path does not change.** The SES send stays first and stays the
   thing that decides the form's response. The archive is added after it and
   can never turn a successful send into an error.
2. **Neither copy is "the" source.** Both are written from the same validated
   payload, so they hold the same fields. Staff-added data (status, notes,
   owner) lives only in the database; nothing there is ever written back to
   email.
3. **Leads are never auto-deleted.** The submissions table has no TTL (unlike
   the rate-limit table), is retained if the stack is removed, and has deletion
   protection, point-in-time recovery and daily backups.
4. **No personal data in logs**, same as the form Lambda today.

## Architecture

```
browser ─▶ API Gateway ─▶ atl-franchise-form  (existing Lambda)
                              │ 1. validate, Turnstile, rate limit   (unchanged)
                              │ 2. SES email                         (unchanged)
                              │ 3. NEW: enqueue a copy               (failure is logged, never surfaced)
                              ▼
                        SQS  atl-franchise-submissions ──(5 failed tries)──▶ DLQ ──▶ alarm
                              ▼
                        Lambda atl-franchise-archive  (idempotent conditional write)
                              ▼
                        DynamoDB  atl-franchise-submissions
                              ▲
   Phase 2:  Cognito login ─▶ API Gateway (JWT authorizer) ─▶ dashboard Lambdas
             S3 + CloudFront  admin.atlwingspot.com  (static dashboard)
```

Why a queue rather than the form Lambda writing straight to DynamoDB:

- The form Lambda needs only `sqs:SendMessage` on one queue. It gets no read or
  delete access to the leads, so a bug or compromise there cannot expose them.
- Retries and a dead-letter queue come for free. A DynamoDB hiccup is retried
  instead of silently losing a row.
- The email Lambda's change stays a few lines.

## Data model: `atl-franchise-submissions`

| Attribute | Type | Notes |
| --- | --- | --- |
| `submissionId` | S, **key** | UUID generated in the form Lambda |
| `createdAt` | S | UTC ISO-8601, e.g. `2026-11-18T15:04:05Z` |
| `firstName`, `lastName`, `email`, `phone`, `territory` | S | exactly the form's fields |
| `message` | S | optional |
| `status` | S | `new` → `contacted` → `qualified` → `discovery` → `fdd_sent` → `signed` / `declined` |
| `entity` | S | constant `SUB`, for the "newest first" index |
| `schemaVersion` | N | currently `1` |

Added by the dashboard in phase 2 (database only): `owner`, `notes`,
`lastContactedAt`, `statusHistory`, `archivedAt` (soft delete).

Indexes: `by-created` (entity, createdAt) for the main list; `by-status`
(status, createdAt) for the pipeline filter.

No IP address is stored. The form Lambda already keeps only a keyed hash for
rate limiting, and the dashboard has no need for it.

## Phases

### Phase 1: capture (written here)

Starts saving every submission immediately, with no UI yet, so nothing is lost
while the dashboard is built.

- [x] `template.yaml`: table, queue, DLQ, worker, alarms, backups
- [x] `src/worker/worker.py` with 16 tests
- [ ] Deploy the stack (see "What you do on AWS")
- [ ] Apply the form Lambda change below, then set `SUBMISSIONS_QUEUE_URL`
- [ ] Send a test submission; confirm the email arrives **and** a row appears

### Phase 2: the dashboard (not started)

- Cognito user pool: invite-only (self sign-up off), **MFA required**, groups
  `admin` / `staff` / `readonly`.
- HTTP API with a JWT authorizer and a small Lambda for: list (paged, filter by
  status, search), get one, update status/notes/owner, archive. Role checks
  inside the Lambda from the token's `cognito:groups`.
- `atl-franchise-audit` table: who viewed or changed what, and when.
- Static dashboard on S3 behind CloudFront at `admin.atlwingspot.com`
  (ACM certificate in `us-east-1`; CloudFront is the only reader of the bucket).
- Strict CORS: only the dashboard origin. Security headers (CSP, HSTS) set by
  CloudFront.

### Phase 3: hardening (not started)

- Reconcile job (EventBridge, daily): compares recent SES sends to table rows
  and alerts on any email with no matching row.
- Admin-only CSV export; nightly export to S3 as a copy independent of both
  DynamoDB and AWS Backup.
- One-time import of past submissions from Gmail, if wanted.

## The form Lambda change (phase 1, not yet applied)

This is the only edit to existing code. It is deliberately outside the email
path and cannot affect the response.

In `aws/franchise-form/lambda_function.py`, near the other clients and env vars:

```python
import uuid
from datetime import datetime, timezone
from botocore.config import Config

SUBMISSIONS_QUEUE_URL = os.environ.get("SUBMISSIONS_QUEUE_URL", "").strip()

_sqs = None

def _sqsclient():
    global _sqs
    if _sqs is None:
        # Short timeouts and one attempt: a stuck queue must never hold up the
        # response to someone whose email already went out.
        _sqs = boto3.client(
            "sqs",
            region_name=AWS_REGION,
            config=Config(connect_timeout=2, read_timeout=3, retries={"max_attempts": 1}),
        )
    return _sqs


def _archive(cleaned):
    """Queue a copy for the dashboard. Never raises; never affects the email."""
    if not SUBMISSIONS_QUEUE_URL:
        return
    try:
        body = dict(cleaned)
        body["submissionId"] = str(uuid.uuid4())
        body["createdAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        _sqsclient().send_message(QueueUrl=SUBMISSIONS_QUEUE_URL, MessageBody=json.dumps(body))
    except Exception as exc:  # noqa: BLE001 - the email has already been sent
        LOG.error(json.dumps({"event": "archive_enqueue_failed", "error": type(exc).__name__}))
```

and in `lambda_handler`, immediately after the `_send_email(cleaned)` try/except
and before the final `LOG.info(... "sent" ...)`:

```python
    _archive(cleaned)
```

If `SUBMISSIONS_QUEUE_URL` is unset the function does nothing, so deploying the
code before the infrastructure is harmless. Tests for it go in
`aws/franchise-form/tests/` (queue accepts; queue raises and the response is
still 200; queue unset).

## What you do on AWS

**Phase 1** (about 20 minutes, all from a terminal with admin credentials):

1. **Pick the account.** The form Lambda lives in the account used for
   `bellmorewebdesign.com`. If ATL Wing Spot should own the leads, create or
   use an account they own and deploy there instead; this is far easier to do
   now than to migrate later. (The form Lambda and the new stack must share an
   account and region, `us-east-1`, because the role policy and queue are
   linked.)
2. **Install the tools:** AWS CLI v2 (you already have it if you ran
   `setup.sh`) and the [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).
3. **Find the form Lambda's role name:**
   ```bash
   aws lambda get-function-configuration --function-name atl-franchise-form \
     --region us-east-1 --query Role --output text
   ```
   Use the part after `role/`.
4. **Deploy:**
   ```bash
   cd aws/franchise-dashboard
   sam build
   sam deploy --guided --stack-name atl-franchise-archive --region us-east-1 \
     --capabilities CAPABILITY_IAM
   ```
   It asks for `FormFunctionRoleName` and `AlertEmail`; accept the defaults for
   the rest. Say yes to saving the answers to `samconfig.toml` (it holds no
   secrets, but check before committing it).
5. **Confirm the alert email.** AWS sends a confirmation link to `AlertEmail`;
   alarms are silent until it is clicked.
6. **Wire up the form Lambda:** apply the code change above, deploy it with
   `aws/franchise-form/setup.sh`, then add the environment variable (merge, do
   not replace, the existing ones; the stack's `SubmissionsQueueUrl` output is
   the value):
   ```bash
   aws cloudformation describe-stacks --stack-name atl-franchise-archive \
     --query "Stacks[0].Outputs[?OutputKey=='SubmissionsQueueUrl'].OutputValue" --output text
   ```
7. **Test end to end** with a real submission: the email arrives, and
   `aws dynamodb scan --table-name atl-franchise-submissions --max-items 5`
   shows the row.

You do **not** need to change SES, the API Gateway route, or the existing
DynamoDB table.

**Phase 2 will additionally need:**

- A DNS record for `admin.atlwingspot.com` (and one to validate the ACM
  certificate), added wherever `atlwingspot.com`'s DNS is managed. The site
  itself is served from GitHub Pages (`CNAME` file in the repo root), so this
  is probably your registrar or Cloudflare, not Route 53.
- Decide who gets accounts and at what level (admin / staff / read-only).
- MFA app for each user on first login.

## Cost

At franchise-inquiry volume (tens of submissions a month), phase 1 is a few
cents to well under a dollar a month. Phase 2 adds Cognito (free for the first
50,000 monthly users), CloudFront/S3 and the API (cents), plus a Route 53 zone
only if you choose to host DNS there. AWS Backup storage for a tiny table is
negligible.

## Risks and how they are covered

| Risk | Cover |
| --- | --- |
| Email sent, enqueue fails | Logged as `archive_enqueue_failed`; metric filter and alarm; phase 3 reconcile job |
| Worker can't write | Retried 5×, then DLQ; DLQ alarm; messages kept 14 days to redrive |
| Duplicate delivery | Conditional put on `submissionId`; never overwrites staff edits |
| Table deleted or corrupted | Deletion protection, retain-on-delete, PITR (35 days), AWS Backup (90 days) |
| Credentials phished | Cognito MFA required, invite-only, role-based access, audit log (phase 2) |
| Form Lambda compromised | Can only send to one queue; cannot read the leads |
| Replies aren't mirrored | Out of scope. Staff record `lastContactedAt`/notes in the dashboard |

## Open questions

1. Which AWS account owns this: the current one, or one ATL Wing Spot owns?
2. Who needs logins, and should anyone be read-only?
3. Do you want past submissions imported from Gmail?
4. Is the status list above right for how franchise sales actually run?
