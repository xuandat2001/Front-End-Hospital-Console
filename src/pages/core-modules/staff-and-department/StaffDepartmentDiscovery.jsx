import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "../../../components/dashboard/Icon";
import Pagination from "../../../components/dashboard/Pagination";
import { staffService } from "../../../services/core-modules/staffApi";
import { hospitalService } from "../../../services/core-modules/hospitalApi";
import MiniPieChart from "../../../components/graphs/MiniPieChart";
import BarChart from "../../../components/graphs/BarChart";

const STAFF_PAGE_SIZE = 8;
const DEPARTMENT_PAGE_SIZE = 6;

const includesSearch = (value, query) =>
  String(value || "").toLowerCase().includes(query);

export default function StaffDepartmentDiscovery({ defaultMode = "staff" }) {
  const [allStaff, setAllStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState(defaultMode);
  const [expandedDepartment, setExpandedDepartment] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const [departmentPage, setDepartmentPage] = useState(1);
  const [showSearch, setShowSearch] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [staffRes, deptsRes, hospRes] = await Promise.allSettled([
        staffService.getAllStaff(),
        hospitalService.getAllDepartmentsList(),
        hospitalService.getAllHospitals(),
      ]);

      if (staffRes.status === "fulfilled") {
        setAllStaff(staffRes.value.data || []);
      } else {
        console.warn("Staff load failed:", staffRes.reason);
      }

      if (deptsRes.status === "fulfilled") {
        setDepartments(deptsRes.value || []);
      } else {
        console.warn("Departments load failed:", deptsRes.reason);
      }

      if (hospRes.status === "fulfilled") {
        setHospitals(hospRes.value.data || []);
      } else {
        console.warn("Hospitals load failed:", hospRes.reason);
      }
    } catch (err) {
      setError(err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(fetchAll, 0);
    return () => clearTimeout(id);
  }, [fetchAll]);

  const hospitalLookup = useMemo(() => {
    const map = new Map();
    hospitals.forEach((h) => {
      [h.ellyHospitalId, h._id, h.hospitalName]
        .filter(Boolean)
        .forEach((k) => map.set(String(k), h));
    });
    return map;
  }, [hospitals]);

  const getHospitalName = useCallback(
    (item) => {
      if (item.hospital?.hospitalName) return item.hospital.hospitalName;
      if (item.hospitalId && typeof item.hospitalId === "object")
        return item.hospitalId.hospitalName || "";
      const id = String(item.hospitalId || item.ellyHospitalId || "");
      return hospitalLookup.get(id)?.hospitalName || "";
    },
    [hospitalLookup],
  );

  const departmentLookup = useMemo(() => {
    const map = new Map();
    departments.forEach((d) => {
      [d.ellyDepartmentId, d._id, d.name]
        .filter(Boolean)
        .forEach((k) => map.set(String(k), d));
    });
    return map;
  }, [departments]);

  const getDepartmentName = useCallback(
    (person) => {
      if (person.departmentId && typeof person.departmentId === "object")
        return person.departmentId.name || "";
      const id = String(person.departmentId || "");
      return departmentLookup.get(id)?.name || "";
    },
    [departmentLookup],
  );

  const getDepartmentSpecialty = useCallback(
    (person) => {
      if (person.departmentId && typeof person.departmentId === "object")
        return person.departmentId.specialty || "";
      const id = String(person.departmentId || "");
      return departmentLookup.get(id)?.specialty || "";
    },
    [departmentLookup],
  );

  const getDepartmentHospital = useCallback(
    (dept) => {
      if (dept.hospital && typeof dept.hospital === "object")
        return dept.hospital;
      if (dept.hospitalId && typeof dept.hospitalId === "object")
        return dept.hospitalId;
      const h = hospitalLookup.get(
        String(dept.ellyHospitalId || dept.hospitalId || ""),
      );
      return h || { hospitalName: dept.hospitalName || dept.hospital || "" };
    },
    [hospitalLookup],
  );

  const filteredStaff = useMemo(() => {
    if (searchMode !== "staff") return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allStaff;
    return allStaff.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(q) ||
        p.ellyId?.toLowerCase().includes(q) ||
        p._id?.toLowerCase().includes(q),
    );
  }, [allStaff, searchQuery, searchMode]);

  const staffByDepartment = useMemo(() => {
    const map = new Map();
    allStaff.forEach((p) => {
      const deptId = String(p.departmentId || "");
      if (!deptId) return;
      const list = map.get(deptId) || [];
      list.push(p);
      map.set(deptId, list);
    });
    return map;
  }, [allStaff]);

  const getStaffForDepartment = useCallback(
    (dept) => {
      return (
        staffByDepartment.get(String(dept.ellyDepartmentId || "")) || []
      );
    },
    [staffByDepartment],
  );

  const filteredDepartments = useMemo(() => {
    if (searchMode === "staff") return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => {
      const hosp = getDepartmentHospital(d);
      const matchesSearch =
        includesSearch(d.name, q) ||
        includesSearch(d.specialty, q) ||
        includesSearch(d.description, q) ||
        includesSearch(d.ellyDepartmentId, q) ||
        includesSearch(d._id, q) ||
        includesSearch(d.id, q) ||
        includesSearch(d.status, q) ||
        includesSearch(d.floor, q) ||
        includesSearch(d.roomPrefix, q) ||
        includesSearch(d.hospitalName, q) ||
        includesSearch(hosp.hospitalName, q) ||
        includesSearch(hosp.ellyHospitalId, q);
      return matchesSearch;
    });
  }, [departments, searchQuery, searchMode, getDepartmentHospital]);

  const staffPages = Math.max(
    1,
    Math.ceil(filteredStaff.length / STAFF_PAGE_SIZE),
  );
  const safeStaffPage = Math.min(staffPage, staffPages);
  const visibleStaff = filteredStaff.slice(
    (safeStaffPage - 1) * STAFF_PAGE_SIZE,
    safeStaffPage * STAFF_PAGE_SIZE,
  );

  const deptPages = Math.max(
    1,
    Math.ceil(filteredDepartments.length / DEPARTMENT_PAGE_SIZE),
  );
  const safeDeptPage = Math.min(departmentPage, deptPages);
  const visibleDepartments = filteredDepartments.slice(
    (safeDeptPage - 1) * DEPARTMENT_PAGE_SIZE,
    safeDeptPage * DEPARTMENT_PAGE_SIZE,
  );

  const resetPages = () => {
    setStaffPage(1);
    setDepartmentPage(1);
  };

  const handleModeChange = (mode) => {
    setSearchMode(mode);
    setSearchQuery("");
    setExpandedDepartment("");
    resetPages();
  };

  const roleLabel = (role) =>
    role?.toUpperCase() === "NURSE" ? "Nurse" : "Doctor";

  const summary = useMemo(
    () => ({
      staff: allStaff.length,
      departments: departments.length,
      hospitals: hospitals.length,
    }),
    [allStaff, departments, hospitals],
  );

  const roleCounts = useMemo(() => {
    const counts = { DOCTOR: 0, NURSE: 0 };
    allStaff.forEach((p) => {
      const role = (p.role || "DOCTOR").toUpperCase();
      if (role === "NURSE") counts.NURSE++;
      else counts.DOCTOR++;
    });
    return counts;
  }, [allStaff]);

  const statusCounts = useMemo(() => {
    const counts = {};
    allStaff.forEach((p) => {
      const s = p.status || "UNKNOWN";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [allStaff]);

  const deptStatusCounts = useMemo(() => {
    const counts = {};
    departments.forEach((d) => {
      const s = d.status || "ACTIVE";
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [departments]);

  const topDepartments = useMemo(() => {
    return [...departments]
      .map((d) => ({
        name: d.name || "Unknown",
        count: getStaffForDepartment(d).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [departments, getStaffForDepartment]);

  const showStaff = searchMode === "staff";
  const showDepartments = searchMode === "department";

  return (
    <div className="discovery-page">
      <header className="discovery-header">
        <div>
          <span className="discovery-eyebrow">
            <Icon name="hospital" size={14} />
            Care network
          </span>
          <h1>Staff & Department Discovery</h1>
          <p>
            Search across staff, departments, specialties, and hospital
            locations.
          </p>
        </div>
        <div className="discovery-summary">
          <span>
            <strong>{summary.staff}</strong> Staff
          </span>
          <span>
            <strong>{summary.departments}</strong> Departments
          </span>
          <span>
            <strong>{summary.hospitals}</strong> Hospitals
          </span>
        </div>
        <button
          className="btn btn-primary"
          style={{ alignSelf: "flex-start", marginTop: 8 }}
          onClick={() => setShowSearch(!showSearch)}
          type="button"
        >
          {showSearch ? "Hide Search" : "Search"}
        </button>
      </header>

      <div className="discovery-pie-grid">
        <div className="card chart-card">
          <MiniPieChart
            slices={[
              { label: "Doctors", value: roleCounts.DOCTOR, color: "#8B5CF6" },
              { label: "Nurses", value: roleCounts.NURSE, color: "#06B6D4" },
            ]}
            centerLabel={`${allStaff.length}\nStaff by Role`}
          />
        </div>
        <div className="card chart-card">
          <MiniPieChart
            slices={Object.entries(statusCounts)
              .filter(([, v]) => v > 0)
              .map(([status, count]) => {
                const palette = {
                  AVAILABLE: "#22C55E",
                  ACTIVE: "#3B82F6",
                  BUSY: "#F59E0B",
                  OFF_DUTY: "#6B7280",
                  ON_LEAVE: "#F97316",
                  INACTIVE: "#EF4444",
                };
                return {
                  label: status,
                  value: count,
                  color: palette[status] || "#A78BFA",
                };
              })}
            centerLabel={`${allStaff.length}\nStaff by Status`}
          />
        </div>
        <div className="card chart-card">
          <MiniPieChart
            slices={Object.entries(deptStatusCounts)
              .filter(([, v]) => v > 0)
              .map(([status, count]) => ({
                label: status,
                value: count,
                color: status === "ACTIVE" ? "#22C55E" : "#EF4444",
              }))}
            centerLabel={`${departments.length}\nDepartments`}
          />
        </div>
      </div>
      <div className="discovery-bar-grid">
        <div className="card chart-card chart-card-wide">
          <span className="chart-card-title">Top Departments by Staff</span>
          <BarChart
            data={topDepartments.map((d) => d.count)}
            labels={topDepartments.map((d) => d.name)}
          />
        </div>
      </div>

      {showSearch && (
        <section className="discovery-search-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            resetPages();
          }}
        >
          <label className="select-shell">
            <Icon name="analytics" size={17} />
            <span>
              <small>Search by</small>
              {searchMode === "staff"
                ? "Staff Name/ID"
                : "Department/Specialty"}
            </span>
            <select
              aria-label="Search mode"
              value={searchMode}
              onChange={(e) => handleModeChange(e.target.value)}
            >
              <option value="staff">Staff Name/ID</option>
              <option value="department">Department/Specialty</option>
            </select>
            <Icon name="chevronDown" size={15} />
          </label>

          <label className="discovery-search-input">
            <Icon name="sparkle" size={17} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetPages();
              }}
              placeholder={
                searchMode === "staff"
                  ? "Search by staff name or ID..."
                  : "Cardiology, neurology, emergency..."
              }
            />
          </label>

          <button className="btn btn-primary" type="submit">
            Search
          </button>
          {searchQuery && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setSearchQuery("");
                resetPages();
              }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="discovery-search-footer">
          <p>
            Search across staff, departments, specialties, and hospital
            locations.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={fetchAll}
          >
            <Icon name="hospital" size={15} />
            {loading ? "Loading..." : "Refresh data"}
          </button>
        </div>
      </section>)}

      {showSearch && (<>
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="discovery-loading" aria-live="polite">
          <span />
          Loading care network...
        </div>
      ) : (
        <>
          {showStaff && visibleStaff.length > 0 && (
            <section className="discovery-section">
              <div className="discovery-section-heading">
                <div>
                  <h2>Staff</h2>
                  <p>Clinical staff across the care network.</p>
                </div>
                <span>{filteredStaff.length} matches</span>
              </div>
              <div className="department-result-grid">
                {visibleStaff.map((person) => {
                  const deptName = getDepartmentName(person);
                  const deptSpecialty = getDepartmentSpecialty(person);
                  const hospName = getHospitalName(person);
                  return (
                    <article
                      key={person._id}
                      className="card department-result-card"
                    >
                      <header>
                        <span className="department-result-icon">
                          <Icon name="operations" size={19} />
                        </span>
                        <div>
                          <h3>{person.fullName}</h3>
                          <p>
                            {roleLabel(person.role)}
                            {person.specialization
                              ? ` · ${person.specialization}`
                              : ""}
                          </p>
                        </div>
                        <span className="status-chip">
                          {person.status || "UNKNOWN"}
                        </span>
                      </header>

                      <dl>
                        <div>
                          <dt>Department</dt>
                          <dd>{deptName || "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Specialty</dt>
                          <dd>
                            {person.specialization || deptSpecialty || "General"}
                          </dd>
                        </div>
                        <div>
                          <dt>Hospital</dt>
                          <dd>{hospName || "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>ID</dt>
                          <dd>{person.ellyId || person._id}</dd>
                        </div>
                      </dl>

                      <footer className="staff-footer">
                        {person.qualification && (
                          <span>
                            <strong>Qualification:</strong>{" "}
                            {person.qualification}
                          </span>
                        )}
                        {typeof person.experienceYears === "number" && (
                          <span>
                            <strong>Experience:</strong>{" "}
                            {person.experienceYears} years
                          </span>
                        )}
                      </footer>
                    </article>
                  );
                })}
              </div>
              <Pagination
                currentPage={safeStaffPage}
                label="staff"
                onPageChange={setStaffPage}
                pageSize={STAFF_PAGE_SIZE}
                totalItems={filteredStaff.length}
              />
            </section>
          )}

          {showDepartments && visibleDepartments.length > 0 && (
            <section className="discovery-section">
              <div className="discovery-section-heading">
                <div>
                  <h2>Departments</h2>
                  <p>Clinical departments matching your search.</p>
                </div>
                <span>{filteredDepartments.length} matches</span>
              </div>
              <div className="department-result-grid">
                {visibleDepartments.map((dept) => {
                  const id = dept._id || dept.id;
                  const isExpanded = expandedDepartment === id;
                  const hospital = getDepartmentHospital(dept);
                  const staffInDept = getStaffForDepartment(dept);
                  const availableStaff = staffInDept.filter(
                    (s) => s.status === "AVAILABLE",
                  );

                  return (
                    <article
                      className="card department-result-card"
                      key={id}
                    >
                      <header>
                        <span className="department-result-icon">
                          <Icon name="operations" size={19} />
                        </span>
                        <div>
                          <h3>{dept.name}</h3>
                          <p>{dept.specialty || "General medicine"}</p>
                        </div>
                        <button
                          aria-expanded={isExpanded}
                          className="status-chip"
                          onClick={() =>
                            setExpandedDepartment(isExpanded ? "" : id)
                          }
                          type="button"
                        >
                          {dept.status || "Active"}
                        </button>
                      </header>

                      <p className="department-description">
                        {dept.description ||
                          "Clinical department information is available on request."}
                      </p>

                      <dl>
                        <div>
                          <dt>Hospital</dt>
                          <dd>{hospital.hospitalName || "Not assigned"}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>
                            {[dept.floor, dept.roomPrefix]
                              .filter(Boolean)
                              .join(" · ") || "Contact department"}
                          </dd>
                        </div>
                        <div>
                          <dt>Staff</dt>
                          <dd className="availability-value">
                            <span className="pulse-dot" />
                            {staffInDept.length} ({availableStaff.length}{" "}
                            available)
                          </dd>
                        </div>
                      </dl>

                      {isExpanded && (
                        <div className="department-expanded">
                          <strong>Staff in this department</strong>
                          {staffInDept.length ? (
                            staffInDept.map((person) => (
                              <span key={person._id}>
                                {person.fullName}
                                <small>
                                  {roleLabel(person.role)}
                                  {person.specialization
                                    ? ` · ${person.specialization}`
                                    : ""}
                                  {person.status === "AVAILABLE"
                                    ? " · Available"
                                    : ""}
                                </small>
                              </span>
                            ))
                          ) : (
                            <p>No staff assigned to this department.</p>
                          )}
                        </div>
                      )}

                      <footer>
                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            setExpandedDepartment(isExpanded ? "" : id)
                          }
                          type="button"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
              <Pagination
                currentPage={safeDeptPage}
                label="departments"
                onPageChange={setDepartmentPage}
                pageSize={DEPARTMENT_PAGE_SIZE}
                totalItems={filteredDepartments.length}
              />
            </section>
          )}

          {!loading && !error && (
            <>
              {showStaff && filteredStaff.length === 0 && (
                <div className="discovery-empty">
                  <Icon name="hospital" size={28} />
                  <h2>No staff found</h2>
                  <p>
                    {searchQuery
                      ? "Try a different name or ID."
                      : "No staff data is currently available."}
                  </p>
                </div>
              )}
              {showDepartments && filteredDepartments.length === 0 && (
                <div className="discovery-empty">
                  <Icon name="hospital" size={28} />
                  <h2>No departments found</h2>
                  <p>
                    {searchQuery
                      ? "Try a different search term."
                      : "No department data is currently available."}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
      </>)}
    </div>
  );
}
