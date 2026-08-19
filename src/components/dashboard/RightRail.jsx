import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import {
  buildActiveNotifications,
  formatNotificationTime,
} from "../../utils/notificationPresentation";
import { knowledgeService } from "../../services/intelligence/knowledgeApi";
import ReactMarkdown from "react-markdown";
import KnowledgeUploadModal from "../intelligence/KnowledgeUploadModal";
import MessageWidget from "../messaging/MessageWidget";
import useDocumentStore from "../../store/useDocumentStore";
import ellyLogo from "../../assets/elly-logo.png";

const initialAlerts = [
  { id: 1, label: "Oxygen supply check overdue", level: "Critical" },
  { id: 2, label: "Surgery room 3 turnover blocked", level: "Warning" },
  { id: 3, label: "Blood lab result exception", level: "Warning" },
  { id: 4, label: "Daily capacity entry complete", level: "Info" },
];

const KNOWLEDGE_EXAMPLE_PROMPTS = [
  "What is the diabetes?",
  "Teach me how insulin works step by step.",
  "Brainstorm five ideas to improve the clinic waiting experience.",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function CompanyCard() {
  return (
    <section className="utility-card right-rail-company-card">
      <div className="right-rail-company-card__brand">
        <img
          alt="ELLY"
          className="right-rail-company-card__logo"
          src={ellyLogo}
        />
        <span className="right-rail-company-card__name">ElectraWireless</span>
      </div>
      <button
        aria-label="Open library"
        className="right-rail-company-card__library"
        type="button"
      >
        <Icon name="records" size={13} />
        Library
      </button>
    </section>
  );
}

function RightRail({
  emergencyRealtime,
  onEmergencyRequestOpen,
  transientResetKey,
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [knowledgeQuestion, setKnowledgeQuestion] = useState("");
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeMeta, setKnowledgeMeta] = useState(null);
  const knowledgeInputRef = useRef(null);
  const [showQuickUploadModal, setShowQuickUploadModal] = useState(false);
  const [quickUploadStatus, setQuickUploadStatus] = useState("");
  const enterDocumentMode = useDocumentStore((state) => state.enterDocumentMode);
  const exitDocumentMode = useDocumentStore((state) => state.exitDocumentMode);
  const isDocumentMode = useDocumentStore((state) => state.isDocumentMode);
  const emergencyAlerts = buildActiveNotifications(
    emergencyRealtime,
    null,
  ).filter((alert) => alert.type === "emergency");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowQuickUploadModal(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [transientResetKey]);

  const handleExamplePrompt = (prompt) => {
    setKnowledgeQuestion(prompt);
    setKnowledgeError("");

    requestAnimationFrame(() => {
      knowledgeInputRef.current?.focus();
    });
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
        <CompanyCard />
        <MessageWidget />

        <section className="utility-card ai-prompt-card">
          <div className="utility-card-heading">
            <div>
              <span>ELLY AI</span>
              <strong>Knowledge assistant</strong>
            </div>
            <Icon name="sparkle" size={18} />
          </div>

          <p>
            Ask questions based on approved hospital knowledge
            documents.
          </p>

          <div className="knowledge-example-prompts">
            <span>Example prompts</span>

            <div className="knowledge-example-prompt-list">
              {KNOWLEDGE_EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={knowledgeLoading}
                  className={
                    knowledgeQuestion === prompt
                      ? "is-selected"
                      : ""
                  }
                  onClick={() => handleExamplePrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleAskKnowledge}
            className="message-composer"
          >
            <input
              ref={knowledgeInputRef}
              value={knowledgeQuestion}
              onChange={(event) =>
                setKnowledgeQuestion(event.target.value)
              }
              placeholder="Ask about hospital knowledge..."
              aria-label="Ask Elly a hospital knowledge question"
            />

            <button type="submit" disabled={knowledgeLoading}>
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
          <p>
            Three monitored beds may be needed within 90 minutes. Prioritize ICU
            East readiness.
          </p>
          <div>
            <strong>What to do next</strong>
            <span>Review transfers and confirm evening coverage.</span>
          </div>
          <div>
            <strong>Follow-up questions</strong>
            <span>Which departments need additional staffing?</span>
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
                data-level="critical"
                key={alert.id}
                onClick={() => onEmergencyRequestOpen?.(alert.alertId)}
                type="button"
              >
                <span>
                  <strong>Incoming emergency case</strong>
                  <small>{formatNotificationTime(alert.occurredAt)}</small>
                </span>
                <i data-level="critical" />
              </button>
            ))}
            {alerts.map((alert) => (
              <button
                key={alert.id}
                data-level={alert.level.toLowerCase()}
                onClick={() =>
                  setAlerts((current) =>
                    current.filter((item) => item.id !== alert.id),
                  )
                }
                type="button"
              >
                <span>
                  <span className="alert-severity-label">{alert.level}</span>
                  {alert.label}
                </span>
                <i data-level={alert.level.toLowerCase()} />
              </button>
            ))}
            {alerts.length === 0 && <p>All alerts reviewed.</p>}
          </div>
        </section>

        <section className="utility-card quick-actions-card">
          <h2>Quick Actions</h2>
          <div>
            <button type="button">
              <Icon name="message" size={14} />
              Inbox
            </button>
            <button type="button" onClick={() => setShowQuickUploadModal(true)}>
              <Icon name="upload" size={14} />
              Upload
            </button>
            <button type="button">
              <Icon name="check" size={14} />
              Tasks
            </button>
            <button
              type="button"
              onClick={isDocumentMode ? exitDocumentMode : enterDocumentMode}
              className={isDocumentMode ? "quick-action-active" : ""}
            >
              <Icon name="file" size={14} />
              {isDocumentMode ? "Exit Document" : "Document"}
            </button>
          </div>
          {quickUploadStatus && (
            <p className="quick-action-status">{quickUploadStatus}</p>
          )}
        </section>
      </div>

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
