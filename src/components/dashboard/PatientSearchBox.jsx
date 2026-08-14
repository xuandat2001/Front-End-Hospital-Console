import { useState } from "react";
import Icon from "./Icon";

function PatientSearchBox({
  className = "",
  onClose,
  onPatientSearch,
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onPatientSearch?.(trimmed);
    onClose?.();
  };

  return (
    <div
      className={`dashboard-patient-search dashboard-access-search ${className}`.trim()}
      role="search"
    >
      <span
        aria-hidden="true"
        className="dashboard-patient-search__leading"
      >
        <Icon name="search" size={18} />
      </span>
      <input
        aria-label="Find patient by EllyID"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Find patient by EllyID"
        type="text"
        value={value}
      />
      <button
        aria-label="Search patient"
        className="dashboard-patient-search__go"
        onClick={submit}
        type="button"
      >
        <Icon name="arrowRight" size={14} />
      </button>
    </div>
  );
}

export default PatientSearchBox;
