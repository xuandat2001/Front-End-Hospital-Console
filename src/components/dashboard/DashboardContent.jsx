import ModuleBar from "./ModuleBar";
import FunctionTabBar from "./FunctionTabBar";
import NotificationBar from "./NotificationBar";
import OperationsDashboard from "./CommandsOverview";
import WorkspacePlaceholder from "./WorkspacePlaceholder";
import AccessDenied from "../auth/AccessDenied";
import RolePagePlaceholder from "./RolePagePlaceholder";
import { canAccessFunction } from "../../constant/pagePermissions";
import { ROLES, usesRolePlaceholder } from "../../constant/rbac";
import useSessionStore from "../../store/useSessionStore";

import DepartmentManagement from "../../pages/core-modules/staff-and-department/DepartmentManagement";
import StaffDepartmentDiscovery from "../../pages/core-modules/staff-and-department/StaffDepartmentDiscovery";
import StaffDepartmentManagement from "../../pages/core-modules/staff-and-department/StaffDepartmentManagement";
import StaffManagement from "../../pages/core-modules/staff-and-department/StaffManagement";
import AppointmentBookingManagement from "../../pages/appointmentBooking/AppointmentBookingManagement";
import StaffSchedule from "../../pages/core-modules/staff-and-department/StaffSchedule";
import PatientRegistrationQueue from "../../pages/operations/patient-registration/PatientRegistrationQueue";
import PatientRegistrationPerformance from "../../pages/operations/patient-registration/PatientRegistrationPerformance";
import PatientRegistrationReports from "../../pages/operations/patient-registration/PatientRegistrationReports";
import PatientManagement from "../../pages/core-modules/patients/PatientManagement";
import PatientDashboard from "../../pages/core-modules/patients/PatientDashboard";
import PatientPerformance from "../../pages/core-modules/patients/PatientPerformance";
import PatientPlanning from "../../pages/core-modules/patients/PatientPlanning";
import PatientReports from "../../pages/core-modules/patients/PatientReports";
import RoomManagement from "../../pages/core-modules/rooms/RoomManagement";
import RoomOccupancy from "../../pages/core-modules/rooms/RoomOccupancy";
import IcuMonitoring from "../../pages/core-modules/icu/IcuMonitoring";
import RoomPerformanceDashboard from "../../pages/performance/RoomPerformanceDashboard";
import AdmissionList from "../../pages/operations/admission/AdmissionList";
import WardPlanning from "../../pages/core-modules/rooms/WardPlanning";
import StaffCoverageView from "../../components/staff/StaffCoverageView";
import OverviewPerformance from "../../pages/overview/OverviewPerformance";
import StaffPerformanceDashboard from "../../pages/performance/StaffPerformanceDashboard";
import Emergency from "../../pages/operations/emergency/Emergency";
import SurgeryRecords from "../../pages/operations/surgery/SurgeryRecords";
import SurgeryPlanning from "../../pages/operations/surgery/SurgeryPlanning";
import SurgeryManagement from "../../pages/operations/surgery/SurgeryManagement";
import PatientWorkflow from "../../pages/operations/admission/PatientWorkflow";
import AdmissionManagement from "../../pages/operations/admission/AdmissionManagement";
import NotificationsList from "../../pages/notifications/NotificationsList";
import IntelligenceAnalytics from "../../pages/intelligence/IntelligenceAnalytics";
import AnalyticsDashboard from "../../pages/intelligence/analytics/AnalyticsDashboard";
import IntelligencePerformance from "../../pages/intelligence/analytics/PerformanceAnalytics";
import IntelligenceInsights from "../../pages/intelligence/IntelligenceInsights";
import ReportList from "../../pages/reports/ReportList";
import AdmissionPerformance from "../../pages/performance/AdmissionPerformance";
import SurgeryPerformanceDashboard from "../../pages/performance/SurgeryPerformanceDashboard";
import ClinicSurgeryRequest from "../../pages/operations/surgery/ClinicSurgeryRequest";
import ClinicDoctorDashboard from "../../pages/operations/surgery/ClinicDoctorDashboard";
import WelcomePage from "../../pages/welcome/WelcomePage";

function DashboardContent({
  activeFunction,
  activeCenterTab,
  onCenterTabChange,
  emergencyRealtime,
  registrationRealtime,
  emergencyNavigation,
  onNavigationOpen,
  onNotificationsOpen,
  onNotificationsBack,
  onEmergencyRequestOpen,
  onRegistrationRequestOpen,
  selectedRoomId,
}) {
  const permissions = useSessionStore((state) => state.permissions);
  const currentUser = useSessionStore((state) => state.currentUser);
  const canViewPage = canAccessFunction(activeFunction, permissions);
  const showRolePlaceholder = usesRolePlaceholder(currentUser?.role);
  const hideFunctionTabBar = activeFunction === "icu-monitoring" || activeFunction === "welcome";

  const isDoctorConsole =
    currentUser?.role === ROLES.DOCTOR || currentUser?.role === ROLES.CLINIC_DOCTOR;
  const surgeryDoctorActive = isDoctorConsole && [
    "surgery-records", "surgery-performance", "surgery-planning",
    "surgery-reports", "surgery-management",
  ].includes(activeFunction);

  const pageContent = activeFunction === "welcome" ? (
    <div className="h-full overflow-y-auto">
      <WelcomePage />
    </div>
  ) : !canViewPage ? (
    <AccessDenied />
  ) : surgeryDoctorActive ? (
    <div className="h-full overflow-y-auto">
      <ClinicSurgeryRequest />
    </div>
  ) : showRolePlaceholder && activeFunction !== "clinic-doctor-dashboard" && activeFunction !== "clinic-doctor-surgery-request" ? (
    <RolePagePlaceholder activeFunction={activeFunction} />
  ) : activeFunction === "clinic-doctor-dashboard" ? (
    <div className="h-full overflow-y-auto">
      <ClinicDoctorDashboard />
    </div>
  ) : activeFunction === "clinic-doctor-surgery-request" ? (
    <div className="h-full overflow-y-auto">
      <ClinicSurgeryRequest />
    </div>
  ) : activeFunction === "notifications" ? (
          <div className="h-full overflow-y-auto">
            <NotificationsList
              realtime={emergencyRealtime}
              registrationRealtime={registrationRealtime}
              onBack={onNotificationsBack}
              onEmergencyRequestOpen={onEmergencyRequestOpen}
              onRegistrationRequestOpen={onRegistrationRequestOpen}
            />
          </div>
        ) : activeFunction === "department-management" ? (
          <div className="h-full overflow-y-auto">
            <DepartmentManagement />
          </div>
        ) : activeFunction === "departments" ? (
          <div className="h-full overflow-y-auto">
            <StaffDepartmentDiscovery defaultMode="department" />
          </div>
        ) : activeFunction === "emergency" ? (
          <Emergency
            key={emergencyNavigation?.navigationId || "emergency"}
            activeTab={activeCenterTab}
            realtime={emergencyRealtime}
            navigationTarget={emergencyNavigation}
          />
        ) : activeFunction === "doctor-management" ? (
          <div className="h-full overflow-y-auto">
            <StaffManagement />
          </div>
        ) : activeFunction === "appointment-booking-management" ? (
          <div className="h-full overflow-y-auto">
            <AppointmentBookingManagement activeTab={activeCenterTab} />
          </div>
        ) : activeFunction === "staff-department-management" ? (
          <div className="h-full overflow-y-auto">
            <StaffDepartmentManagement />
          </div>
        ) : activeFunction === "staff" ? (
          <div className="h-full overflow-y-auto">
            <StaffDepartmentDiscovery defaultMode="staff" />
          </div>
        ) : activeFunction === "staff-schedule" ? (
          <div className="h-full overflow-y-auto">
            <StaffSchedule />
          </div>
        ) : activeFunction === "staffing" ? (
          <div className="h-full overflow-y-auto">
            <div className="p-6 pb-4">
              <h1 className="text-2xl font-bold dark:text-white">Weekly Coverage</h1>
            </div>
            <StaffCoverageView />
          </div>
        ) : activeFunction === "overview-performance" ? (
          <div className="h-full overflow-y-auto">
            <OverviewPerformance />
          </div>
        ) : activeFunction === "overview-reports" ? (
          <div className="h-full overflow-y-auto">
            <ReportList title="All Reports" showCreate />
          </div>
        ) : activeFunction === "patient" ? (
          <div className="h-full overflow-y-auto">
            <PatientRegistrationQueue />
          </div>
        ) : activeFunction === "patient-registration-performance" ? (
          <div className="h-full overflow-y-auto">
            <PatientRegistrationPerformance />
          </div>
        ) : activeFunction === "patient-registration-reports" ? (
          <div className="h-full overflow-y-auto">
            <PatientRegistrationReports />
          </div>
        ) : activeFunction === "patient-dashboard" ? (
          <div className="patient-fit-page h-full min-h-0 overflow-hidden">
            <PatientDashboard />
          </div>
        ) : activeFunction === "patient-performance" ? (
          <div className="patient-fit-page h-full min-h-0 overflow-hidden">
            <PatientPerformance />
          </div>
        ) : activeFunction === "patient-planning" ? (
          <div className="patient-fit-page h-full min-h-0 overflow-hidden">
            <PatientPlanning />
          </div>
        ) : activeFunction === "patient-management" ? (
          <div className="patient-fit-page h-full min-h-0 overflow-hidden">
            <PatientManagement />
          </div>
        ) : activeFunction === "patient-reports" ? (
          <div className="patient-fit-page h-full min-h-0 overflow-hidden">
            <PatientReports />
          </div>
        ) : activeFunction === "room-reports" ? (
          <div className="h-full overflow-y-auto">
            <ReportList category="EQUIPMENT" title="Equipment Reports" showCreate />
          </div>
        ) : activeFunction === "staff-reports" ? (
          <div className="h-full overflow-y-auto">
            <ReportList category="STAFF" title="Staff Reports" showCreate />
          </div>
        ) : activeFunction === "admission-reports" ? (
          <div className="h-full overflow-y-auto">
            <ReportList category="INCIDENT" title="Incident Reports" showCreate />
          </div>
        ) : activeFunction === "surgery-reports" ? (
          <div className="h-full overflow-y-auto">
            <ReportList category="MAINTENANCE" title="Maintenance Reports" showCreate />
          </div>
        ) : activeFunction === "room-management" ? (
          <div className="h-full overflow-y-auto">
            <RoomManagement selectedRoomId={selectedRoomId} />
          </div>
        ) : activeFunction === "admissions" ? (
          <div className="h-full overflow-y-auto">
            <AdmissionList />
          </div>
        ) : activeFunction === "admission-management" ? (
          <div className="h-full overflow-y-auto">
            <AdmissionManagement />
          </div>
        ) : activeFunction === "surgery-records" ? (
          <div className="h-full overflow-y-auto">
            <SurgeryRecords />
          </div>
        ) : activeFunction === "surgery-planning" ? (
          <div className="h-full overflow-y-auto">
            <SurgeryPlanning />
          </div>
        ) : activeFunction === "surgery-management" ? (
          <div className="h-full overflow-y-auto">
            <SurgeryManagement />
          </div>
        ) : activeFunction === "patient-workflow" ? (
          <div className="h-full overflow-y-auto">
            <PatientWorkflow />
          </div>
        ) : activeFunction === "admission-performance" ? (
          <div className="h-full overflow-y-auto">
            <AdmissionPerformance />
          </div>
        ) : activeFunction === "ward-planning" ? (
          <div className="h-full overflow-y-auto">
            <WardPlanning />
          </div>
        ) : activeFunction === "beds" || activeFunction === "room-occupancy" ? (
          <div className="h-full overflow-y-auto">
            <RoomOccupancy />
          </div>
        ) : activeFunction === "icu-monitoring" ? (
          <div className="h-full overflow-y-auto">
            <IcuMonitoring />
          </div>
        ) : activeFunction === "surgery-performance" ? (
          <div className="h-full overflow-y-auto">
            <SurgeryPerformanceDashboard />
          </div>
        ) : activeFunction === "room-performance" ? (
          <div className="h-full overflow-y-auto">
            <RoomPerformanceDashboard />
          </div>
        ) : activeFunction === "staff-performance" ? (
          <div className="h-full overflow-y-auto">
            <StaffPerformanceDashboard />
          </div>
        ) : activeFunction === "intelligence-capacity" ? (
          <div className="h-full overflow-y-auto">
            <IntelligencePerformance />
          </div>
        ) : activeFunction === "intelligence-analytics" ? (
          <div className="h-full overflow-y-auto">
            <AnalyticsDashboard />
          </div>
        ) : activeFunction.startsWith("intelligence-analytics") ||
          [
            "intelligence-workload",
            "intelligence-resources",
            "intelligence-reports",
          ].includes(activeFunction) ? (
          <div className="h-full overflow-y-auto">
            <IntelligenceAnalytics activeFunction={activeFunction} />
          </div>
        ) : activeFunction.startsWith("intelligence-insights") ||
          [
            "intelligence-recommendations",
            "intelligence-reasoning",
            "intelligence-evidence",
            "intelligence-insight-history",
          ].includes(activeFunction) ? (
          <div className="h-full overflow-y-auto">
            <IntelligenceInsights activeFunction={activeFunction} />
          </div>
        ) : ["command", "analytics", "ai-insights"].includes(activeFunction) ? (
          <OperationsDashboard activeFunction={activeFunction} />
        ) : (
          <WorkspacePlaceholder activeFunction={activeFunction} />
        );

  return (
    <section className="dashboard-workspace">
      <ModuleBar
        onNavigationOpen={onNavigationOpen}
      />
      {!hideFunctionTabBar && (
        <FunctionTabBar
          activeCenterTab={activeCenterTab}
          activeFunction={activeFunction}
          onCenterTabChange={onCenterTabChange}
        />
      )}
      <div className="dashboard-content-stage">{pageContent}</div>
      <NotificationBar
        realtime={emergencyRealtime}
        registrationRealtime={registrationRealtime}
        onNotificationsOpen={onNotificationsOpen}
      />
    </section>
  );
}

export default DashboardContent;
