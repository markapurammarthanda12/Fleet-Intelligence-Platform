#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TENANT_ID="tenant-demo"
VEHICLE_ID="vehicle-demo-$(uuidgen | tr '[:upper:]' '[:lower:]')"
FIRST_EVENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
SECOND_EVENT_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"
if date -u -v-6M '+%Y-%m-%dT%H:%M:%SZ' >/dev/null 2>&1; then
  FIRST_OBSERVED_AT="$(date -u -v-6M '+%Y-%m-%dT%H:%M:%SZ')"
else
  FIRST_OBSERVED_AT="$(date -u -d '6 minutes ago' '+%Y-%m-%dT%H:%M:%SZ')"
fi
SECOND_OBSERVED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

post_stationary_event() {
  local event_id="$1"
  local observed_at="$2"
  local sequence="$3"

  curl --fail --silent --show-error \
    --request POST "${API_BASE_URL}/v1/telemetry" \
    --header 'Content-Type: application/json' \
    --data "{\"event_id\":\"${event_id}\",\"tenant_id\":\"${TENANT_ID}\",\"vehicle_id\":\"${VEHICLE_ID}\",\"observed_at\":\"${observed_at}\",\"latitude\":12.9716,\"longitude\":77.5946,\"speed_kmh\":0,\"engine_on\":true,\"sequence\":${sequence}}"
  printf '\n'
}

printf 'Sending two synthetic stationary events for %s...\n' "$VEHICLE_ID"
post_stationary_event "$FIRST_EVENT_ID" "$FIRST_OBSERVED_AT" 1
post_stationary_event "$SECOND_EVENT_ID" "$SECOND_OBSERVED_AT" 2

printf '\nAlerts for %s:\n' "$TENANT_ID"
for attempt in {1..40}; do
  if ALERTS="$(curl --fail --silent --show-error "${API_BASE_URL}/v1/alerts?tenant_id=${TENANT_ID}")"; then
    if [[ "$ALERTS" == *"$VEHICLE_ID"* ]]; then
      printf '%s' "$ALERTS"
      break
    fi
  fi
  if [[ "$attempt" == 40 ]]; then
    printf 'The telemetry was accepted, but the alert was not visible after 10 seconds. Check the API and Kafka consumer logs.\n' >&2
    exit 1
  fi
  sleep 0.25
done
printf '\n\nIn the dashboard, set Fleet / tenant to %s.\n' "$TENANT_ID"
