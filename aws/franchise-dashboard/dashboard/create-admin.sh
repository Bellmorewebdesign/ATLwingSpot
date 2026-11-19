#!/usr/bin/env bash
#
# Create the dashboard login, or set a new password on it.
#
#   ./create-admin.sh                    the ATLWingSpotAdmin login
#   ./create-admin.sh SomeoneElse        another login (usernames are case sensitive)
#
# The password is typed at a hidden prompt. It never goes into shell history
# or onto a command line where other processes could see it. It reaches the
# AWS CLI through a temporary file only you can read, deleted straight after.
# (AWS CLI v2 cannot read --cli-input-json from stdin.)
# Rules: at least 10 characters, at least one number.
#
# Re-running it for an existing login sets the new password and signs that
# login out everywhere, so it doubles as "reset password" and "lock out".

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK="${STACK:-atl-franchise-dashboard}"
USERNAME="${1:-ATLWingSpotAdmin}"

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text 2>/dev/null || true
}

POOL="$(output UserPoolId)"
if [[ -z "$POOL" || "$POOL" == "None" ]]; then
  echo "The dashboard stack is not deployed yet. Run ./deploy.sh first." >&2
  exit 1
fi

read -r -s -p "New password for ${USERNAME}: " PW; echo
read -r -s -p "Type it again: " PW2; echo
if [[ "$PW" != "$PW2" ]]; then
  echo "They don't match. Nothing was changed." >&2
  exit 1
fi
if (( ${#PW} < 10 )) || [[ ! "$PW" =~ [0-9] ]]; then
  echo "Use at least 10 characters, including a number. Nothing was changed." >&2
  exit 1
fi

EXISTS=0
if aws cognito-idp admin-get-user --user-pool-id "$POOL" --username "$USERNAME" \
     --region "$REGION" >/dev/null 2>&1; then
  EXISTS=1
else
  aws cognito-idp admin-create-user --user-pool-id "$POOL" --username "$USERNAME" \
    --message-action SUPPRESS --region "$REGION" >/dev/null
  echo "Created ${USERNAME}."
fi

# The password reaches the AWS CLI as JSON in a private temp file, not as an
# argument. umask 077 makes the directory and file readable by this user only.
REQ_DIR="$(umask 077; mktemp -d)"
trap 'rm -rf "$REQ_DIR"' EXIT
(
  umask 077
  POOL="$POOL" USERNAME="$USERNAME" PW="$PW" python3 -c '
import json, os
print(json.dumps({"UserPoolId": os.environ["POOL"], "Username": os.environ["USERNAME"],
                  "Password": os.environ["PW"], "Permanent": True}))
' > "$REQ_DIR/request.json"
)
unset PW PW2
aws cognito-idp admin-set-user-password --region "$REGION" --cli-input-json "file://$REQ_DIR/request.json"
rm -rf "$REQ_DIR"

if [[ "$EXISTS" -eq 1 ]]; then
  aws cognito-idp admin-user-global-sign-out --user-pool-id "$POOL" --username "$USERNAME" \
    --region "$REGION" >/dev/null
  echo "Password changed for ${USERNAME}, and every existing session was signed out."
else
  echo "Password set."
fi
echo "Sign in at: $(output DashboardUrl)"
