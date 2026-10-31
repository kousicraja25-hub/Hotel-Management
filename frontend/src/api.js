import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});

export function setApiToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    window.sessionStorage.setItem("canteen-token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    window.sessionStorage.removeItem("canteen-token");
  }
}

const savedToken = window.sessionStorage.getItem("canteen-token");
if (savedToken) api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;

export function apiError(error) {
  if (!error?.response && error?.code === "ERR_NETWORK") {
    return "The API server is unavailable. Start the backend and configure its MongoDB connection.";
  }
  return error?.response?.data?.error || error?.response?.data?.message || error?.message || "Something went wrong. Please try again.";
}
