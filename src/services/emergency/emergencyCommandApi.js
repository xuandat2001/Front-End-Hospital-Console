import { gatewayUrl, hospitalIdentity } from "./emergencyRealtimeApi";
import { isMockMode, mockGatewayRequest } from "../mockApi";

const identityHeaders = {
  "Content-Type": "application/json",
  "x-elly-id": hospitalIdentity.ellyId,
  "x-elly-partner-id": hospitalIdentity.partnerId,
  "x-elly-role": hospitalIdentity.role,
};

async function commandRequest(path, options = {}) {
  if (isMockMode) {
    return mockGatewayRequest(path, options);
  }

  let response;
  const { headers, signal, ...fetchOptions } = options;

  try {
    response = await fetch(`${gatewayUrl}${path}`, {
      ...fetchOptions,
      signal,
      headers: {
        ...identityHeaders,
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
      body.message || `Emergency command request failed with status ${response.status}`,
    );
  }

  return body.data;
}

async function exportRequest(path) {
  if (isMockMode) {
    return {
      blob: new Blob([`Mock emergency export for ${path}`], {
        type: "text/plain",
      }),
      filename: "mock-emergency-report.txt",
      contentType: "text/plain",
    };
  }

  let response;

  try {
    response = await fetch(`${gatewayUrl}${path}`, {
      headers: identityHeaders,
    });
  } catch {
    throw new Error(
      `Cannot reach API Gateway at ${gatewayUrl}. Make sure the gateway is running.`,
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Export failed with status ${response.status}`);
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] || "emergency-report",
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getPlanningVolumeForecast(hours = 24, options) {
  return commandRequest(`/api/emergency/planning/volume-forecast${query({ hours })}`, options);
}

export function getPlanningCapacityForecast(hours = 24, options) {
  return commandRequest(`/api/emergency/planning/capacity-forecast${query({ hours })}`, options);
}

export function getPlanningStaffingGap(hours = 12, options) {
  return commandRequest(`/api/emergency/planning/staffing-gap${query({ hours })}`, options);
}

export function getPlanningAmbulanceDemand(hours = 12, options) {
  return commandRequest(`/api/emergency/planning/ambulance-demand${query({ hours })}`, options);
}

export function getPlanningRecommendations(options) {
  return commandRequest("/api/emergency/planning/recommendations", options);
}

export function getEmergencyAmbulances(options) {
  return commandRequest("/api/emergency/resources/ambulances", options);
}

export function getEmergencyBeds(options) {
  return commandRequest("/api/emergency/resources/beds", options);
}

export function getEmergencyStaff(options) {
  return commandRequest("/api/emergency/resources/staff", options);
}

export function getEmergencyEquipment(options) {
  return commandRequest("/api/emergency/resources/equipment", options);
}

export function getEmergencyResourceBottlenecks(options) {
  return commandRequest("/api/emergency/resources/bottlenecks", options);
}

export function getDailyEmergencySummary(date, options) {
  return commandRequest(`/api/emergency/reports/daily-summary${query({ date })}`, options);
}

export function getEmergencyCaseAudit(params, options) {
  return commandRequest(`/api/emergency/reports/case-audit${query(params)}`, options);
}

export function getSlaComplianceReport(from, to, options) {
  return commandRequest(`/api/emergency/reports/sla${query({ from, to })}`, options);
}

export function getDelayRootCauseReport(from, to, options) {
  return commandRequest(`/api/emergency/reports/delay-root-causes${query({ from, to })}`, options);
}

export function exportDailySummary(date) {
  return exportRequest(`/api/emergency/reports/export/daily-summary${query({ date, type: "pdf" })}`);
}

export function exportSlaReport(from, to) {
  return exportRequest(`/api/emergency/reports/export/sla${query({ from, to, type: "csv" })}`);
}

export function exportCaseAudit(caseId) {
  return exportRequest(`/api/emergency/reports/export/case-audit${query({ caseId, type: "csv" })}`);
}

export function exportDelayRootCauses(from, to) {
  return exportRequest(
    `/api/emergency/reports/export/delay-root-causes${query({ from, to, type: "csv" })}`,
  );
}
