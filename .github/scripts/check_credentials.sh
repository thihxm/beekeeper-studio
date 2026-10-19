#!/bin/bash
set -euo pipefail

# usage: check_credentials.sh <what needs them> <ENV_NAME>...
# env: each ENV_NAME, mapped from the secret of the same name
#
# Writes available=true to $GITHUB_OUTPUT when every named secret is set, and
# available=false with a warning annotation when none of them are (a fork
# without that account), so the steps that need them are skipped visibly.
# A partial set is a misconfiguration and fails the step.

PURPOSE="${1:?usage: check_credentials.sh <what needs them> <ENV_NAME>...}"
shift

missing=()
for name in "$@"; do
  if [ -z "${!name:-}" ]; then
    missing+=("$name")
  fi
done

if [ "${#missing[@]}" -eq 0 ]; then
  echo "available=true" >> "$GITHUB_OUTPUT"
elif [ "${#missing[@]}" -eq "$#" ]; then
  echo "::warning::Skipping $PURPOSE: secrets not configured in $GITHUB_REPOSITORY (${missing[*]})"
  echo "available=false" >> "$GITHUB_OUTPUT"
else
  echo "::error::$PURPOSE is partially configured; missing secrets: ${missing[*]}"
  exit 1
fi
