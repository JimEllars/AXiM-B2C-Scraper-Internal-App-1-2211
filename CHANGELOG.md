# Changelog

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
