#!/usr/bin/env bash

# Simple helper script to trigger the stream processing cron route locally.
# Usage: ./public/script/trigger-stream-cron.sh

set -euo pipefail

CRON_SECRET="d9f3c3f2a9e45b6db5ab73f40465892d6dd9200bb85c65e6f263a9c4a3fda233"

curl -X GET "http://localhost:3000/api/cron/process/stream" \
  -H "Authorization: Bearer ${CRON_SECRET}"

