# Clinical System Insights rule governance

The thresholds in `patientSystemClinicalConfig.js` are provisional, clinician-facing
prototype configuration. They categorize recorded observations for triage and
orientation; they are not diagnostic criteria, treatment instructions, validated
alerts, or regulatory claims.

## Release gate

- Every rule is marked `draft` until a Chief Medical Officer or designated Clinical
  Safety Officer records an approval, reviewer, review date, exact guideline/version,
  applicable population, and exclusions.
- Draft rules may drive labelled display categories only. They must not send
  patient-facing or production alerts.
- Only `Continue monitoring`, `Repeat test`, and `Arrange routine follow-up` may be
  displayed automatically. Urgent or critical categories say `Clinician review
  required`; they do not issue autonomous care instructions.
- Any future alert acknowledgment must use an immutable audit API that records the
  rule, triggering value, timestamp, user, action, and acknowledgment/dismissal reason.
  The current System Insights UI does not simulate acknowledgment state.
- Re-review clinical content every 6-12 months and whenever an applicable guideline
  changes.

## Open clinical-safety decisions

1. COPD/non-COPD SpO2 escalation wording in the source document is inconsistent.
   Individual oxygen targets and Clinical Safety Officer approval are required before
   production alerting.
2. Troponin interpretation requires the assay-specific laboratory upper reference
   limit. The UI suppresses numeric interpretation when it is absent.
3. NT-proBNP lacks exact age-, renal-, and obesity-adjusted thresholds, so the UI
   requires clinician interpretation.
4. TSH "extreme deviation" is undefined. No invented extreme threshold is used.
5. CRP and ESR are nonspecific and must not independently trigger emergency behavior.
   ESR requires an applicable reported range.
6. Labels that resemble diagnoses are softened to observation language. A recorded
   diagnosis is displayed only with its supplied confirmation state.
7. ASCVD, CHA2DS2-VASc, FRAX, and NEWS2 formulas were named but not supplied. No score
   is calculated. A FRAX result is displayable only when a trusted source explicitly
   identifies an approved implementation and version.
8. Pediatric, pregnancy, frailty, ethnicity, renal-disease, treatment-target, and
   several medication/fitness modifiers are incomplete. Affected interpretations are
   suppressed or marked for clinician review.
9. Guideline organizations were cited, but exact guideline versions and URLs were not
   supplied. The configuration must not claim guideline validation until those
   references are approved and recorded.

## Product/data gaps

- Renal/urinary is not a configured body system. Kidneys must not be grouped under
  Digestive or Immune.
- Nervous, Musculoskeletal, Immune, and Endocrine lack an accurate current GLB
  representation. They remain text-only.
- Structured current symptoms and preventive-care gaps are not supplied by the
  connected patient-record APIs.
- Observation provenance can be shown only to the depth supplied by the source.
  Missing dates, source ranges, verification, facilities, or report links are stated
  explicitly rather than inferred.
