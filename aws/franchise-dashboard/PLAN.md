# Franchise submissions: archive and dashboard

A durable, login-protected copy of every franchising submission, kept alongside
the existing email. Email keeps working exactly as it does today (it is where
replies happen). The database is a second copy that cannot be deleted by
accident and that the whole team can search.

Status: **phase 1 is live** (2026-11-18). Every franchising submission is
emailed as before and also saved to `atl-franchise-submissions` (us-east-1),
verified end to end with a real submission. **Phase 2 (the login dashboard) is
written and tested, not yet deployed**; it lives in `dashboard/`. Phase 3 is a
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

   Phase 2 (stack atl-franchise-dashboard):

   browser ─▶ CloudFront  admin.atlwingspot.com
                 ├── /        ─▶ S3 (private)  the dashboard page
                 └── /api/*   ─▶ HTTP API, Cognito JWT authorizer ─▶ Lambda atl-franchise-dashboard-api
                                                                      ├─▶ atl-franchise-submissions
                                                                      └─▶ atl-franchise-audit
   login: Cognito hosted login (authorization code + PKCE); the page never sees the password
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

Added by the dashboard (database only, never written back to email): `notes`,
`lastContactedAt` (YYYY-MM-DD), `archivedAt` (archive is a flag, not a
delete), `updatedAt`/`updatedBy`. Rows added by hand or imported also carry
`source` (`manual` / `import`) and `createdBy`. Imported rows get a
deterministic id from email + date, so importing the same file twice skips the
copies.

The dashboard cannot change what the applicant sent (name, email, phone,
territory, message) and has no delete permission at all.

`atl-franchise-audit` (key: `submissionId`, `at`) records every change: who,
when, and the before and after values.

Indexes: `by-created` (entity, createdAt) for the main list; `by-status`
(status, createdAt) for the pipeline filter.

No IP address is stored. The form Lambda already keeps only a keyed hash for
rate limiting, and the dashboard has no need for it.

## Phases

### Phase 1: capture (live)

Starts saving every submission immediately, with no UI yet, so nothing is lost
while the dashboard is built.

- [x] `template.yaml`: table, queue, DLQ, worker, alarms, backups
- [x] `src/worker/worker.py` with 16 tests
- [x] Deploy the stack
- [x] Form Lambda change written, with 12 new tests (87 total)
- [x] Confirm the SNS alert subscription email
- [x] Deploy the form Lambda change with `setup.sh`
- [x] Send a test submission; confirm the email arrives **and** a row appears

### Phase 2: the dashboard (`dashboard/`, written and tested)

- **Login:** one Cognito user, `ATLWingSpotAdmin` (usernames are case
  sensitive). No self sign-up. Password: at least 10 characters including a
  number, set at a hidden prompt by `create-admin.sh`, never stored in the repo.
  Cognito's hosted login handles the password; repeated wrong passwords are
  throttled by Cognito. Optional authenticator-app codes (`REQUIRE_MFA=ON`).
  Tokens last an hour (refreshed for up to 12) and are dropped when the tab
  closes.
- **Page:** list newest first, counts per status, search, filter by status or
  archived, a detail view with email/phone links, status, last-contacted date,
  notes, archive, and a change history. Add one by hand, import a CSV of past
  submissions, export what is on screen to CSV (with spreadsheet-formula
  injection blocked). Works on a phone.
- **API:** `GET/POST /api/submissions`, `GET/PATCH /api/submissions/{id}` behind
  a Cognito JWT authorizer, served through the same CloudFront hostname so no
  CORS is needed.
- **Security headers** from CloudFront: a strict Content-Security-Policy
  (scripts only from the dashboard itself), HSTS, no framing, no referrer,
  `noindex`.
- Tests: 54 API tests (against an in-memory DynamoDB with the real indexes),
  9 for the CSV/date helpers, and a browser run of the real page under the
  production CSP (`tests/ui.smoke.js`).

### Phase 3: hardening (not started)

- Reconcile job (EventBridge, daily): compares recent SES sends to table rows
  and alerts on any email with no matching row.
- Nightly export to S3 as a copy independent of both DynamoDB and AWS Backup.

## The form Lambda change (phase 1)

The only edit to existing code, in `aws/franchise-form/lambda_function.py`:

- A new `_archive(cleaned)` function sends the validated fields, a new
  `submissionId` (UUID) and `createdAt` to the queue.
- It is called once, **after** `_send_email` has succeeded. Nothing is archived
  for a failed send, the honeypot, a rate-limited request or invalid input.
- It never raises. Any failure is logged as `archive_enqueue_failed` (no
  personal data), which the stack's alarm watches; the response is still 200.
- The SQS client uses 2s/3s timeouts and a single attempt, so a slow queue
  cannot hold up the applicant.
- With `SUBMISSIONS_QUEUE_URL` unset it does nothing at all.

The email itself is untouched: a test asserts the SES call is byte-for-byte
identical with the archive on and off, and a contract test feeds what the form
queues into the real worker.

`setup.sh` now reads the queue URL from the `atl-franchise-archive` stack's
output and merges it into the Lambda's environment, keeping every existing
value.

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
   sam deploy --guided --stack-name atl-franchise-archive --region us-east-1 \
     --capabilities CAPABILITY_IAM
   ```
   No `sam build` is needed: the worker has no dependencies. It asks for
   `FormFunctionRoleName` and `AlertEmail`; accept the defaults for the rest.
   Say yes to saving the answers to `samconfig.toml` (it holds no secrets, but
   check before committing it).
5. **Confirm the alert email.** AWS sends a confirmation link to `AlertEmail`;
   alarms are silent until it is clicked.
6. **Deploy the form Lambda change.** From `aws/franchise-form`, run
   `./setup.sh`. It deploys the new code and sets `SUBMISSIONS_QUEUE_URL` from
   the stack automatically; look for `submissions archive: on` in its output.
7. **Test end to end** with a real submission: the email arrives, and
   `aws dynamodb scan --table-name atl-franchise-submissions --max-items 5`
   shows the row.

You do **not** need to change SES, the API Gateway route, or the existing
DynamoDB table.

**Phase 2** (in AWS CloudShell, from an up-to-date copy of `main`):

1. **Deploy the dashboard:**
   ```bash
   cd ~/ATLwingSpot && git checkout main && git pull
   cd aws/franchise-dashboard/dashboard
   ./deploy.sh
   ```
   It takes 5-10 minutes (CloudFront is slow to create) and ends by printing
   the dashboard address, a `https://d….cloudfront.net/` URL.
2. **Create the login:**
   ```bash
   ./create-admin.sh
   ```
   Type the password twice at the hidden prompt. Run it again any time to
   change the password; that also signs out every existing session.
3. **Sign in** at the printed address with `ATLWingSpotAdmin` and the password.
4. **Import past submissions** (optional): put them in a spreadsheet with
   columns like First name, Last name, Email, Phone, State, Date received,
   download it as CSV, and use **Import CSV** on the dashboard.

**Custom domain `admin.atlwingspot.com`** (DNS is in Cloudflare):

1. Request a certificate (must be `us-east-1`, which is where CloudFront looks):
   ```bash
   CERT_ARN=$(aws acm request-certificate --domain-name admin.atlwingspot.com \
     --validation-method DNS --region us-east-1 --query CertificateArn --output text)
   echo "$CERT_ARN"
   aws acm describe-certificate --certificate-arn "$CERT_ARN" --region us-east-1 \
     --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
   ```
   (If the record shows as `null`, wait a few seconds and run the last command
   again.)
2. In Cloudflare, **DNS → Add record**: type `CNAME`, the `Name` and `Value`
   from that output, **Proxy status: DNS only** (grey cloud).
3. Wait for AWS to see it (usually a few minutes):
   ```bash
   aws acm wait certificate-validated --certificate-arn "$CERT_ARN" --region us-east-1 && echo validated
   ```
4. Redeploy with the domain:
   ```bash
   DOMAIN=admin.atlwingspot.com CERT_ARN="$CERT_ARN" ./deploy.sh
   ```
5. In Cloudflare, add a second record: `CNAME`, name `admin`, target the
   `d….cloudfront.net` name that `deploy.sh` printed, **DNS only** (grey cloud).
6. Open `https://admin.atlwingspot.com`. The cloudfront.net address keeps
   working too. Later plain `./deploy.sh` runs remember the domain.

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
| Password guessed or leaked | Invite-only, 10+ characters, Cognito throttles failed logins, `create-admin.sh` resets and signs everyone out, audit log; turn on `REQUIRE_MFA=ON` for a second factor |
| Script injected through form text | Page inserts all data as text, never HTML; CSP allows only the dashboard's own scripts |
| Bad CSV export opened in Excel | Cells starting with `= + - @` are prefixed so they show as text |
| Form Lambda compromised | Can only send to one queue; cannot read the leads |
| Replies aren't mirrored | Out of scope. Staff record `lastContactedAt`/notes in the dashboard |

## Decisions

1. **Account:** the existing AWS account (the one the form Lambda already runs in).
2. **Logins:** one shared login, `ATLWingSpotAdmin`. More can be added with
   `./create-admin.sh <name>`; every login has full access.
3. **History:** past submissions are imported by hand through **Import CSV**.
4. **Statuses:** New, Contacted, Qualified, Discovery call, FDD sent, Signed,
   Declined.
