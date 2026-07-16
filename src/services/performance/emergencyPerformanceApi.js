import { gatewayUrl, hospitalIdentity } from "../emergency/emergencyRealtimeApi";
import { isMockMode, mockGatewayRequest } from "../mockApi";

const DEFAULT_RANGE = "7d";

function sanitizeRange(range) {
  return ["24h", "7d", "30d"].includes(range) ? range : DEFAULT_RANGE;
}

async function emergencyPerformanceRequest(path, range = DEFAULT_RANGE, options = {}) {
  if (isMockMode) {
    return mockGatewayRequest(`${path}?range=${encodeURIComponent(sanitizeRange(range))}`, options);
  }

  let response;
  const safeRange = sanitizeRange(range);
  const { headers, signal, ...fetchOptions } = options;

  try {
    response = await fetch(`${gatewayUrl}${path}?range=${encodeURIComponent(safeRange)}`, {
      ...fetchOptions,
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-elly-id": hospitalIdentity.ellyId,
        "x-elly-partner-id": hospitalIdentity.partnerId,
        "x-elly-role": hospitalIdentity.role,
        ...(headers || {}),
      },
    });
  } catch {
    throw new Error(
      `Cannot reach API Gateway at ${gatewayUrl}. Make sure the gateway is running.`,
    );
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body.message || `Emergency performance request failed with status ${response.status}`,
    );
  }

  return body.data;
}

export function getPerformanceResponseTimeTrend(range, options) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/response-time-trend",
    range,
    options,
  );
}

export function getPerformanceSlaCompliance(range, options) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/sla-compliance",
    range,
    options,
  );
}

export function getPerformanceSeverityBreakdown(range, options) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/severity-breakdown",
    range,
    options,
  );
}

export function getPerformanceOutcomes(range, options) {
  return emergencyPerformanceRequest("/api/emergency/performance/outcomes", range, options);
}

export function getPerformanceDelayBottlenecks(range, options) {
  return emergencyPerformanceRequest(
    "/api/emergency/performance/delay-bottlenecks",
    range,
    options,
  );
}
