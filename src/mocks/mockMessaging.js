const now = new Date().toISOString();

export const mockConversations = [
  {
    id: "conv-er",
    _id: "conv-er",
    type: "DEPARTMENT",
    name: "# Emergency",
    subtitle: "Department channel - Emergency",
    preview: "Cardiology Team: Cath lab is prepped.",
    time: "Now",
    unread: 2,
    tone: "primary",
    lastMessage: { content: "Cardiology Team: Cath lab is prepped.", sentAt: now },
  },
  {
    id: "conv-billing",
    _id: "conv-billing",
    type: "GROUP",
    name: "Billing Ops",
    subtitle: "Group conversation - 6 members",
    preview: "Mai: Claims batch is ready for review.",
    time: "8 min",
    unread: 1,
    tone: "teal",
    lastMessage: { content: "Mai: Claims batch is ready for review.", sentAt: now },
  },
  {
    id: "conv-direct",
    _id: "conv-direct",
    type: "DIRECT",
    name: "Dr. Linh Nguyen",
    subtitle: "Direct message",
    preview: "Can you confirm John Doe's discharge plan?",
    time: "22 min",
    unread: 0,
    tone: "staff",
    lastMessage: { content: "Can you confirm John Doe's discharge plan?", sentAt: now },
  },
];

export const mockMessagesByConversation = {
  "conv-er": [
    { id: "msg-er-001", conversationId: "conv-er", sender: "Dr. Maya Tran", content: "Incoming case ETA 7 minutes.", time: "09:02" },
    { id: "msg-er-002", conversationId: "conv-er", sender: "Cardiology Team", content: "Cath lab is prepped.", time: "09:05" },
  ],
  "conv-billing": [
    { id: "msg-bill-001", conversationId: "conv-billing", sender: "Mai", content: "Claims batch is ready for review.", time: "08:52" },
  ],
  "conv-direct": [
    { id: "msg-direct-001", conversationId: "conv-direct", sender: "Dr. Linh Nguyen", content: "Can you confirm John Doe's discharge plan?", time: "08:38" },
  ],
};
