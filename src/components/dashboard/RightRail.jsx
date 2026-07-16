import { useState } from "react";
import Icon from "./Icon";
import {
  buildActiveNotifications,
  formatNotificationTime,
} from "../../utils/notificationPresentation";
import { knowledgeService } from "../../services/intelligence/knowledgeApi";
import ReactMarkdown from "react-markdown";
import KnowledgeUploadModal from "../intelligence/KnowledgeUploadModal";
import MessageWidget from "../messaging/MessageWidget";

const initialAlerts = [
  { id: 1, label: "Oxygen supply check overdue", level: "Urgent" },
  { id: 2, label: "Surgery room 3 turnover blocked", level: "High" },
  { id: 3, label: "Blood lab result exception", level: "Review" },
  { id: 4, label: "Daily capacity entry complete", level: "Ready" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultRightRailContext = {
  consideration:
    "Three monitored beds may be needed within 90 minutes. Prioritize ICU East readiness.",
  nextAction: "Review transfers and confirm evening coverage.",
  followUp: "Which departments need additional staffing?",
  alerts: initialAlerts,
  actions: [
    { label: "Inbox", icon: "message" },
    { label: "Upload", icon: "upload", action: "upload" },
    { label: "Tasks", icon: "check" },
  ],
};

const billingRightRailContext = {
  consideration:
    "Review billing processes and outstanding accounts to maintain healthy cash flow.",
  nextAction: "Follow up on overdue invoices and pending payments.",
  followUp: "Which departments have the highest outstanding balance?",
  alerts: [
    { id: "billing-1", label: "24 accounts are overdue", level: "Urgent" },
    { id: "billing-2", label: "High-value claim requires review", level: "Urgent" },
    { id: "billing-3", label: "Insurance claim rejected", level: "Review" },
    { id: "billing-4", label: "Payment gateway experiencing delays", level: "Ready" },
  ],
  actions: [
    { id: "create-invoice", label: "Create Invoice", icon: "file" },
    { id: "process-payment", label: "Process Payment", icon: "upload" },
    { id: "submit-claim", label: "Submit Claim", icon: "file" },
    { id: "reconcile-accounts", label: "Reconcile Accounts", icon: "check" },
  ],
};

const billingActionForms = {
  "create-invoice": {
    title: "Create Invoice",
    primaryAction: "Save Draft",
    fields: [
      { id: "patient", label: "Patient", placeholder: "Patient name or EllyID" },
      { id: "department", label: "Department", placeholder: "Department" },
      { id: "category", label: "Service Category", placeholder: "Cardiology" },
      { id: "amount", label: "Amount", placeholder: "$0.00" },
      { id: "dueDate", label: "Due Date", placeholder: "YYYY-MM-DD" },
    ],
  },
  "process-payment": {
    title: "Process Payment",
    primaryAction: "Record Placeholder",
    fields: [
      { id: "invoice", label: "Invoice ID", placeholder: "INV-2025-10458" },
      { id: "method", label: "Method", placeholder: "Cash / Card / Insurance" },
      { id: "amount", label: "Amount", placeholder: "$0.00" },
    ],
  },
  "submit-claim": {
    title: "Submit Claim",
    primaryAction: "Stage Claim",
    fields: [
      { id: "invoice", label: "Invoice ID", placeholder: "INV-2025-10457" },
      { id: "payer", label: "Payer", placeholder: "Insurance payer" },
      { id: "policy", label: "Policy Number", placeholder: "Policy reference" },
    ],
  },
  "reconcile-accounts": {
    title: "Reconcile Accounts",
    primaryAction: "Start Review",
    fields: [
      { id: "batch", label: "Batch", placeholder: "Daily payment batch" },
      { id: "owner", label: "Owner", placeholder: "Billing staff" },
      { id: "notes", label: "Notes", placeholder: "Review notes" },
    ],
  },
};

async function askKnowledgeWithRetry(question) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await knowledgeService.ask(question);
    } catch (error) {
      console.warn(`Knowledge ask attempt ${attempt} failed`, error);

      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(1500);
    }
  }

  return null;
}

function RightRail({ activeFunction, emergencyRealtime, onEmergencyRequestOpen }) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("");
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeMeta, setKnowledgeMeta] = useState(null);
  const [showQuickUploadModal, setShowQuickUploadModal] = useState(false);
  const [quickUploadStatus, setQuickUploadStatus] = useState("");
  const [activeBillingAction, setActiveBillingAction] = useState(null);
  const [billingActionSaving, setBillingActionSaving] = useState(false);
  const [billingActionStatus, setBillingActionStatus] = useState("");
  const emergencyAlerts = buildActiveNotifications(
    emergencyRealtime,
    null,
  ).filter((alert) => alert.type === "emergency");
  const rightRailContext =
    activeFunction === "billing-dashboard"
      ? billingRightRailContext
      : defaultRightRailContext;
  const visibleAlerts =
    activeFunction === "billing-dashboard" ? rightRailContext.alerts : alerts;
  const activeBillingForm = activeBillingAction
    ? billingActionForms[activeBillingAction.id]
    : null;

  const handleBillingActionSubmit = (event) => {
    event.preventDefault();

    if (!activeBillingForm) return;

    setBillingActionSaving(true);
    window.setTimeout(() => {
      setBillingActionSaving(false);
      setBillingActionStatus(`${activeBillingForm.title} saved locally for demo review.`);
      setActiveBillingAction(null);
    }, 420);
  };

  const handleAskKnowledge = async (event) => {
    event.preventDefault();

    const question = knowledgeQuestion.trim();
    if (!question) return;

    setKnowledgeLoading(true);
    setKnowledgeError("");
    setKnowledgeAnswer("");
    setKnowledgeMeta(null);

    try {
      const response = await askKnowledgeWithRetry(question);
      const data = response.data;

      setKnowledgeAnswer(data?.answer || "No answer returned.");
      setKnowledgeMeta({
        answerSource: data?.answerSource,
        matchedChunks: data?.matchedChunks,
        retrievalMode: data?.retrievalMode,
        topSimilarityScore: data?.topSimilarityScore,
        sourceIds: data?.sourceIds || [],
        aiProvider: data?.aiProvider,
        modelName: data?.modelName,
      });
    } catch (error) {
      console.error("Knowledge ask failed:", error);

      setKnowledgeError(
        "Elly AI is temporarily busy processing knowledge documents. Existing documents may still work. Please try again in a few seconds.",
      );
    } finally {
      setKnowledgeLoading(false);
    }
  };

  return (
    <aside className="dashboard-right-rail">
      <div className="dashboard-utility-stack">
        <MessageWidget />

        <section className="utility-card ai-prompt-card">
          <div className="utility-card-heading">
            <div>
              <span>ELLY AI</span>
              <strong>Knowledge assistant</strong>
            </div>
            <Icon name="sparkle" size={18} />
          </div>

          <p>Ask questions based on approved hospital knowledge documents.</p>

          <form onSubmit={handleAskKnowledge} className="message-composer">
            <input
              value={knowledgeQuestion}
              onChange={(event) => setKnowledgeQuestion(event.target.value)}
              placeholder="Ask hospital policy..."
            />

            <button
              type="button"
              disabled={knowledgeLoading}
              onClick={handleAskKnowledge}
            >
              {knowledgeLoading ? (
                <span className="typing-dots" aria-label="Elly is typing">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                "Ask"
              )}
            </button>
          </form>

          {knowledgeError && <p className="text-red-400">{knowledgeError}</p>}

          {knowledgeAnswer && (
            <div className="knowledge-answer">
              <strong>Answer</strong>
              <div className="knowledge-answer-markdown">
                <ReactMarkdown>{knowledgeAnswer}</ReactMarkdown>
              </div>

              {knowledgeMeta && (
                <small>
                  Source: {knowledgeMeta.answerSource} · Matched chunks:{" "}
                  {knowledgeMeta.matchedChunks} · Mode:{" "}
                  {knowledgeMeta.retrievalMode}
                </small>
              )}
            </div>
          )}
        </section>

        <section className="utility-card consideration-card">
          <h2>Considerations</h2>
          <p>{rightRailContext.consideration}</p>
          <div>
            <strong>What to do next</strong>
            <span>{rightRailContext.nextAction}</span>
          </div>
          <div>
            <strong>Follow-up questions</strong>
            <span>{rightRailContext.followUp}</span>
          </div>
        </section>

        <section className="utility-card alerts-card">
          <div className="utility-card-heading">
            <h2>Alerts</h2>
            <Icon name="alert" size={17} />
          </div>
          <div className="alert-list" aria-live="polite">
            {emergencyAlerts.map((alert) => (
              <button
                className="is-emergency-case"
                key={alert.id}
                onClick={() => onEmergencyRequestOpen?.(alert.alertId)}
                type="button"
              >
                <span>
                  <strong>Incoming emergency case</strong>
                  <small>{formatNotificationTime(alert.occurredAt)}</small>
                </span>
                <i data-level="urgent" />
              </button>
            ))}
            {visibleAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() =>
                  activeFunction !== "billing-dashboard" &&
                  setAlerts((current) =>
                    current.filter((item) => item.id !== alert.id),
                  )
                }
                type="button"
              >
                <span>{alert.label}</span>
                <i data-level={alert.level.toLowerCase()} />
              </button>
            ))}
            {visibleAlerts.length === 0 && <p>All alerts reviewed.</p>}
          </div>
        </section>

        <section className="utility-card quick-actions-card">
          <h2>Quick Actions</h2>
          <div>
            {rightRailContext.actions.map((action) => (
              <button
                key={action.id || action.label}
                type="button"
                onClick={() => {
                  if (activeFunction === "billing-dashboard") {
                    setBillingActionStatus("");
                    setActiveBillingAction(action);
                  } else if (action.action === "upload") {
                    setShowQuickUploadModal(true);
                  }
                }}
              >
                <Icon name={action.icon} size={14} />
                {action.label}
              </button>
            ))}
          </div>
          {quickUploadStatus && (
            <p className="quick-action-status">{quickUploadStatus}</p>
          )}
          {billingActionStatus && activeFunction === "billing-dashboard" && (
            <p className="quick-action-status">{billingActionStatus}</p>
          )}
        </section>
      </div>

      {activeBillingForm && (
        <div className="billing-action-layer" role="presentation">
          <form
            aria-modal="true"
            className="billing-action-panel"
            onSubmit={handleBillingActionSubmit}
            role="dialog"
          >
            <header>
              <div>
                <span>Billing action</span>
                <h2>{activeBillingForm.title}</h2>
              </div>
              <button
                aria-label="Close billing action"
                onClick={() => setActiveBillingAction(null)}
                type="button"
              >
                x
              </button>
            </header>
            <div className="billing-action-fields">
              {activeBillingForm.fields.map((field) => (
                <label key={field.id}>
                  <span>{field.label}</span>
                  <input placeholder={field.placeholder} />
                </label>
              ))}
            </div>
            <footer>
              <button
                disabled={billingActionSaving}
                onClick={() => setActiveBillingAction(null)}
                type="button"
              >
                Cancel
              </button>
              <button disabled={billingActionSaving} type="submit">
                {billingActionSaving ? "Saving..." : activeBillingForm.primaryAction}
              </button>
            </footer>
          </form>
        </div>
      )}

      {showQuickUploadModal && (
        <KnowledgeUploadModal
          onClose={() => setShowQuickUploadModal(false)}
          onUploaded={(message) => setQuickUploadStatus(message)}
        />
      )}
    </aside>
  );
}

export default RightRail;
