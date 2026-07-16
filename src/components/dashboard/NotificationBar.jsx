import { useMemo } from "react";
import Icon from "./Icon";
import {
  buildUnifiedNotifications,
  countActionRequiredNotifications,
  getLatestNotification,
} from "../../utils/notificationPresentation";

function NotificationBar({
  realtime,
  registrationRealtime,
  onNotificationsOpen,
}) {
  const allNotifications = useMemo(
    () => buildUnifiedNotifications(realtime, registrationRealtime),
    [realtime, registrationRealtime],
  );

  const latestNotification = useMemo(
    () =>
      getLatestNotification(
        { ...realtime, notifications: [] },
        registrationRealtime,
      ),
    [realtime, registrationRealtime],
  );

  const actionRequiredTotal =
    countActionRequiredNotifications(allNotifications);

  return (
    <footer className="dashboard-notification-bar">
      <button
        type="button"
        className="notification-status notification-status-button"
        aria-label="Open notifications"
        onClick={onNotificationsOpen}
      >
        <span />
        <Icon name="message" size={15} />
        {actionRequiredTotal} need action
      </button>

      {latestNotification ? (
        <button
          type="button"
          className={`notification-ticker notification-latest ${
            latestNotification.type === "emergency"
              ? "notification-emergency"
              : "notification-registration"
          }`}
          onClick={onNotificationsOpen}
          aria-label={`${latestNotification.label}. Open notifications.`}
        >
          <strong>
            {latestNotification.type === "emergency"
              ? "Emergency"
              : "Registration"}
          </strong>
          <p>{latestNotification.label}</p>
          <span className="notification-bar-status">
            {latestNotification.statusLabel}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="notification-ticker notification-standby"
          onClick={onNotificationsOpen}
          aria-label="Open notifications"
        >
          <strong>Standby</strong>
          <p>System active. Awaiting live events...</p>
        </button>
      )}
    </footer>
  );
}

export default NotificationBar;
