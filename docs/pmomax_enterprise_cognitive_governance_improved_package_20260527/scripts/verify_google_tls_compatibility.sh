#!/usr/bin/env bash
set -u

STATUS=0

check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    STATUS=1
  fi
}

check_command openssl
check_command curl

if [ "$STATUS" -ne 0 ]; then
  exit "$STATUS"
fi

echo "OpenSSL version:"
openssl version -a | sed -n '1,4p'
echo

check_host() {
  host="$1"
  echo "=== TLS check: ${host} ==="

  output="$(printf '' | openssl s_client -connect "${host}:443" -servername "${host}" -showcerts </dev/null 2>&1)"
  rc=$?

  if [ "$rc" -ne 0 ]; then
    echo "ERROR: openssl handshake failed for ${host}" >&2
    echo "$output" | tail -40 >&2
    STATUS=1
  else
    echo "$output" | awk '
      /Protocol  :/ { print }
      /Cipher    :/ { print }
      /Verify return code:/ { print }
      /issuer=/ && issuer_printed != 1 { print; issuer_printed=1 }
      /subject=/ && subject_printed != 1 { print; subject_printed=1 }
    '
    if ! echo "$output" | grep -q "Verify return code: 0"; then
      echo "ERROR: certificate verification did not return code 0 for ${host}" >&2
      STATUS=1
    fi
  fi

  echo
  echo "curl fallback:"
  if ! curl -Iv --connect-timeout 15 "https://${host}" >/dev/null 2>"${TMPDIR:-/tmp}/tls-curl-${host}.log"; then
    echo "ERROR: curl TLS connection failed for ${host}" >&2
    tail -40 "${TMPDIR:-/tmp}/tls-curl-${host}.log" >&2
    STATUS=1
  else
    grep -E "SSL connection|TLS|issuer:|subject:|SSL certificate verify ok|server certificate" "${TMPDIR:-/tmp}/tls-curl-${host}.log" | sed 's/^[*] //'
  fi
  rm -f "${TMPDIR:-/tmp}/tls-curl-${host}.log"
  echo
}

check_host googleapis.com
check_host pki.goog
check_host servicecontrol.googleapis.com

if [ "$STATUS" -eq 0 ]; then
  echo "PASS: TLS handshakes completed with default trust store."
else
  echo "FAIL: one or more TLS compatibility checks failed." >&2
fi

exit "$STATUS"
