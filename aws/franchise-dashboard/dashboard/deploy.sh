#!/usr/bin/env bash
#
# Deploy the franchise dashboard: the stack, then the web page.
# Safe to run again any time; it is also how page or API changes go out.
#
#   ./deploy.sh                          first time: served on a cloudfront.net address
#   DOMAIN=admin.atlwingspot.com CERT_ARN=arn:aws:acm:us-east-1:...:certificate/... ./deploy.sh
#                                        move it to the custom domain (see ../PLAN.md)
#   REQUIRE_MFA=ON ./deploy.sh           also ask for an authenticator-app code at login
#
# Each setting is remembered from the last deploy, so a plain ./deploy.sh later
# keeps the domain and MFA choice. DOMAIN= (empty) removes the custom domain.
#
# Needs: awscli v2, the SAM CLI and python3 (all in AWS CloudShell), in the same
# account and region as the archive stack (atl-franchise-archive).

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK="${STACK:-atl-franchise-dashboard}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
ok()  { printf '    %s\n' "$1"; }

for dep in aws sam python3; do
  command -v "$dep" >/dev/null 2>&1 || { echo "missing dependency: $dep" >&2; exit 1; }
done

previous() {
  local v
  v="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Parameters[?ParameterKey=='$1'].ParameterValue" --output text 2>/dev/null || true)"
  [[ "$v" == "None" ]] && v=""
  printf '%s' "$v"
}
output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

# ${VAR-…} (no colon): an explicitly empty DOMAIN= clears it; unset keeps it.
DOMAIN="${DOMAIN-$(previous DomainName)}"
CERT_ARN="${CERT_ARN-$(previous CertificateArn)}"
REQUIRE_MFA="${REQUIRE_MFA:-$(previous RequireMfa)}"
REQUIRE_MFA="${REQUIRE_MFA:-OFF}"
[[ -z "$DOMAIN" ]] && CERT_ARN=""

if [[ -n "$DOMAIN" && -z "$CERT_ARN" ]]; then
  echo "DOMAIN is set but CERT_ARN is not. See 'Custom domain' in ../PLAN.md." >&2
  exit 1
fi

say "Stack ${STACK} (${REGION})"
ok "domain:      ${DOMAIN:-(none, cloudfront.net address)}"
ok "require MFA: ${REQUIRE_MFA}"

OVERRIDES=("RequireMfa=${REQUIRE_MFA}")
[[ -n "$DOMAIN" ]] && OVERRIDES+=("DomainName=${DOMAIN}" "CertificateArn=${CERT_ARN}")

# No `sam build`: the API has no dependencies beyond boto3, which Lambda provides.
sam deploy \
  --template-file template.yaml \
  --stack-name "$STACK" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-fail-on-empty-changeset \
  --parameter-overrides "${OVERRIDES[@]}"

say "Uploading the page"
BUCKET="$(output WebBucketName)"
DIST="$(output DistributionId)"
CLIENT="$(output UserPoolClientId)"
URL="$(output DashboardUrl)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R web/. "$TMP/"
# The only per-deploy values the page needs. Neither is a secret: the app
# client id is sent with every sign-in and is visible to anyone using the page.
python3 - "$REGION" "$CLIENT" > "$TMP/config.js" <<'PY'
import json, sys
print("window.ATL_CONFIG = " + json.dumps({"region": sys.argv[1], "clientId": sys.argv[2]}) + ";")
PY

# no-cache: browsers and CloudFront re-check on every load, so a deploy is
# visible immediately. The files are tiny.
aws s3 sync "$TMP/" "s3://${BUCKET}/" --delete --region "$REGION" --cache-control "no-cache" >/dev/null
ok "uploaded to ${BUCKET}"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*' >/dev/null
ok "CloudFront cache cleared"

say "Done"
ok "dashboard: ${URL}"
if [[ -z "$DOMAIN" ]]; then
  ok "custom domain later: point a Cloudflare CNAME at $(output CloudFrontDomain) (see ../PLAN.md)"
fi
ok "create or reset the login with ./create-admin.sh"
