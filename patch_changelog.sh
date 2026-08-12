#!/bin/bash
cat << 'INNER_EOF' > CHANGELOG.md
# Changelog

## [2.5.0]
### Added
- **Worker KV Endpoint Handlers**: Implemented GET, POST, PUT, and DELETE route handlers for \`/api/data\`, \`/api/enrichment\`, \`/api/proxies\`, and \`/api/settings\` in the Cloudflare Worker. They persist directly to KV mapping endpoints to \`EXTRACTED_DATA\`, \`ENRICHMENT_LOGS\`, \`PROXY_POOLS\`, and \`NODE_SETTINGS\`.
- **Frontend Service Fallback Resilience**: Updated \`dataService.js\`, \`enrichmentService.js\`, \`proxyService.js\`, and \`settingsService.js\` to capture and swallow network errors/404s, returning empty baselines so components avoid crashes during cold starts or empty stores.
- **Data Explorer Polish**: Added real-time filtering for name/email/phone across raw extracted payloads. Introduced a JSON preview modal and built-in "Export CSV" and "Export JSON" batch actions.
- **Proxy Manager Interaction**: Wired Proxy Manager form submissions to persist in KV via \`proxyService.create\` and integrated instant notification toasts on successful connections or failures.

## [2.4.0]
### Added
- **Network Map Live Node Binding**: Wired `NetworkMap.jsx` active proxy nodes and regional latency rings directly to live telemetry data. Calculates real-time node uptime and health badges from active proxy telemetry events. Provided smooth SVG fallback pulses during initial edge worker telemetry handshakes.
- **Live Batch History & Audit Log Integration**: Updated `BatchHistory.jsx` and `AuditLog.jsx` to render real-time execution batches and audit trails directly from the edge KV stream using `batchService.js` and `auditService.js`. Added instant search and date-range filtering across active audit logs and batches without triggering full view re-renders.
- **Tactical Queue Priority Trigger**: Added a "Promote to Top / Run Immediate" action button to items in `QueueManager.jsx`. Triggers immediate payload dispatch to `/api/onyx-trigger` with visual toast feedback and explicit button spinner states. Added visual "HIGH PRIORITY" badge support.

## [2.3.0]
### Added
- **Health Monitor Live Data Binding**: Wired `HealthMonitor.jsx` metrics directly to the incoming telemetry stream data. Added real-time average latency calculations and visual fallback indicators during initial handshakes.
- **Active Cognitive LLM Parser Execution**: Fully connected `cognitiveExtractWithOnyx(rawBlob)` into the primary scraping execution pipeline in `worker/src/services/scraperApi.js`. Output payloads strictly normalized to `{ first_name, last_name, phone, email, type: 'B2C_CONSUMER' }`.
- **Telemetry Stream State Preservation**: User-selected log level filters, auto-scroll locks, and pause states now persist across tab navigation using `sessionStorage`. Buffer limits increased to 1,000 entries for `TelemetryStream.jsx` to handle larger stream volumes.


## [2.2.0]
### Added
- **Health Monitor Live Data Binding**: Wired `HealthMonitor.jsx` metrics directly to the incoming telemetry stream data. Added real-time average latency calculations and visual fallback indicators during initial handshakes.
- **UI Action Feedback**: Attached immediate toast notifications to user queue actions across `QueueManager.jsx` and `TargetManager.jsx`. Added explicit busy/spinner states on buttons during pending API fetches.
- **Cognitive Fallback Schema Enforcer**: Enforced strict JSON output validation prior to calling egress. If raw DOM extraction yields incomplete fields, it automatically invokes Onyx cognitive parsing for structured extraction fallback.

## [2.1.0]
### Added
- **Telemetry Stream Hardening**: Implemented an auto-reconnecting stream wrapper with exponential backoff for telemetry events. Added a configurable buffer cap (500 records max) to the UI stream state to prevent memory bloat, and added proper filtering by Level and Source.
- **Egress Resilience**: Added a default request timeout (15,000ms) and retry strategy (max 3 attempts with exponential backoff and jitter) for egress HTTP dispatches in `egress.js`.
- **Scraper Resilience**: Enhanced failed queue job processing to emit structured telemetry events containing job ID, target domain, and precise HTTP status/failure reason in `worker/src/index.js` and `scraperApi.js`.
- **UI Micro-Interactions**: Integrated explicit loading/busy states on "Run Scraping Job" / "Retry Failed" and "Purge Completed" controls in `QueueManager.jsx`.
- **Action Feedback**: Added `NotificationTray.jsx` immediate notification tray toasts upon job queue updates or target additions in `TargetManager.jsx` and `QueueManager.jsx`.
- Preserved UI table layout and filters on view switching and background data refreshes seamlessly without breaking layouts.



## [1.3.0] - Increment 1.3
### Added
- **Telemetry Stream Activation**: Upgraded `telemetryService.js` for immediate local state append and refined `TelemetryStream.jsx` to ensure auto-scroll, severity filtering, and buffer clearing without outer layout re-renders.
- **Cloudflare Edge Scraper Resilience**: Enhanced `worker/src/services/scraperApi.js` to trap non-200 responses, formatting standardized error JSON buffers, and reporting metrics via Telemetry.
- **Egress Resilience**: Updated `worker/src/services/egress.js` with telemetry logging for its exponential backoff logic on outgoing scraper requests.
- **AXiM Core Payload Normalization**: Added a `normalizePayload` transformer function in `dataService.js` that maps scraped raw B2C lead fields to the standard AXiM unified schema.
- **UI Visual Polish**: Added a live-status pulse indicator in `Sidebar.jsx` for "Edge Worker Active" and refined hover transitions and metric badge contrasts on `StatCard.jsx`.

## [Unreleased]
### Added
- Implemented `/api/telemetry` GET and POST endpoints in the Cloudflare Worker to serve as a telemetry metrics proxy and buffer.
- Telemetry endpoint utilizes KV (`B2C_SCRAPER_STATE`) using rotating daily keys (`telemetry:YYYY-MM-DD`).
- Integrated real-time edge telemetry polling and simulation fallbacks into the `telemetryService`.
- Added clear indicators for "LIVE EDGE" and "LOCAL DEMO" operating modes in the `TelemetryStream` component.
- Added auto-scroll locking and a Clear Logs function to the `TelemetryStream`.

### Changed
- Attached the standardized system identification header `X-AXiM-Source: AXiM-B2C-Scraper` to egress utility transmissions.
- Standardized frontend payload logging fields: `timestamp`, `level`, `module`, `message`, `traceId`.
- Health Monitor component now uses relative latency interpolation calculated off the live check pings.
INNER_EOF
