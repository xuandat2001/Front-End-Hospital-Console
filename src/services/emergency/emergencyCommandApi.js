import { mockDirectData, mockExportResponse } from "../mock/mockApi";

async function commandRequest(path) {
  const payload = await mockDirectData(path);
  return payload?.data ?? payload;
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getPlanningVolumeForecast(hours = 24) {
  return commandRequest(`/api/emergency/planning/volume-forecast${query({ hours })}`);
}

export function getPlanningCapacityForecast(hours = 24) {
  return commandRequest(`/api/emergency/planning/capacity-forecast${query({ hours })}`);
}

export function getPlanningStaffingGap(hours = 12) {
  return commandRequest(`/api/emergency/planning/staffing-gap${query({ hours })}`);
}

export function getPlanningAmbulanceDemand(hours = 12) {
  return commandRequest(`/api/emergency/planning/ambulance-demand${query({ hours })}`);
}

export function getPlanningRecommendations() {
  return commandRequest("/api/emergency/planning/recommendations");
}

export function getEmergencyAmbulances() {
  return commandRequest("/api/emergency/resources/ambulances");
}

export function getEmergencyBeds() {
  return commandRequest("/api/emergency/resources/beds");
}

export function getEmergencyStaff() {
  return commandRequest("/api/emergency/resources/staff");
}

export function getEmergencyEquipment() {
  return commandRequest("/api/emergency/resources/equipment");
}

export function getEmergencyResourceBottlenecks() {
  return commandRequest("/api/emergency/resources/bottlenecks");
}

export function getDailyEmergencySummary(date) {
  return commandRequest(`/api/emergency/reports/daily-summary${query({ date })}`);
}

export function getEmergencyCaseAudit(params) {
  return commandRequest(`/api/emergency/reports/case-audit${query(params)}`);
}

export function getSlaComplianceReport(from, to) {
  return commandRequest(`/api/emergency/reports/sla${query({ from, to })}`);
}

export function getDelayRootCauseReport(from, to) {
  return commandRequest(`/api/emergency/reports/delay-root-causes${query({ from, to })}`);
}

export function exportDailySummary() {
  return mockExportResponse("emergency-daily-summary.txt");
}

export function exportSlaReport() {
  return mockExportResponse("emergency-sla-report.txt");
}

export function exportCaseAudit() {
  return mockExportResponse("emergency-case-audit.txt");
}

export function exportDelayRootCauses() {
  return mockExportResponse("emergency-delay-root-causes.txt");
}
