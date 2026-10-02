# Panel Demo Guide

This guide gives the panel a clear path through the Fleet Intelligence Platform. Use it with the explainer script; the screen directions below use the exact navigation names shown in the demo.

## Before the presentation

1. Start Docker Desktop and wait for the engine to report that it is running.
2. Start the local demo from the project folder with `bash scripts/start_demo.sh`, or use the already-running stack.
3. Open http://localhost:3000 and select **Continue to demo fleet** if the local demo sign-in screen appears.
4. Confirm the dashboard loads before recording. Use the values visible at the time of the presentation; simulator totals and locations change.
5. State clearly that the vehicle data is synthetic and fuel and emissions figures are estimates.

## Walkthrough order

### 1. Dashboard — the fleet summary

Select **Dashboard** in the left navigation. Show the vehicle totals, Healthy/Warning/Critical summary, fleet activity trend, and vehicle-status chart. Explain that this page answers what is happening across the fleet.

### 2. Fleet overview — health filters and map

Select **Fleet overview**. Show the **All**, **Healthy**, **Warning**, and **Critical** counts. Select one category and point out that the map and vehicle list are filtered to that health category.

The count is for the whole category. The map displays up to 100 matching vehicle locations per page; use **Next** and **Previous** to browse the results. The map markers use the selected health colors. The dashboard mini-map uses motion-status colors.

### 3. Vehicles — inspect a record and export

Select **Vehicles**. Search for a vehicle visible in the current data, open its record, and show its latest reported status and location. Use **Export CSV** above the vehicle table to download the visible vehicle rows.

### 4. Alerts — show why a vehicle needs attention

Select **Alerts**. Open an available alert and show its vehicle, severity, status, and rule context. Acknowledge it only if the button is available and the action succeeds. Use **Export CSV** to download the visible alert results.

A vehicle count and an alert count describe different things: one vehicle can have multiple alert records.

### 5. Analytics — show the historical trend

Select **Analytics**. Point to the date range and one populated chart or KPI. Distance, fuel, utilization, and emissions are estimates derived from synthetic telemetry. Analytics does not have an export button.

### 6. Reports — export the selected time range

Select **Reports**. Choose the time range if needed, then use **Export CSV** to download the hourly activity rows for that range.

### 7. Fuel Management — trigger and export a change

Select **Fuel Management** and press **Trigger refuelling** once. Show the updated fuel totals and recent purchase records, then use **Export CSV** beside the recent-refuelling table.

This action writes synthetic fuel transactions. It is not a real petrol purchase; costs use demo price assumptions, and CO₂ is estimated.

## Architecture visual

For the main architecture explanation, show **03 — Event Data Flow**: [docs/diagrams/03-event-data-flow.png](diagrams/03-event-data-flow.png). Trace it from left to right:

**Python simulator → Spring Boot API → Kafka → PostgreSQL and ClickHouse → dashboard / analytics**

Use **08 — Idle Alert Sequence** ([docs/diagrams/08-sequence-idle-alert.png](diagrams/08-sequence-idle-alert.png)) only if you want a second visual for the alert rule, acknowledgement, and resolution. The event-flow diagram is the main one to explain; the ER and deployment diagrams are not needed for this short product walkthrough.

## What the measurements do and do not show

The bounded local smoke test ran short stages at 2, 5, and 10 test events per second. All 136 of 136 test events were accepted and persisted. At 10 events per second, API-to-Kafka acknowledgement latency measured p95 40.49 ms and p99 43.91 ms; observed-event-to-PostgreSQL persistence measured p95 49.53 ms.

These are small local smoke-test results, not target-scale performance results. The test did not verify 100,000 events per second, the 3x burst, dashboard freshness, critical-alert latency, failure recovery, or 99.9% availability. The target-scale test was not attempted because the local laptop/Compose stack was not sized or isolated for that benchmark. Do not say that the system failed the target; the target remains unverified.

Evidence: [bounded ingest smoke test](../evidences/2026-10-02/bounded-ingest-smoke-test.md) and [API latency smoke check](../evidences/2026-10-02/api-latency-smoke-check.md).
