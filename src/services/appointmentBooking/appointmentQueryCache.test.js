import { beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentQuery, clearAppointmentQueryCache, invalidateAppointmentQueries, setAppointmentQueryData } from "./appointmentQueryCache";

describe("appointmentQuery", () => {
  beforeEach(clearAppointmentQueryCache);

  it("deduplicates simultaneous requests and reuses fresh data", async () => {
    const queryFn = vi.fn(async () => ({ data: ["appointment-1"] }));
    const options = { key: ["appointments", "hospital-1", { page: 1 }], queryFn, staleTime: 30_000 };

    const [first, second] = await Promise.all([appointmentQuery(options), appointmentQuery(options)]);
    const third = await appointmentQuery(options);

    expect(first).toEqual(second);
    expect(third).toEqual(first);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("updates a cached appointment page without refetching", async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [{ _id: "old" }], pagination: { total: 1 } });
    const key = ["appointments", "hospital-1", { page: 1 }];
    await appointmentQuery({ key, queryFn });
    setAppointmentQueryData(key, (current) => ({ ...current, data: [{ _id: "new" }, ...current.data], pagination: { total: 2 } }));
    const cached = await appointmentQuery({ key, queryFn });
    expect(cached.data.map((row) => row._id)).toEqual(["new", "old"]);
    expect(cached.pagination.total).toBe(2);
    expect(queryFn).toHaveBeenCalledOnce();
  });

  it("invalidates only the selected appointment query family", async () => {
    const listLoader = vi.fn(async () => "list");
    const dashboardLoader = vi.fn(async () => "dashboard");
    await appointmentQuery({ key: ["appointments", "hospital-1", { page: 1 }], queryFn: listLoader });
    await appointmentQuery({ key: ["appointment-dashboard", "hospital-1"], queryFn: dashboardLoader });

    invalidateAppointmentQueries(["appointments", "hospital-1"]);
    await appointmentQuery({ key: ["appointments", "hospital-1", { page: 1 }], queryFn: listLoader });
    await appointmentQuery({ key: ["appointment-dashboard", "hospital-1"], queryFn: dashboardLoader });

    expect(listLoader).toHaveBeenCalledTimes(2);
    expect(dashboardLoader).toHaveBeenCalledTimes(1);
  });
});
