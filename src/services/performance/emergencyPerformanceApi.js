import { mockDirectData } from "../mock/mockApi";

const DEFAULT_RANGE = "7d";

function sanitizeRange(range) {
  return ["24h", "7d", "30d"].includes(range) ? range : DEFAULT_RANGE;
}

async function emergencyPerformanceRequest(path, range = DEFAULT_RANGE) {
  return mockDirectData(`${path}?range=${encodeURIComponent(sanitizeRange(range))}`);
}

export function getPerformanceResponseTimeTrend(range) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/response-time-trend",
    range,
  );
}

export function getPerformanceSlaCompliance(range) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/sla-compliance",
    range,
  );
}

export function getPerformanceSeverityBreakdown(range) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/severity-breakdown",
    range,
  );
}

export function getPerformanceOutcomes(range) {
  return emergencyPerformanceRequest("/api/emergency/performance/outcomes", range);
}

export function getPerformanceDelayBottlenecks(range) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/delay-bottlenecks",
    range,
  );
}
