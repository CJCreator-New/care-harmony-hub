#!/usr/bin/env bash
# Render the Kong declarative config template (kong.yml) with secrets from the
# environment (S0-11 / SECF-19). Values are never printed.
#
# Usage:
#   KONG_FRONTEND_API_KEY=... KONG_MOBILE_API_KEY=... KONG_ADMIN_API_KEY=... LOGGLY_TOKEN=... \
#     scripts/render-kong-config.sh [template] [output]
#   defaults: template=kong.yml  output=kong.rendered.yml (untracked)
#   output "-" writes to stdout (used by scripts/init-kong.sh).
#
# Generate keys with e.g.:  openssl rand -base64 32 | tr -d '/+=' | cut -c1-40

set -euo pipefail

TEMPLATE="${1:-kong.yml}"
OUTPUT="${2:-kong.rendered.yml}"
VARS=(KONG_FRONTEND_API_KEY KONG_MOBILE_API_KEY KONG_ADMIN_API_KEY LOGGLY_TOKEN)

[ -f "$TEMPLATE" ] || { echo "Template not found: $TEMPLATE" >&2; exit 1; }

missing=()
for v in "${VARS[@]}"; do
  val="${!v:-}"
  if [ -z "$val" ]; then
    missing+=("$v")
  elif [ "${#val}" -lt 24 ] && [ "$v" != "LOGGLY_TOKEN" ]; then
    echo "$v is shorter than 24 characters; use a random value." >&2
    exit 1
  elif [[ "$val" == *'${'* || "$val" == *'"'* || "$val" == *$'\n'* ]]; then
    echo "$v contains characters that cannot be placed in the YAML template." >&2
    exit 1
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Missing required variables: ${missing[*]}" >&2
  exit 1
fi

content="$(cat "$TEMPLATE")"
for v in "${VARS[@]}"; do
  placeholder="\${$v}"
  content="${content//"$placeholder"/"${!v}"}"
done

# Fail if any ${...} placeholder in a value position is left unrendered.
if printf '%s\n' "$content" | grep -vE '^\s*#' | grep -qE '\$\{[A-Z_]+\}'; then
  echo "Unrendered placeholders remain in $TEMPLATE." >&2
  exit 1
fi

if [ "$OUTPUT" = "-" ]; then
  printf '%s\n' "$content"
else
  umask 077
  printf '%s\n' "$content" > "$OUTPUT"
  echo "Rendered $TEMPLATE -> $OUTPUT (mode 600). Do not commit it."
fi
