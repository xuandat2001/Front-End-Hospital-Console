const cardClass =
  "appointment-card";

const policies = [
  [
    "Booking Window",
    "Appointments can be booked up to 30 days in advance.",
    "30 days",
    "calendar",
    "blue",
  ],
  [
    "Update Rule",
    "Changes are allowed up to 24 hours before the appointment start time.",
    "24 hours",
    "edit",
    "teal",
  ],
  [
    "Cancellation Rule",
    "Cancellations should be made at least 12 hours before the appointment.",
    "12 hours",
    "ban",
    "red",
  ],
  [
    "Completion Rule",
    "Appointments are marked completed after patient check-out.",
    "At check-out",
    "check",
    "green",
  ],
  [
    "Required Fields",
    "Patient, provider, department, appointment type, date and time are required.",
    "6 fields",
    "fields",
    "violet",
  ],
];

const appointmentTypes = [
  [
    "ONLINE",
    "Follow-ups, result reviews and consultations",
    "A virtual link can be shared with the patient.",
    "30 min",
    "globe",
    "blue",
  ],
  [
    "PHONE",
    "Quick triage, medication questions and check-ins",
    "Staff initiates the call at the scheduled time.",
    "20 min",
    "phone",
    "teal",
  ],
  [
    "IN PERSON",
    "Examinations, procedures and vaccinations",
    "Requires an available room and suitable equipment.",
    "45 min",
    "person",
    "violet",
  ],
];

const toneClasses = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
  red: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
};

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    policy: (
      <>
        <path d="M7 3h8l4 4v14H7z" />
        <path d="M14 3v5h5M10 12h6M10 16h4" />
        <path d="m3 14 2 2 4-4" />
      </>
    ),
    guide: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
      </>
    ),
    ban: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m6 18 12-12" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    fields: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8" cy="11" r="2" />
        <path d="M5 16c.8-1.7 1.8-2.5 3-2.5s2.2.8 3 2.5M14 10h4M14 14h4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    phone: (
      <path d="M6.6 3H4.3A1.3 1.3 0 0 0 3 4.4C3.6 13 10.4 19.8 19 21a1.3 1.3 0 0 0 1.4-1.3v-2.3l-4-1.5-1.2 2a15.4 15.4 0 0 1-9.1-9.1l2-1.2Z" />
    ),
    person: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function CardHeading({ icon, title, description, tone = "violet" }) {
  return (
    <div className="flex items-start gap-4 p-5">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
      >
        <Icon name={icon} />
      </span>
      <div>
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function ResourcesTab() {
  return (
    <div>
      <div className="mb-5">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          Rules and guidance for reliable appointment scheduling.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <section className={`${cardClass} overflow-hidden`}>
          <CardHeading
            icon="policy"
            title="Booking Rules & Policies"
            description="Guidelines that govern how appointments are created, updated and managed."
          />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[560px] overflow-hidden rounded-xl border border-slate-200 text-sm dark:border-slate-800">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                  <th className="px-4 py-3">Rule / policy</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {policies.map(([name, description, value, icon, tone]) => (
                  <tr key={name} className="text-slate-700 dark:text-slate-200">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
                        >
                          <Icon name={icon} className="h-4 w-4" />
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 leading-5">{description}</td>
                    <td className="px-4 py-3 font-semibold">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${cardClass} overflow-hidden`}>
          <CardHeading
            icon="guide"
            title="Appointment Type Guide"
            description="Quick reference for choosing the right consultation format."
            tone="teal"
          />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[620px] overflow-hidden rounded-xl border border-slate-200 text-sm dark:border-slate-800">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950/30">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Best for</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Default</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {appointmentTypes.map(
                  ([type, bestFor, notes, duration, icon, tone]) => (
                    <tr
                      key={type}
                      className="text-slate-700 dark:text-slate-200"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}
                          >
                            <Icon name={icon} className="h-4 w-4" />
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 leading-5">{bestFor}</td>
                      <td className="px-4 py-4 leading-5">{notes}</td>
                      <td className="px-4 py-4 font-semibold">{duration}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

