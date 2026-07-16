export const mockOverviewDashboard = {
  metrics: {
    totalPatients: 1284,
    activeCases: 37,
    emergencyQueue: 6,
    pendingAppointments: 42,
    bedUtilization: 68,
    flowHealth: 92,
  },
  recentActivity: [
    { id: "act-001", type: "registration", label: "Patient ELLY-USR-019F3AAD registered", time: "5 min ago" },
    { id: "act-002", type: "appointment", label: "Cardiology appointment completed", time: "12 min ago" },
    { id: "act-003", type: "emergency", label: "High severity emergency routed to ER", time: "18 min ago" },
  ],
};
