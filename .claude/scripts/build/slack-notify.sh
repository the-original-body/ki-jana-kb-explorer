#!/usr/bin/env bash
# slack-notify.sh — Simple Slack webhook notification
#
# Usage: ./slack-notify.sh "message" [emoji]
#
# Requires: SLACK_WEBHOOK_URL environment variable

set -euo pipefail

MESSAGE="${1:-}"
EMOJI="${2:-🔔}"

if [[ -z "$MESSAGE" ]]; then
    echo "Usage: $0 \"message\" [emoji]"
    exit 1
fi

if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
    # Silent exit if no webhook configured
    exit 0
fi

# Send notification
curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\": \"$EMOJI $MESSAGE\"}" \
    > /dev/null 2>&1 || true
