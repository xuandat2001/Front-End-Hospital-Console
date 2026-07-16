export const dateRangeOptions = [
  { id: "today", label: "Today" },
  { id: "last7Days", label: "Last 7 days" },
  { id: "last30Days", label: "Last 30 days" },
  { id: "may2025", label: "May 1 - May 31, 2025" },
  { id: "custom", label: "Custom Range placeholder" },
];

export const trendGranularityOptions = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export const categorySortOptions = [
  { id: "revenue", label: "By Revenue" },
  { id: "invoiceCount", label: "By Invoice Count" },
  { id: "outstanding", label: "By Outstanding Balance" },
];

export const invoiceStatusOptions = [
  { id: "all", label: "All statuses" },
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Pending" },
  { id: "overdue", label: "Overdue" },
];

const colors = {
  paid: "#32d583",
  pending: "#fbbf3a",
  overdue: "#ff5a66",
};

function money(value) {
  return `$${value.toLocaleString("en-US")}`;
}

function moneyWithCents(value) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function kpis({ totalRevenue, outstanding, paymentsToday, paymentCount, overdue, overdueCount, trend }) {
  return [
    {
      id: "total-revenue",
      label: "Total Revenue",
      value: money(totalRevenue),
      detail: trend,
      tone: "purple",
      icon: "trend",
    },
    {
      id: "outstanding-invoices",
      label: "Outstanding Invoices",
      value: money(outstanding),
      detail: `${((outstanding / totalRevenue) * 100).toFixed(1)}% of total revenue`,
      tone: "cyan",
      icon: "receipt",
    },
    {
      id: "payments-today",
      label: "Payments Today",
      value: money(paymentsToday),
      detail: `${paymentCount} payments`,
      tone: "green",
      icon: "card",
    },
    {
      id: "overdue-accounts",
      label: "Overdue Accounts",
      value: money(overdue),
      detail: `${overdueCount} accounts`,
      tone: "orange",
      icon: "alert",
    },
  ];
}

function paymentMix(paid, pending, overdue) {
  const total = paid + pending + overdue;

  return [
    { label: "Paid", value: paid, percent: Number(((paid / total) * 100).toFixed(1)), color: colors.paid },
    {
      label: "Pending",
      value: pending,
      percent: Number(((pending / total) * 100).toFixed(1)),
      color: colors.pending,
    },
    {
      label: "Overdue",
      value: overdue,
      percent: Number(((overdue / total) * 100).toFixed(1)),
      color: colors.overdue,
    },
  ];
}

function invoice({
  id,
  patient,
  department,
  amount,
  status,
  issueDate,
  dueDate,
  paymentStatus,
  lineItems,
}) {
  return {
    id,
    patient,
    department,
    amount,
    amountLabel: moneyWithCents(amount),
    status,
    issueDate,
    dueDate,
    paymentStatus,
    lineItems,
  };
}

const mayInvoices = [
  invoice({
    id: "INV-2025-10459",
    patient: "John Doe",
    department: "Cardiology",
    amount: 2450,
    status: "Paid",
    issueDate: "May 31, 2025",
    dueDate: "May 31, 2025",
    paymentStatus: "Confirmed by card",
    lineItems: ["ECG monitoring", "Cardiology consultation", "Medication review"],
  }),
  invoice({
    id: "INV-2025-10458",
    patient: "Mary Smith",
    department: "Orthopedics",
    amount: 1850,
    status: "Pending",
    issueDate: "May 31, 2025",
    dueDate: "Jun 7, 2025",
    paymentStatus: "Awaiting patient payment",
    lineItems: ["Follow-up visit", "X-ray interpretation"],
  }),
  invoice({
    id: "INV-2025-10457",
    patient: "Robert Brown",
    department: "Neurology",
    amount: 3200,
    status: "Overdue",
    issueDate: "May 28, 2025",
    dueDate: "Jun 4, 2025",
    paymentStatus: "Past due",
    lineItems: ["Neuro imaging review", "Procedure room usage", "Medication"],
  }),
  invoice({
    id: "INV-2025-10456",
    patient: "Linda Johnson",
    department: "Dermatology",
    amount: 950,
    status: "Paid",
    issueDate: "May 30, 2025",
    dueDate: "May 30, 2025",
    paymentStatus: "Settled at counter",
    lineItems: ["Dermatology consult", "Minor procedure supplies"],
  }),
  invoice({
    id: "INV-2025-10455",
    patient: "James Wilson",
    department: "ENT",
    amount: 1120,
    status: "Pending",
    issueDate: "May 30, 2025",
    dueDate: "Jun 6, 2025",
    paymentStatus: "Insurance review",
    lineItems: ["ENT consultation", "Diagnostic scope"],
  }),
  invoice({
    id: "INV-2025-10454",
    patient: "Ana Garcia",
    department: "Oncology",
    amount: 4760,
    status: "Overdue",
    issueDate: "May 27, 2025",
    dueDate: "Jun 3, 2025",
    paymentStatus: "Claim follow-up required",
    lineItems: ["Infusion suite", "Specialist review", "Lab panel"],
  }),
  invoice({
    id: "INV-2025-10453",
    patient: "Tran Minh",
    department: "Cardiology",
    amount: 1320,
    status: "Paid",
    issueDate: "May 26, 2025",
    dueDate: "May 26, 2025",
    paymentStatus: "Online payment confirmed",
    lineItems: ["Stress test", "Physician interpretation"],
  }),
  invoice({
    id: "INV-2025-10452",
    patient: "Fatima Khan",
    department: "Radiology",
    amount: 2260,
    status: "Pending",
    issueDate: "May 24, 2025",
    dueDate: "May 31, 2025",
    paymentStatus: "Pending payer response",
    lineItems: ["MRI scan", "Contrast material", "Radiology report"],
  }),
];

const categories = [
  {
    label: "Cardiology",
    revenue: 942350,
    invoiceCount: 412,
    outstanding: 184900,
    tone: "purple",
    icon: "heart",
  },
  {
    label: "Orthopedics",
    revenue: 632420,
    invoiceCount: 305,
    outstanding: 136400,
    tone: "blue",
    icon: "activity",
  },
  {
    label: "Neurology",
    revenue: 418760,
    invoiceCount: 196,
    outstanding: 99250,
    tone: "cyan",
    icon: "brain",
  },
  {
    label: "Oncology",
    revenue: 256890,
    invoiceCount: 118,
    outstanding: 78100,
    tone: "pink",
    icon: "ribbon",
  },
  {
    label: "Other Services",
    revenue: 208340,
    invoiceCount: 217,
    outstanding: 42560,
    tone: "gold",
    icon: "grid",
  },
];

export const billingDatasets = {
  today: {
    label: "Today",
    kpis: kpis({
      totalRevenue: 184760,
      outstanding: 62320,
      paymentsToday: 52840,
      paymentCount: 18,
      overdue: 19450,
      overdueCount: 6,
      trend: "+4.8% vs yesterday",
    }),
    trends: {
      daily: [
        { label: "8 AM", value: 18 },
        { label: "10 AM", value: 34 },
        { label: "12 PM", value: 42 },
        { label: "2 PM", value: 58 },
        { label: "4 PM", value: 74 },
        { label: "6 PM", value: 86 },
      ],
      weekly: [
        { label: "Mon", value: 102 },
        { label: "Tue", value: 118 },
        { label: "Wed", value: 134 },
        { label: "Thu", value: 146 },
        { label: "Fri", value: 156 },
      ],
      monthly: [
        { label: "Jan", value: 118 },
        { label: "Feb", value: 126 },
        { label: "Mar", value: 138 },
        { label: "Apr", value: 154 },
        { label: "May", value: 184 },
      ],
    },
    paymentStatusMix: paymentMix(58, 29, 11),
    invoices: mayInvoices.slice(0, 4),
    categories,
  },
  last7Days: {
    label: "Last 7 days",
    kpis: kpis({
      totalRevenue: 734920,
      outstanding: 246880,
      paymentsToday: 128440,
      paymentCount: 31,
      overdue: 64800,
      overdueCount: 12,
      trend: "+8.1% vs previous 7 days",
    }),
    trends: {
      daily: [
        { label: "Jun 8", value: 92 },
        { label: "Jun 9", value: 116 },
        { label: "Jun 10", value: 108 },
        { label: "Jun 11", value: 132 },
        { label: "Jun 12", value: 158 },
        { label: "Jun 13", value: 148 },
        { label: "Jun 14", value: 176 },
      ],
      weekly: [
        { label: "Week 1", value: 142 },
        { label: "Week 2", value: 168 },
        { label: "Week 3", value: 154 },
        { label: "Week 4", value: 188 },
      ],
      monthly: [
        { label: "Jan", value: 128 },
        { label: "Feb", value: 144 },
        { label: "Mar", value: 156 },
        { label: "Apr", value: 166 },
        { label: "May", value: 194 },
      ],
    },
    paymentStatusMix: paymentMix(216, 92, 37),
    invoices: mayInvoices.slice(1, 8),
    categories,
  },
  last30Days: {
    label: "Last 30 days",
    kpis: kpis({
      totalRevenue: 2214380,
      outstanding: 792640,
      paymentsToday: 284920,
      paymentCount: 39,
      overdue: 142210,
      overdueCount: 21,
      trend: "+10.6% vs previous 30 days",
    }),
    trends: {
      daily: [
        { label: "Day 1", value: 66 },
        { label: "Day 5", value: 108 },
        { label: "Day 10", value: 132 },
        { label: "Day 15", value: 176 },
        { label: "Day 20", value: 158 },
        { label: "Day 25", value: 226 },
        { label: "Day 30", value: 252 },
      ],
      weekly: [
        { label: "Week 1", value: 132 },
        { label: "Week 2", value: 164 },
        { label: "Week 3", value: 204 },
        { label: "Week 4", value: 238 },
      ],
      monthly: [
        { label: "Jan", value: 148 },
        { label: "Feb", value: 166 },
        { label: "Mar", value: 192 },
        { label: "Apr", value: 212 },
        { label: "May", value: 246 },
      ],
    },
    paymentStatusMix: paymentMix(641, 278, 123),
    invoices: mayInvoices,
    categories,
  },
  may2025: {
    label: "May 1 - May 31, 2025",
    kpis: kpis({
      totalRevenue: 2458760,
      outstanding: 874320,
      paymentsToday: 312840,
      paymentCount: 42,
      overdue: 163450,
      overdueCount: 24,
      trend: "+12.4% vs Apr 1 - Apr 30",
    }),
    trends: {
      daily: [
        { label: "May 1", value: 42 },
        { label: "May 2", value: 88 },
        { label: "May 3", value: 126 },
        { label: "May 4", value: 104 },
        { label: "May 5", value: 78 },
        { label: "May 6", value: 72 },
        { label: "May 7", value: 86 },
        { label: "May 8", value: 66 },
        { label: "May 9", value: 58 },
        { label: "May 10", value: 76 },
        { label: "May 11", value: 102 },
        { label: "May 12", value: 136 },
        { label: "May 13", value: 161 },
        { label: "May 14", value: 166 },
        { label: "May 15", value: 128 },
        { label: "May 16", value: 96 },
        { label: "May 17", value: 118 },
        { label: "May 18", value: 144 },
        { label: "May 19", value: 190 },
        { label: "May 20", value: 156 },
        { label: "May 21", value: 148 },
        { label: "May 22", value: 184 },
        { label: "May 23", value: 238 },
        { label: "May 24", value: 274 },
        { label: "May 25", value: 224 },
        { label: "May 26", value: 206 },
        { label: "May 27", value: 178 },
        { label: "May 28", value: 160 },
        { label: "May 29", value: 224 },
        { label: "May 30", value: 266 },
        { label: "May 31", value: 288 },
      ],
      weekly: [
        { label: "Week 1", value: 94 },
        { label: "Week 2", value: 138 },
        { label: "Week 3", value: 172 },
        { label: "Week 4", value: 236 },
      ],
      monthly: [
        { label: "Jan", value: 126 },
        { label: "Feb", value: 148 },
        { label: "Mar", value: 178 },
        { label: "Apr", value: 218 },
        { label: "May", value: 288 },
      ],
    },
    paymentStatusMix: paymentMix(742, 321, 185),
    invoices: mayInvoices,
    categories,
  },
  custom: {
    label: "Custom Range placeholder",
    kpis: kpis({
      totalRevenue: 1265400,
      outstanding: 382760,
      paymentsToday: 96840,
      paymentCount: 23,
      overdue: 88450,
      overdueCount: 15,
      trend: "Preview values until range picker is connected",
    }),
    trends: {
      daily: [
        { label: "Start", value: 64 },
        { label: "Day 4", value: 82 },
        { label: "Day 8", value: 112 },
        { label: "Day 12", value: 104 },
        { label: "End", value: 148 },
      ],
      weekly: [
        { label: "Week 1", value: 116 },
        { label: "Week 2", value: 138 },
        { label: "Week 3", value: 128 },
        { label: "Week 4", value: 156 },
      ],
      monthly: [
        { label: "Jan", value: 104 },
        { label: "Feb", value: 122 },
        { label: "Mar", value: 118 },
        { label: "Apr", value: 146 },
        { label: "May", value: 164 },
      ],
    },
    paymentStatusMix: paymentMix(284, 112, 58),
    invoices: mayInvoices.slice(2, 7),
    categories,
  },
};

export function formatCategoryValue(category, sortMode) {
  if (sortMode === "invoiceCount") {
    return `${category.invoiceCount.toLocaleString("en-US")} invoices`;
  }

  if (sortMode === "outstanding") {
    return `${money(category.outstanding)} outstanding`;
  }

  return money(category.revenue);
}
