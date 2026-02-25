#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
SESSION_NAME="${2:-ore-test-auth}"
TEST_AUTH_EMAIL="${TEST_AUTH_EMAIL:-agent-browser-test@localhost.localdomain}"
TEST_AUTH_PASSWORD="${TEST_AUTH_PASSWORD:-agent-browser-test-password}"
TEST_AUTH_NAME="${TEST_AUTH_NAME:-Agent Browser Test User}"

origin="$(printf '%s' "$BASE_URL" | sed -E 's#(https?://[^/]+).*#\1#')"
base_no_slash="${BASE_URL%/}"
tmpdir="$(mktemp -d)"
cookie_jar="$tmpdir/cookies.txt"

cleanup() {
	rm -rf "$tmpdir"
}
trap cleanup EXIT

signup_body="$(cat <<JSON
{"email":"$TEST_AUTH_EMAIL","password":"$TEST_AUTH_PASSWORD","name":"$TEST_AUTH_NAME"}
JSON
)"

signin_body="$(cat <<JSON
{"email":"$TEST_AUTH_EMAIL","password":"$TEST_AUTH_PASSWORD","rememberMe":true}
JSON
)"

# Best effort bootstrap: user may already exist.
curl -sS \
	-X POST \
	-H "content-type: application/json" \
	-H "origin: $origin" \
	--data "$signup_body" \
	"$base_no_slash/api/auth/sign-up/email" \
	> /dev/null || true

sign_in_status="$(
	curl -sS \
		-o "$tmpdir/signin-response.txt" \
		-w "%{http_code}" \
		-c "$cookie_jar" \
		-X POST \
		-H "content-type: application/json" \
		-H "origin: $origin" \
		--data "$signin_body" \
		"$base_no_slash/api/auth/sign-in/email"
)"

if [[ "$sign_in_status" != "200" ]]; then
	echo "Sign-in failed with status $sign_in_status. Ensure LOCAL_TEST_AUTH_ENABLED=true and dev server is running." >&2
	cat "$tmpdir/signin-response.txt" >&2
	exit 1
fi

session_token="$(
	awk '$6 == "better-auth.session_token" { print $7 }' "$cookie_jar" | tail -n 1
)"

if [[ -z "$session_token" ]]; then
	echo "Sign-in succeeded but no better-auth.session_token cookie was returned." >&2
	exit 1
fi

agent-browser --session "$SESSION_NAME" open "$base_no_slash/sign-in" > /dev/null
agent-browser --session "$SESSION_NAME" cookies set "better-auth.session_token" "$session_token" > /dev/null
agent-browser --session "$SESSION_NAME" open "$base_no_slash/" > /dev/null

echo "Agent Browser session '$SESSION_NAME' is authenticated at $base_no_slash"
