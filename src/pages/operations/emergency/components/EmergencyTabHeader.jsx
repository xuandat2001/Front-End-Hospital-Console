export default function EmergencyTabHeader({ title, description, actions }) {
  return (
    <header className="emergency-command-header emergency-tab-header">
      <div className="emergency-tab-heading">
        <h1 className="emergency-tab-title">{title}</h1>
        <p className="emergency-tab-subtitle">{description}</p>
      </div>
      {actions ? <div className="emergency-header-actions">{actions}</div> : null}
    </header>
  );
}
