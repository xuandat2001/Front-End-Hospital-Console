export const mockKnowledgeAnswers = [
  {
    question: "What is the overdue billing follow-up policy?",
    answer:
      "Billing staff should review overdue accounts daily, prioritize high-value balances, and document every patient or payer contact in the account notes.",
    answerSource: "mock-policy-billing",
    matchedChunks: 3,
    retrievalMode: "mock",
    topSimilarityScore: 0.94,
  },
  {
    question: "How are emergency cases prioritized?",
    answer:
      "Critical and high-severity cases are prioritized by triage severity, estimated arrival time, and receiving department capacity.",
    answerSource: "mock-policy-emergency",
    matchedChunks: 2,
    retrievalMode: "mock",
    topSimilarityScore: 0.91,
  },
];

export const mockKnowledgeDocuments = [
  { id: "mock-policy-billing", title: "Billing Operations Policy", filename: "billing-operations-policy.pdf", uploadedAt: "2026-07-10T10:00:00.000Z" },
  { id: "mock-policy-emergency", title: "Emergency Triage Policy", filename: "emergency-triage-policy.pdf", uploadedAt: "2026-07-11T11:00:00.000Z" },
];
