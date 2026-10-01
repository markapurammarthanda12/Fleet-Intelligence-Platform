# Fleet Intelligence Platform diagrams

The architecture and data diagrams are editable on the [tldraw board](https://www.tldraw.com/f/xqQin5G17zVwYYik65jLI).

The set contains:

1. C4 system context
2. C4 containers for the current local runtime
3. Telemetry event flow with latency marked TBD until measured
4. Tenant and vehicle ER / ownership model after migration V6
5. Current Docker Compose deployment beside a future high-availability reference
6. Service layers and intended dependency direction
7. Ingest sequence with duplicate, broker failure, retry, and dead-letter flow
8. Idle-alert, acknowledgement, and resolution sequence

The diagrams are embedded in the landscape Appendix A of [Fleet_Intelligence_Solution_Document_DRAFT.docx](Fleet_Intelligence_Solution_Document_DRAFT.docx). The current deployment is distinguished from future reference components. Performance targets remain unmeasured.
