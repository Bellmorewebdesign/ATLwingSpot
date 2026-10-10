# Franchising form backend

The franchising form on `/#/franchise` posts to an HTTP API in front of a
Lambda, which validates the submission, takes rate-limit quota in DynamoDB and
sends the enquiry on through SES.

```
browser  ──POST JSON──▶  API Gateway HTTP API (jva4k2azf7)
                         route POST /franchise, stage $default
                              │
                              ▼
                         Lambda atl-franchise-form
                         lambda_function.lambda_handler
                              │  acquire quota first
                              ├──▶ DynamoDB  atl-franchise-form-ratelimit
                              │                (conditional TransactWriteItems)
                              └──▶ SES  forms@bellmorewebdesign.com
                                        → FRANCHISE_RECIPIENT
```

| File | What it is |
| --- | --- |
| `lambda_function.py` | The whole handler. This is the file to deploy. |
| `setup.sh` | Idempotent setup for everything around it. |
| `tests/test_lambda_function.py` | 46 tests. No AWS, no network. |
| `tests/fakes.py` | DynamoDB and SES doubles. The DynamoDB one evaluates the real conditions under a lock, so the concurrency tests mean something. |

---

## Deploying

```bash
cd aws/franchise-form
./setup.sh                 # infrastructure + deploy the handler
./setup.sh --skip-code     # infrastructure only
```

Needs `awscli` v2, `python3`, `zip`, and credentials that can administer the
Lambda, the API, DynamoDB and IAM. Run it again any time; every step checks
the current state first.

### What it does, as individual commands

If you would rather do it by hand, this is the whole of it. `ACCOUNT` is your
account id and `ROLE` is the Lambda's execution role name.

```bash
REGION=us-east-1
TABLE=atl-franchise-form-ratelimit
FUNCTION=atl-franchise-form
API_ID=jva4k2azf7

# 1. the table
aws dynamodb create-table --table-name $TABLE --region $REGION \
  --attribute-definitions AttributeName=pk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
aws dynamodb wait table-exists --table-name $TABLE --region $REGION

# 2. TTL, for housekeeping only
aws dynamodb update-time-to-live --table-name $TABLE --region $REGION \
  --time-to-live-specification Enabled=true,AttributeName=expires_at

# 3. permission to use it, as its own inline policy so nothing already on the
#    role is disturbed
aws iam put-role-policy --role-name $ROLE \
  --policy-name atl-franchise-form-ratelimit \
  --policy-document '{"Version":"2012-10-17","Statement":[{
    "Effect":"Allow",
    "Action":["dynamodb:PutItem","dynamodb:UpdateItem","dynamodb:ConditionCheckItem"],
    "Resource":"arn:aws:dynamodb:us-east-1:ACCOUNT:table/atl-franchise-form-ratelimit"}]}'

# 4. the new variables. Read the current ones first and send them back with
#    these added: --environment REPLACES the whole map.
aws lambda get-function-configuration --function-name $FUNCTION \
  --region $REGION --query 'Environment.Variables'
aws lambda update-function-configuration --function-name $FUNCTION --region $REGION \
  --environment 'Variables={SES_FROM=...,FRANCHISE_RECIPIENT=...,SES_FROM_NAME=ATL Wing Spot,RATE_LIMIT_TABLE=atl-franchise-form-ratelimit,RATE_LIMIT_SECRET=<64 hex chars>,MIN_INTERVAL_SECONDS=60,PER_IP_HOURLY_LIMIT=3,PER_IP_DAILY_LIMIT=10,GLOBAL_DAILY_LIMIT=50,MAX_BODY_BYTES=16384}'

# 5. the code
zip -j function.zip lambda_function.py
aws lambda update-function-code --function-name $FUNCTION --region $REGION \
  --zip-file fileb://function.zip

# 6. let the browser read Retry-After, and keep the origin list narrow
aws apigatewayv2 update-api --api-id $API_ID --region $REGION \
  --cors-configuration 'AllowOrigins=https://bellmorewebdesign.github.io,AllowMethods=OPTIONS,POST,AllowHeaders=content-type,ExposeHeaders=retry-after,MaxAge=300'

# 7. coarse API-level throttling (see the warning below)
aws apigatewayv2 update-stage --api-id $API_ID --stage-name '$default' --region $REGION \
  --default-route-settings 'ThrottlingRateLimit=5,ThrottlingBurstLimit=10'
```

Generate the secret with `python3 -c 'import secrets; print(secrets.token_hex(32))'`.
`setup.sh` does this for you and never prints it.

---

## Environment variables

Existing values are preserved by `setup.sh`; it only fills in what is missing.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SES_FROM` | — | Required. Verified sender. |
| `SES_FROM_NAME` | `ATL Wing Spot` | Display name on the From header. |
| `FRANCHISE_RECIPIENT` | — | Required. Where enquiries go. Read **only** from here, never from the request. |
| `RATE_LIMIT_SECRET` | — | Required. HMAC key for the IP identifiers. |
| `RATE_LIMIT_TABLE` | `atl-franchise-form-ratelimit` | |
| `MIN_INTERVAL_SECONDS` | `60` | Minimum gap between accepted submissions from one IP. |
| `PER_IP_HOURLY_LIMIT` | `3` | Per IP, per fixed UTC hour. |
| `PER_IP_DAILY_LIMIT` | `10` | Per IP, per UTC calendar day. |
| `GLOBAL_DAILY_LIMIT` | `50` | Across everyone, per UTC calendar day. |
| `MAX_BODY_BYTES` | `16384` | Request bodies above this are refused unparsed. |

Missing `RATE_LIMIT_SECRET`, `SES_FROM` or `FRANCHISE_RECIPIENT` makes the form
return 503 rather than run without the control. That is deliberate.

---

## How the rate limiting works, and where it does not

Every accepted submission takes one unit from four counters at once, in a
single DynamoDB `TransactWriteItems` where each counter carries its own
condition. The transaction is all-or-nothing, so two Lambdas that race both see
the same committed state and exactly one wins. Nothing is read and then
written, and no state lives in Lambda memory or on disk, so the number of
concurrent execution environments is irrelevant.

**These are fixed windows, not sliding ones.** The hourly and daily caps count
against wall-clock boundaries — the UTC hour and the UTC calendar day — so the
counter resets the moment the clock ticks over. The consequence is worth
stating plainly: someone can use a whole hourly allowance at 10:59 and a whole
fresh one at 11:01, making the real worst case across a boundary twice the
limit within a couple of minutes. The 60-second minimum interval is what keeps
that from being three submissions in three seconds. Sliding windows would need
either a read of recent history or one row per request, and neither is worth
it here.

**The global cap can lock out real people.** `GLOBAL_DAILY_LIMIT` is a blunt
backstop against one bad day costing a fortune in SES. Once it is reached,
every further submission is refused until the next UTC day — including genuine
ones, from people who have never used the form. Raise it if the form is ever
busy enough for that to be a real risk. The form tells people to use Instagram
instead when it happens.

**Failed sends still cost quota.** Quota is taken before SES is called and is
never given back. A submission whose SES call fails or times out has consumed
its allowance, and the person has to wait out the interval before retrying.
That is the deliberate direction: refunding on failure would be a way to send
unlimited mail by making sends fail. **This is not exactly-once delivery** —
SES can accept a message that is never delivered, and an invocation can fail
after SES accepted it.

**It is per-IP, so it is not a defence against a distributed sender.** A botnet
gets a fresh per-IP allowance for each address it uses, and only the global
daily cap stands behind that. There is no CAPTCHA here by request.

**Identifiers are HMAC-SHA256 of the source IP** keyed with `RATE_LIMIT_SECRET`.
The IPv4 space is small enough to enumerate, so a plain hash would be
reversible by brute force and the table would be a log of who submitted. No
name, email, phone or message ever reaches this table, and none of it is
logged.

**The source IP is only ever `requestContext.http.sourceIp`.** Not
`X-Forwarded-For`, not anything in the body: a sender who could choose their
own bucket could choose a fresh one per request. A missing source IP is not a
free pass — those requests share one bucket and compete with each other.

TTL on `expires_at` is housekeeping to stop the table growing without bound.
Correctness does not depend on it: keys are window-specific, so yesterday's
counter is simply never the key any later request builds. DynamoDB's sweeper
routinely runs hours late and that is fine.

### Responses

| Status | When | Notes |
| --- | --- | --- |
| 200 | Accepted and handed to SES | Also returned for a tripped honeypot, which sends nothing. |
| 400 | Bad JSON, missing/invalid/oversized field | Carries a `fields` map the form renders inline. |
| 405 | Not a POST | |
| 413 | Body over `MAX_BODY_BYTES` | Refused before parsing. |
| 429 | A rate limit was hit | Carries `Retry-After`. No email, no SES call. |
| 502 | SES refused or failed | Quota already consumed. |
| 503 | Limiter unavailable, or misconfigured | Fails closed. No email. |

### API Gateway throttling is not the limiter

`setup.sh` also sets a 5 req/s, burst 10 throttle on the stage. That is a
coarse, best-effort safeguard shared by everyone using the API, measured in
requests per second and enforced nowhere near precisely enough to call a
limit. It exists to blunt a flood before it reaches Lambda. **The strict,
per-IP, persistent limits are the DynamoDB ones above**; the two are not
alternatives and the throttle protects nothing on its own.

---

## Adding the real website domain later

Today's CORS allows exactly one origin, the GitHub Pages one. When the site
moves to its own domain, add it — do not replace it until the Pages URL is
retired, and never widen to `*`:

```bash
aws apigatewayv2 update-api --api-id jva4k2azf7 --region us-east-1 \
  --cors-configuration 'AllowOrigins=https://bellmorewebdesign.github.io,https://atlwingspot.com,https://www.atlwingspot.com,AllowMethods=OPTIONS,POST,AllowHeaders=content-type,ExposeHeaders=retry-after,MaxAge=300'
```

`setup.sh` does this additively: it reads the current origins and appends
`ALLOWED_ORIGIN` if it is not already there, so
`ALLOWED_ORIGIN=https://atlwingspot.com ./setup.sh --skip-code` adds the new
one and keeps the old. Both `apex` and `www` need listing if both will serve
the site. Nothing in the frontend needs changing: the endpoint is the same.

---

## Tests

```bash
python3 -m venv .venv && .venv/bin/pip install boto3 pytest
cd tests && ../.venv/bin/python -m pytest -q
```

46 tests, no AWS and no network. They cover the happy path and the exact email
format, every validation rejection, the honeypot, each of the four limits,
window resets across hour and day boundaries, missing and spoofed source IPs,
concurrency at the per-IP and global caps (20 and 25 threads racing for 3 and 5
places), DynamoDB failures of four kinds, SES failure, and that no personal
detail is ever written to the log.

---

## Security notes

- No AWS credentials anywhere in this repository or in the browser bundle. The
  only thing the frontend knows is the public endpoint URL.
- The recipient address is never in browser code and is never read from the
  request. A submission containing `FRANCHISE_RECIPIENT` or `to` is ignored;
  there is a test for it.
- The applicant's address goes in `Reply-To` and is validated to contain no
  whitespace first, so a second header cannot be smuggled through it.
- Nothing personal is logged. Log lines carry an event name, a 12-character
  prefix of the HMAC'd IP and whether a source IP was present.
