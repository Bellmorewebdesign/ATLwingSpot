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
   login: the dashboard's own branded form → Cognito API (USER_PASSWORD_AUTH, HTTPS) → tokens
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
| `status` | S | always `new` today; kept in the data and API, not shown in the dashboard |
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
(status, createdAt), unused by the dashboard today.

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
  The sign-in form is the dashboard's own, in ATL Wing Spot branding: it sends
  the username and password straight to Cognito's API over HTTPS and clears
  the password from the page. Cognito throttles repeated wrong passwords.
  Optional authenticator-app codes (`REQUIRE_MFA=ON`); the form handles the
  code, first-time setup and a forced new password. Tokens last an hour
  (refreshed for up to 12) and are dropped when the tab closes.
- **Page:** a list of every lead with a one-line message preview, sortable
  like a file browser (click a column header, click again to flip; dates start
  newest first) plus a Sort menu, and search. Every lead has a **Reply**
  button: on a computer it opens a Gmail draft in a new tab, on a phone the
  mail app, addressed to the applicant with a subject and their message
  quoted. Click a lead for the full message, Reply and Call buttons, private
  notes and Archive. On a phone the
  list becomes cards and a lead opens full screen. Import a CSV of past
  submissions and export what is on screen (with spreadsheet-formula injection
  blocked). The sort choice is remembered per browser.
- **Branding:** the logo, favicons, colours (orange #f47c20, blue #29c1db,
  cream) and fonts (Anton, Manrope) are the public site's own files, served
  from the dashboard so the strict CSP stays intact.
- **API:** `GET/POST /api/submissions`, `GET/PATCH /api/submissions/{id}` behind
  a Cognito JWT authorizer, served through the same CloudFront hostname so no
  CORS is needed.
- **Security headers** from CloudFront: a strict Content-Security-Policy
  (scripts only from the dashboard itself), HSTS, no framing, no referrer,
  `noindex`.
- Tests: 54 API tests (against an in-memory DynamoDB with the real indexes),
  18 for the CSV, date, sorting and reply helpers, and a browser run of the real page
  under the production CSP with Cognito faked (`tests/ui.smoke.js`): sign-in
  incl. MFA and new-password steps, sorting, previews, notes, archive,
  import/export, token refresh, sign-out, phone layout down to 320px.

### Phase 2.1: security and account (`dashboard/`, written and tested)

**Kept out of sight**
- **Nothing but the sign-in form is public.** The public page is the logo, a
  username and password form, and `signin.js`. The dashboard's markup, code
  and styles (`web/app/`) ship inside the API function, not the website
  bucket, and come only from `GET /api/app/{file}` with a one-time pass:
  after a sign-in, `POST /api/app-ticket` (token required) issues a random
  pass valid two minutes, stored only as a hash, tied to that sign-in; the
  page sends it as a cookie scoped to `/api/app/`, loads the four files, and
  drops it. Without a valid pass every one of those files is a bare 404. The
  only way they get into the page is the `atl-loader` Trusted Types policy,
  which the CSP names as the only one allowed and which only accepts the two
  dashboard scripts. Signing out reloads the page, so nothing from behind
  the sign-in stays in it. A crawler or an AI fetching the address sees a
  sign-in form and nothing else; the browser test fetches every public file
  and fails if any of them mentions what the dashboard does.
- Every response carries
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`, and
  `robots.txt` deliberately allows crawling: a search engine has to fetch a
  page to see its noindex (blocked by robots.txt, a known URL can still be
  listed). What it fetches is the sign-in form.
- Neutral wording before sign-in: the tab says "Sign in", the page "Sign in."
  with the logo.
- Only the dashboard's own files exist. A CloudFront Function answers any
  other path (`/.env`, `/admin`, `/wp-login.php`…) with an empty 404.
- Comments are stripped from the published HTML, CSS and JS (`build.py`); the
  `Server` header is removed.

**Rate limits and firewall** (AWS WAF, `EnableWaf`, on by default)
- Login: 30 Cognito calls per IP per 5 minutes, plus AWS's bad-IP list, on
  top of Cognito's own lockout after repeated wrong passwords. A person
  signing in makes a handful of calls.
- Dashboard (page and API): 1,000 requests per IP per 5 minutes, AWS's bad-IP
  list, and AWS's known-bad-inputs rules.
- API Gateway throttling stays as a second layer.

**Locked-down API**
- CloudFront adds a random secret header (from Secrets Manager); the API
  refuses any request without it, so it cannot be reached around CloudFront
  and the firewall.
- Access tokens last 15 minutes (refreshed quietly); refresh tokens 12 hours.
- Content-Security-Policy now also requires Trusted Types; plus
  Permissions-Policy, Cross-Origin-Opener/Resource-Policy, HSTS, no framing,
  no referrer.

**Account panel**
- Signed-in devices: every sign-in in the last 30 days with browser, OS,
  kind of device, IP (and the IP it first signed in from), city/region/
  country, when it signed in and when it was last active. This device is
  marked.
- Sign out any device, or all others. A signed-out device is refused by the
  API on its very next request (tracked per sign-in by the token's
  `origin_jti` in `atl-franchise-sessions`).
- Change password (Cognito `ChangePassword`). With "sign out every device"
  (on by default) it also signs every device out in the log, revokes every
  refresh token with Cognito (`GlobalSignOut`) and signs this tab out.
- Sign-out also marks the sign-in as signed out in the log; an hour without
  activity signs the tab out.

**Long lists**
- 50 leads a page (25/50/100, remembered), with Prev/Next. Search, sorting,
  the Archived view and Export work on every lead, not just the page shown.
- All leads are loaded in pages of 200 behind the scenes; this stays quick
  into the thousands. Past roughly 5,000 leads, move search and sorting into
  the API (the `by-created` index already supports date order).

**Form (`aws/franchise-form`)**
- Already had: Cloudflare Turnstile, a honeypot, field and size validation,
  1 per minute / 3 per hour / 10 per day per IP, 50 per day overall, API
  Gateway throttling, and fail-closed behaviour.
- Added: at most 3 submissions per email address per day across every IP
  (stored only as a keyed hash), and `X-Content-Type-Options: nosniff`.
- AWS WAF cannot be attached to this kind of API (HTTP API); the limits above
  do that job inside the function.

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

Phase 2.1 adds AWS WAF, about **$15 a month** (two web ACLs at $5 each plus
$1 per rule; request charges are negligible at this volume) and Secrets
Manager at $0.40 a month. `WAF=off ./deploy.sh` removes the firewall and its
cost; everything else keeps working.

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
| Replies aren't mirrored | Out of scope. Staff keep notes on each lead in the dashboard |

## Decisions

1. **Account:** the existing AWS account (the one the form Lambda already runs in).
2. **Logins:** one shared login, `ATLWingSpotAdmin`. More can be added with
   `./create-admin.sh <name>`; every login has full access.
3. **History:** past submissions are imported by hand through **Import CSV**.
4. **No sales pipeline in the UI.** The dashboard is a sortable list of leads
   with full messages, notes and archive. Status values stay in the data and
   API (all `new`) in case they are wanted later.
5. **Branded sign-in** on the dashboard itself rather than Cognito's hosted
   page, which could not carry the ATL Wing Spot logo and colours.
6. **Release:** changes are reviewed on the live cloudfront.net address from
   the branch, merged once approved, then moved to the custom domain.
