import { mockApiRequest, mockApiRequestBlob } from "../mock/mockApi";

export const API_BASE_URL = "mock://elly-prototype/api";

export const apiRequest = async (path, options = {}) => {
  return mockApiRequest(path, options);
};

export const apiRequestBlob = async (path, options = {}) => {
  return mockApiRequestBlob(path, options);
};
