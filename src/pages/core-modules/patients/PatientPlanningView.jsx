import useSessionStore from "../../../store/useSessionStore";
import { ROLES } from "../../../constant/rbac";
import PatientPlanning from "./PatientPlanning";
import DoctorAdmitPatient from "./DoctorAdmitPatient";

export default function PatientPlanningView() {
  const role = useSessionStore((state) => state.role);
  const isDoctor = role === ROLES.DOCTOR || role === ROLES.CLINIC_DOCTOR;

  return isDoctor ? <DoctorAdmitPatient /> : <PatientPlanning />;
}
