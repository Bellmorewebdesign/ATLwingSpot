#!/usr/bin/env bash
#
# Idempotent setup for the ATL Wing Spot franchising form.
#
# Safe to run repeatedly: every step checks the current state first and only
# changes what is missing or different. It ADDS to the existing Lambda, SES
# identity and HTTP API rather than replacing them — environment variables are
# merged, not overwritten, and the IAM change is a separate inline policy with
# its own name, so nothing already attached to the role is touched.
#
#   ./setup.sh                  # everything, including deploying the handler
#   ./setup.sh --skip-code      # infrastructure only, leave the code alone
#
# Needs: awscli v2, python3, zip, and credentials that can administer these
# resources. Nothing is written to disk that contains a secret.

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
FUNCTION="${FUNCTION_NAME:-atl-franchise-form}"
API_ID="${API_ID:-jva4k2azf7}"
TABLE="${RATE_LIMIT_TABLE:-atl-franchise-form-ratelimit}"
POLICY_NAME="atl-franchise-form-ratelimit"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-https://bellmorewebdesign.github.io}"
TURNSTILE_HOSTNAMES="${TURNSTILE_HOSTNAMES:-bellmorewebdesign.github.io}"
# The handler allows 5s for the call to Cloudflare, so the function itself
# needs more than AWS's 3s default or the invocation dies mid-verification.
MIN_LAMBDA_TIMEOUT="${MIN_LAMBDA_TIMEOUT:-15}"

# Best-effort API-level throttling. Not the real limiter; see README.
THROTTLE_RATE="${THROTTLE_RATE:-5}"
THROTTLE_BURST="${THROTTLE_BURST:-10}"

SKIP_CODE=0
[[ "${1:-}" == "--skip-code" ]] && SKIP_CODE=1

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
ok()  { printf '    %s\n' "$1"; }

for dep in aws python3 zip; do
  command -v "$dep" >/dev/null 2>&1 || { echo "missing dependency: $dep" >&2; exit 1; }
done

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
TABLE_ARN="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE}"
say "Account ${ACCOUNT_ID}, region ${REGION}"

# ---------------------------------------------------------------- DynamoDB
say "DynamoDB table ${TABLE}"
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  ok "already exists, leaving it alone"
else
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=pk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" >/dev/null
  ok "created, waiting for it to become ACTIVE"
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  ok "active"
fi

# TTL is housekeeping only. Correctness comes from window-specific keys, so a
# late sweep cannot let anyone over a limit; see the handler's docstring.
TTL_STATUS="$(aws dynamodb describe-time-to-live --table-name "$TABLE" --region "$REGION" \
  --query 'TimeToLiveDescription.TimeToLiveStatus' --output text 2>/dev/null || echo NONE)"
if [[ "$TTL_STATUS" == "ENABLED" || "$TTL_STATUS" == "ENABLING" ]]; then
  ok "TTL already ${TTL_STATUS}"
else
  aws dynamodb update-time-to-live --table-name "$TABLE" --region "$REGION" \
    --time-to-live-specification "Enabled=true,AttributeName=expires_at" >/dev/null
  ok "TTL enabled on expires_at"
fi

# --------------------------------------------------------------------- IAM
say "IAM"
ROLE_ARN="$(aws lambda get-function-configuration --function-name "$FUNCTION" \
  --region "$REGION" --query Role --output text)"
ROLE_NAME="${ROLE_ARN##*/}"
ok "execution role: ${ROLE_NAME}"

# A named inline policy of its own. put-role-policy replaces only the policy
# with this name and leaves every other attached or inline policy in place,
# so whatever already grants ses:SendEmail keeps working.
POLICY_DOC="$(python3 -c '
import json, sys
print(json.dumps({
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "FranchiseFormRateLimit",
    "Effect": "Allow",
    "Action": ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:ConditionCheckItem"],
    "Resource": sys.argv[1]
  }]
}))' "$TABLE_ARN")"
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" --policy-document "$POLICY_DOC" >/dev/null
ok "inline policy ${POLICY_NAME} scoped to ${TABLE_ARN}"
ok "(TransactWriteItems is authorised through PutItem/UpdateItem/ConditionCheckItem)"

if aws iam list-attached-role-policies --role-name "$ROLE_NAME" \
     --query 'AttachedPolicies[].PolicyName' --output text | grep -qi ses \
   || aws iam list-role-policies --role-name "$ROLE_NAME" \
     --query 'PolicyNames' --output text | grep -qi ses; then
  ok "an SES policy is already on the role"
else
  ok "NOTE: no obviously SES-named policy found. The role still needs ses:SendEmail;"
  ok "      it is presumably granted by an existing policy, since a test mail sent."
fi

# ------------------------------------------------------- Lambda environment
say "Lambda environment variables on ${FUNCTION}"
CURRENT_ENV="$(aws lambda get-function-configuration --function-name "$FUNCTION" \
  --region "$REGION" --query 'Environment.Variables' --output json)"

# Generated here and never printed or written to a file. Rotating it only
# resets the rate-limit buckets; it is not a credential for anything.
NEW_SECRET="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"

MERGED="$(python3 - "$CURRENT_ENV" "$TABLE" "$NEW_SECRET" "$TURNSTILE_HOSTNAMES" <<'PY'
import json, sys
current = json.loads(sys.argv[1]) if sys.argv[1] not in ("", "None", "null") else {}
table, generated, hostnames = sys.argv[2], sys.argv[3], sys.argv[4]

# Existing values win: this must never clobber SES_FROM, FRANCHISE_RECIPIENT,
# or a RATE_LIMIT_SECRET that is already in place and already has live
# buckets hanging off it.
defaults = {
    # TURNSTILE_SECRET is deliberately absent. It is already set, and inventing
    # a placeholder for it would replace a working secret with a broken one on
    # any environment where the read came back empty.
    "TURNSTILE_HOSTNAMES": hostnames,
    "TURNSTILE_ACTION": "franchise",
    "TURNSTILE_TIMEOUT_SECONDS": "5",
    "RATE_LIMIT_TABLE": table,
    "RATE_LIMIT_SECRET": generated,
    "MIN_INTERVAL_SECONDS": "60",
    "PER_IP_HOURLY_LIMIT": "3",
    "PER_IP_DAILY_LIMIT": "10",
    "GLOBAL_DAILY_LIMIT": "50",
    "MAX_BODY_BYTES": "16384",
    "SES_FROM_NAME": "ATL Wing Spot",
}
added = [k for k, v in defaults.items() if not current.get(k)]
merged = dict(defaults)
merged.update({k: v for k, v in current.items() if v not in (None, "")})
print(json.dumps({
    "vars": merged,
    "added": added,
    "has_turnstile_secret": bool(current.get("TURNSTILE_SECRET")),
}))
PY
)"
ADDED="$(python3 -c 'import json,sys; print(" ".join(json.loads(sys.argv[1])["added"]) or "(none)")' "$MERGED")"
VARS="$(python3 -c 'import json,sys; print(json.dumps({"Variables": json.loads(sys.argv[1])["vars"]}))' "$MERGED")"

aws lambda update-function-configuration --function-name "$FUNCTION" --region "$REGION" \
  --environment "$VARS" >/dev/null
aws lambda wait function-updated-v2 --function-name "$FUNCTION" --region "$REGION"
ok "added (existing values preserved): ${ADDED}"
ok "secret not printed; re-running will not overwrite one already set"

HAS_TS="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["has_turnstile_secret"])' "$MERGED")"
if [[ "$HAS_TS" == "True" ]]; then
  ok "TURNSTILE_SECRET already present, left untouched"
else
  printf '    \033[31m!! TURNSTILE_SECRET is NOT set on this function.\033[0m\n'
  ok "   The handler fails closed without it: the form will return 503 and"
  ok "   send nothing. Set it from the Cloudflare dashboard, then re-run:"
  ok "   aws lambda update-function-configuration --function-name ${FUNCTION} \\"
  ok "     --region ${REGION} --environment ... (merge, do not replace)"
fi

# ----------------------------------------------------------- function timeout
say "Lambda timeout"
CUR_TIMEOUT="$(aws lambda get-function-configuration --function-name "$FUNCTION" \
  --region "$REGION" --query Timeout --output text)"
if [[ "$CUR_TIMEOUT" -ge "$MIN_LAMBDA_TIMEOUT" ]]; then
  ok "already ${CUR_TIMEOUT}s, leaving it"
else
  aws lambda update-function-configuration --function-name "$FUNCTION" --region "$REGION" \
    --timeout "$MIN_LAMBDA_TIMEOUT" >/dev/null
  aws lambda wait function-updated-v2 --function-name "$FUNCTION" --region "$REGION"
  ok "raised ${CUR_TIMEOUT}s -> ${MIN_LAMBDA_TIMEOUT}s, so the call to Cloudflare has room"
fi

# ------------------------------------------------------------- function code
if [[ "$SKIP_CODE" -eq 0 ]]; then
  say "Deploying lambda_function.py"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  cp "$HERE/lambda_function.py" "$TMP/"
  (cd "$TMP" && zip -q function.zip lambda_function.py)
  aws lambda update-function-code --function-name "$FUNCTION" --region "$REGION" \
    --zip-file "fileb://$TMP/function.zip" >/dev/null
  aws lambda wait function-updated-v2 --function-name "$FUNCTION" --region "$REGION"
  ok "uploaded; handler stays lambda_function.lambda_handler"
else
  say "Skipping code deploy (--skip-code)"
fi

# ---------------------------------------------------------------- API CORS
say "HTTP API ${API_ID} CORS"
# Rewritten wholesale because that is the only shape the API accepts, but the
# existing origins/methods/headers are read first and carried over. The origin
# list is never widened to "*".
CORS="$(aws apigatewayv2 get-api --api-id "$API_ID" --region "$REGION" \
  --query 'CorsConfiguration' --output json)"
CORS_ARGS="$(python3 - "$CORS" "$ALLOWED_ORIGIN" <<'PY'
import json, sys
cors = json.loads(sys.argv[1]) if sys.argv[1] not in ("", "None", "null") else {}
origins = cors.get("AllowOrigins") or []
if sys.argv[2] not in origins:
    origins.append(sys.argv[2])
methods = sorted(set((cors.get("AllowMethods") or []) + ["POST", "OPTIONS"]))
headers = sorted(set(h.lower() for h in (cors.get("AllowHeaders") or []) + ["content-type"]))
# So the browser can read Retry-After on a 429. Without this the header is
# sent but the fetch response hides it, and the form has to guess.
expose = sorted(set(h.lower() for h in (cors.get("ExposeHeaders") or []) + ["retry-after"]))
print(f"AllowOrigins={','.join(origins)},AllowMethods={','.join(methods)},"
      f"AllowHeaders={','.join(headers)},ExposeHeaders={','.join(expose)},MaxAge=300")
PY
)"
aws apigatewayv2 update-api --api-id "$API_ID" --region "$REGION" \
  --cors-configuration "$CORS_ARGS" >/dev/null
ok "$CORS_ARGS"

# ------------------------------------------------------------- throttling
say "API Gateway throttling (best effort, not the real limiter)"
aws apigatewayv2 update-stage --api-id "$API_ID" --stage-name '$default' --region "$REGION" \
  --default-route-settings "ThrottlingRateLimit=${THROTTLE_RATE},ThrottlingBurstLimit=${THROTTLE_BURST}" \
  >/dev/null
ok "rate ${THROTTLE_RATE}/s, burst ${THROTTLE_BURST}, across the whole API"
ok "this is a blunt instrument shared by everyone; the DynamoDB limits are the strict ones"

say "Done"
ok "endpoint: https://${API_ID}.execute-api.${REGION}.amazonaws.com/franchise"
