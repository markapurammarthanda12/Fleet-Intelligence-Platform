# Fleet Intelligence Platform — Project Brief

## Product choice

Turn connected-vehicle data into trustworthy, explainable fleet decisions. The platform covers fleet activity, vehicles, trips, operational alerts, maintenance signals, utilisation, and operating costs. The first user is a fleet operations manager who needs a reliable view of activity and timely ways to act. Prolonged idling with an explainable fuel estimate is the first vertical slice to demonstrate the system end to end; it is an example capability, not the product definition.

## Problem hypothesis

Fleet managers need to bring vehicle status, movement, maintenance signals, and operating costs into one actionable view. Location and engine signals may arrive from different OEM formats or only in delayed reports. The first measurable hypothesis is that surfacing idle episodes with estimated fuel cost reduces avoidable idle time.

This is a hypothesis, not yet validated by customer interviews or operational data. All initial records are synthetic.

## MVP user journey

1. A synthetic connected-vehicle event for a tenant and vehicle reaches the ingestion API.
2. The service validates its timestamp, coordinates, speed, and event identity.
3. A rule identifies sustained stationary engine-on activity.
4. The platform exposes an explainable alert with idle duration and an estimated fuel amount.
5. The operations dashboard lets an operator compare vehicles, investigate, acknowledge, and export alerts; subsequent workflows can use the same event foundation for maintenance, utilisation, safety, and cost decisions.

## Initial success measures

| Measure | Initial target | Evidence needed |
|---|---:|---|
| Simulator fleet size | 100,000 vehicle IDs | Generated dataset metadata |
| Event acceptance | No malformed accepted events | Contract and integration evidence |
| Duplicate behavior | Repeated event ID does not create a second alert | Idempotency scenario |
| Alert freshness | Under 5 seconds in a measured end-to-end run | Load test with timestamps |
| Estimated waste | Explainable and configurable | Rule documentation and sensitivity analysis |

Targets are project goals; they are not measured results yet.

## Assumptions and risks

- Synthetic location coordinates are generated around Bengaluru and do not represent real vehicles.
- Fuel burn during idling varies by vehicle and conditions. The default 1.5 litres/hour is an illustrative assumption.
- A single event cannot establish an idle duration. The current local MVP estimates duration from consecutive events and is not a production stream processor.
- Driver-level attribution is out of scope until privacy, consent, and access requirements are defined.

## Boundary

The supplied Fleet Management project context has no synced reference files in `sources/` at present, so this initial scope is based on the project name and the attached hackathon brief. The hackathon statement's 100,000 events/second, multi-cloud deployment, security, polyglot persistence, user interface, and full testing requirements remain acceptance goals for later milestones. The present scaffold is an executable starting point, not a claim of satisfying those goals.
