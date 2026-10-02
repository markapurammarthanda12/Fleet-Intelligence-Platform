# Fleet Intelligence Platform — Explainer Video Script

**Presenter:** Marthanda  
**Target length:** 8–9 minutes  
**Recording style:** Speak to camera for the opening and close; use screen recording for the product walkthrough.

**Important:** Vehicle data is synthetic. Fuel and emissions values are estimates. The local ingest test was small; do not present it as proof of the 100,000-events-per-second target.

## 0:00–0:45 — Open with a question

**[ON SCREEN]** Start on **Dashboard**. Look at the camera before switching attention to the screen.

**[SAY]**

“Hello, I’m Marthanda.

Imagine you’re responsible for one hundred thousand vehicles. At this moment, one vehicle may need attention. How would you find it—and know why it matters?

Vehicles generate a constant stream of signals. The hard part is turning those signals into a clear reason to act. That is the problem our project explores.

I’ll follow one example through the product—from the fleet summary, to a vehicle and its alert, and then to the data behind the decision.”

## 0:45–1:30 — Dashboard: the fleet summary

**[ON SCREEN]** Stay on **Dashboard**. Point to the vehicle totals, health summary, and one chart.

**[SAY]**

“This is the Dashboard. It gives the manager a quick summary of fleet health and recent activity.

These totals come from synthetic data flowing through our demo. The page answers, ‘What is happening across the fleet?’ To investigate locations and filter vehicles by health, I’ll open the separate Fleet overview page.”

**[TRANSITION]** Select **Fleet overview** in the left navigation.

## 1:30–2:15 — Fleet overview: filter the map

**[ON SCREEN]** Point to **All**, **Healthy**, **Warning**, and **Critical**. Select one category and show the matching markers and vehicle list. Use **Next** once if time allows.

**[SAY]**

“Fleet overview is the map page. These tabs show the full count in each health category, while the map and list display matching locations in pages of up to one hundred vehicles.

I’ll select Critical. The map markers and list now match that health category. I can browse more matching locations with the page controls.

Now I’ll open a vehicle record and see what the system knows about one vehicle.”

**[TRANSITION]** Select **Vehicles**.

## 2:15–2:55 — Vehicles: inspect and export a record

**[ON SCREEN]** Search for a vehicle visible in the current data. Open its details and point to its status, coordinates, or recent events. Point to **Export CSV**.

**[SAY]**

“On Vehicles, I can search for a vehicle and inspect its latest status and reported location.

I can also export the visible vehicle rows as a CSV for follow-up.

Next, I’ll follow the same operational story to the alert that explains why a vehicle needs attention.”

**[TRANSITION]** Select **Alerts**.

## 2:55–3:55 — Alerts: show the reason to act

**[ON SCREEN]** Open an alert visible in the current data. Point to its vehicle, severity, status, and reason. Point to **Export CSV**. Acknowledge the alert only if the action is available and succeeds.

**[SAY]**

“Here in Alerts, the manager can review the vehicle, its severity and status, and the reason the alert was raised.

The reason matters. An alert should help answer, ‘Why this vehicle?’ so an operator can decide what to do next, rather than just adding another notification.

I can export the visible alert results as a CSV. Where this demo supports it, an operator can acknowledge an alert. A later movement event can resolve an idle-alert episode.

We’ve seen the current operational picture. Next, I’ll look at how activity changes over time.”

**[TRANSITION]** Select **Analytics**.

## 3:55–4:35 — Analytics: see activity over time

**[ON SCREEN]** Show a populated Analytics chart or summary. Point to its time range and one trend.

**[SAY]**

“Analytics answers a different question: ‘What has been happening over time?’

Here, the manager can review historical activity instead of focusing on one vehicle or one alert. Distance, fuel, utilization, and emissions figures in this demo are estimates derived from synthetic telemetry.

For a downloadable time-range report, I’ll use the separate Reports page.”

**[TRANSITION]** Select **Reports**. Point to the time-range controls and **Export CSV**.

**[SAY]**

“On Reports, I can choose a time range and export the hourly activity rows as a CSV.”

## 4:35–5:20 — Fuel Management: trigger an update

**[ON SCREEN]** Select **Fuel Management**. Trigger refuelling once, wait for the values to update, and point to **Export CSV** beside Recent refuelling.

**[SAY]**

“The project also demonstrates a synthetic refuelling update. I’ll trigger it once and show how the fuel totals change.

This is not a real petrol purchase. Fuel and emissions values are estimates. The trigger demonstrates an operational event changing the data and the dashboard reflecting that update.

I can also export the visible refuelling records as a CSV.”

**[TRANSITION]** Open **03 — Event Data Flow** at docs/diagrams/03-event-data-flow.png.

## 5:20–6:30 — Explain the architecture

**[ON SCREEN]** Show **03 — Event Data Flow** full screen. Trace left to right: simulator → API → Kafka → consumers and databases → dashboard and analytics.

**[SAY]**

“This is the Event Data Flow diagram. It shows how a vehicle event travels through the system.

The Python simulator creates a synthetic vehicle event and sends it to the Spring Boot API. The API validates the event and publishes it to Kafka. It returns an acknowledgement after Kafka confirms receipt.

Consumers update PostgreSQL with operational vehicle state and alert information. A separate path sends telemetry to ClickHouse for historical analytics. The React dashboard reads from the APIs to show the fleet and its history.

So, in simple terms: the simulator creates the signal, the API checks it, Kafka carries it, the databases store different views of it, and the dashboard makes it useful to a fleet manager.

This demo runs locally with Docker Compose. Kafka and the databases are single-node services in this setup, so this diagram does not prove high availability.”

**[OPTIONAL ON SCREEN]** If time allows, show **08 — Idle Alert Sequence** at docs/diagrams/08-sequence-idle-alert.png for the alert, acknowledgement, and resolution flow.

## 6:30–7:05 — Explain the decision logic

**[ON SCREEN]** Return to the alert in the product or show the optional idle-alert sequence diagram.

**[SAY]**

“The alert workflow uses deterministic, threshold-based rules. For example, stationary vehicle events can lead to an idle alert when configured conditions are met. A later movement event can resolve that alert episode.

There isn’t a trained machine-learning model making these decisions in the running product. We chose explainable rules so we can show how an event leads to an alert.”

## 7:05–7:55 — Share the measurements accurately

**[ON SCREEN]** Show evidences/2026-10-02/bounded-ingest-smoke-test.md or its results in the solution document.

**[SAY]**

“We also ran a small local ingestion smoke test at 2, 5, and 10 events per second. Across those test stages, all 136 of 136 test events were accepted and persisted.

At the 10-events-per-second stage, API acknowledgement latency measured about 40 milliseconds at p95 and 44 milliseconds at p99. Event-to-PostgreSQL persistence measured about 50 milliseconds at p95.

These results describe a small local test. They do not show that the system can process one hundred thousand events per second, and they don’t measure dashboard freshness or critical-alert delivery time.”

## 7:55–8:45 — Close with the next question

**[ON SCREEN]** Return to **Dashboard**. Look at the camera for the final lines.

**[SAY]**

“The target in the case study is at least one hundred thousand events per second. Our test reached 10 events per second. We haven’t yet tested the 100,000-events-per-second target because our local setup wasn’t sized for that benchmark.

Failure recovery and 99.9 percent availability also remain unverified. A large generated fleet is not proof of scale; the next step is a properly sized, multi-node test and deployment.

To summarize, this prototype demonstrates how synthetic vehicle telemetry can become current fleet status, an explainable alert, and historical analytics. We’ve measured a small local workload and shown where more evidence is needed.

I’ll close with the question I started with: when the event rate grows by four orders of magnitude, where should we prove the system first—the broker, the database, or the decision the fleet manager sees?

Thank you.”

## Quick recording checklist

- Keep the recording under 10 minutes.
- Follow this page order: Dashboard → Fleet overview → Vehicles → Alerts → Analytics → Reports → Fuel Management → Event Data Flow diagram → measurements → Dashboard.
- Mention CSV export on Vehicles, Alerts, Reports, and Fuel Management. Analytics itself has no export button.
- Trigger the synthetic refuelling update once.
- Use current vehicle IDs and values; call vehicle data synthetic and fuel/emissions estimates.
- Describe 2/5/10 events per second only as a small local smoke test.
- Do not claim the 100K events/second, burst, end-to-end timing, recovery, or availability targets are achieved.
