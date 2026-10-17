#!/bin/bash
set -euo pipefail

# usage: notify_slack.sh <message>
# env: SLACK_WEBHOOK - incoming webhook URL for the target channel; when the
#      secret is not configured (a fork), the notification is skipped with a
#      warning annotation instead of failing the job
#
# Message is passed through jq so quoting/newlines can't break the payload.

MESSAGE="${1:?usage: notify_slack.sh <message>}"

if [ -z "${SLACK_WEBHOOK:-}" ]; then
  echo "::warning::Skipping Slack notification: webhook secret not configured"
  exit 0
fi

jq -n --arg text "$MESSAGE" '{text: $text}' \
  | curl -sf -X POST -H 'Content-Type: application/json' -d @- "$SLACK_WEBHOOK"
