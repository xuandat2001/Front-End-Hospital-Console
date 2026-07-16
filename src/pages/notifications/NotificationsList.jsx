import { useMemo, useState } from "react";
import {
  buildUnifiedNotifications,
  countActionRequiredNotifications,
  filterNotifications,
  formatNotificationTime,
} from "../../utils/notificationPresentation";

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "action-required", label: "Action required" },
  { id: "completed", label: "Completed" },
];

function NotificationsList({
  realtime,
  registrationRealtime,
  onBack,
  onEmergencyRequestOpen,
  onRegistrationRequestOpen,
}) {
  const [filter, setFilter] = useState("all");

  const allNotifications = useMemo(
    () => buildUnifiedNotifications(realtime, registrationRealtime),
    [realtime, registrationRealtime],
  );

  const notifications = useMemo(
    () => filterNotifications(allNotifications, filter),
    [allNotifications, filter],
  );

  const actionRequiredCount = countActionRequiredNotifications(allNotifications);

  const handleSelect = (notification) => {
    if (notification.type === "emergency") {
      onEmergencyRequestOpen?.(notification.alertId);
      return;
    }

    onRegistrationRequestOpen?.({
      eventId: notification.eventId,
      ellyId: notification.ellyId,
      hospitalId: notification.hospitalId,
    });
  };

  return (
    <div className="notifications-page">
      <header className="notifications-page-header">
        <button
          type="button"
          className="notifications-back-button"
          onClick={onBack}
        >
          Back
        </button>
        <div>
          <h1>Notifications</h1>
          <p>Newest to oldest · {actionRequiredCount} need action</p>
        </div>
      </header>

      <div
        className="notifications-filters"
        role="tablist"
        aria-label="Notification filters"
      >
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            className={`notifications-filter-button ${
              filter === option.id ? "is-active" : ""
            }`}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notifications.length ? (
        <ul className="notifications-list" aria-label="Filtered notifications">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`notifications-list-item ${
                  notification.type === "emergency"
                    ? "is-emergency"
                    : "is-registration"
                } ${
                  notification.actionRequired
                    ? "is-action-required"
                    : "is-completed"
                }`}
                onClick={() => handleSelect(notification)}
              >
                <div className="notifications-list-item-head">
                  <div className="notifications-list-item-tags">
                    <strong>
                      {notification.type === "emergency"
                        ? "Emergency"
                        : "Registration"}
                    </strong>
                    <span
                      className={`notifications-status-badge ${
                        notification.actionRequired
                          ? "is-action-required"
                          : "is-completed"
                      }`}
                    >
                      {notification.statusLabel}
                    </span>
                  </div>
                  <time dateTime={notification.occurredAt || undefined}>
                    {formatNotificationTime(notification.occurredAt)}
                  </time>
                </div>
                <p>{notification.label}</p>
                <span>{notification.actionLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="notifications-empty">
          <p>
            {filter === "all"
              ? "No notifications yet."
              : filter === "action-required"
                ? "No notifications need action right now."
                : "No completed notifications yet."}
          </p>
          <span>System active. Awaiting live events...</span>
        </div>
      )}
    </div>
  );
}

export default NotificationsList;
