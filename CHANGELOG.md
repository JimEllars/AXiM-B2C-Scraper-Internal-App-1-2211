# Changelog

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
