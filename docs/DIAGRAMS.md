# Fleet Intelligence Platform diagrams

The architecture and data diagrams are drawn as editable shapes on the tldraw board:

[Open Fleet Intelligence Platform — Hackathon Architecture & Data Diagrams](https://www.tldraw.com/f/xqQin5G17zVwYYik65jLI)

Pages included:

1. C4 system context
2. C4 containers for the current local runtime
3. Telemetry event flow with latency marked TBD until measured
4. Tenant and vehicle ER / ownership model after migration V6
5. Current Docker Compose deployment beside a clearly marked future HA reference
6. Service layers and intended dependency direction
7. Ingest sequence with duplicate, broker failure, retry, and dead-letter flow
8. Idle-alert, acknowledgement, and resolution sequence

The diagram PNGs are embedded in the landscape Appendix A of `Fleet_Intelligence_Solution_Document_DRAFT.docx`. Future integrations and HA components are labeled as planned, not deployed. Latency labels remain unmeasured.