import { beforeEach, describe, expect, it, vi } from "vitest";
import { hospitalService } from "./hospitalApi";
import { apiRequest } from "../config/config";

vi.mock("../config/config", () => ({
  apiRequest: vi.fn(),
}));

beforeEach(() => {
  apiRequest.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("hospitalService department API", () => {
  it("requests paginated department pages and flattens the list", async () => {
    apiRequest
      .mockResolvedValueOnce({
        data: [{ _id: "dept-1", name: "Cardiology" }],
        pagination: { pages: 2 },
      })
      .mockResolvedValueOnce({
        data: [{ _id: "dept-2", name: "Emergency" }],
        pagination: { pages: 2 },
      });

    await expect(hospitalService.getAllDepartmentsList(1)).resolves.toEqual([
      { _id: "dept-1", name: "Cardiology" },
      { _id: "dept-2", name: "Emergency" },
    ]);

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/departments?page=1&limit=1");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/departments?page=2&limit=1");
  });

  it("encodes department discovery queries for specialty, hospital, and symptom", async () => {
    apiRequest.mockResolvedValue([]);

    await hospitalService.searchBySpecialty("heart failure");
    await hospitalService.searchByHospital("City & County");
    await hospitalService.searchBySymptom("chest pain");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/departments/search?specialty=heart%20failure");
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/departments/hospital?hospital=City%20%26%20County");
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/departments/symptom?symptom=chest%20pain");
  });

  it("sends department create, update, and delete requests", async () => {
    apiRequest.mockResolvedValue({ success: true });
    const payload = { name: "Radiology", hospitalId: "HOSP-1" };

    await hospitalService.createDepartment(payload);
    await hospitalService.updateDepartment("dept-1", { status: "INACTIVE" });
    await hospitalService.deleteDepartment("dept-1");

    expect(apiRequest).toHaveBeenNthCalledWith(1, "/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, "/departments/dept-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INACTIVE" }),
    });
    expect(apiRequest).toHaveBeenNthCalledWith(3, "/departments/dept-1", {
      method: "DELETE",
    });
  });

  it("rethrows department API failures", async () => {
    apiRequest.mockRejectedValueOnce(new Error("Request failed (404): Hospital was not found."));

    await expect(
      hospitalService.createDepartment({ name: "Radiology", hospitalId: "UNKNOWN" }),
    ).rejects.toThrow("Hospital was not found");
  });
});
