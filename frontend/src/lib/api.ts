import axios from "axios";

const isElectron = !!(window as any).electronAPI?.isElectron || window.location.protocol === "file:";

// Default server: the production VPS. Overridable via the connection screen.
const DEFAULT_SERVER = "http://62.238.98.166";

function getBaseURL(): string {
  const saved = localStorage.getItem("apiUrl");
  if (saved) return saved.replace(/\/+$/, "") + "/api";
  return isElectron ? `${DEFAULT_SERVER}/api` : "/api";
}

export function getApiUrl(): string {
  return getBaseURL();
}

export function setApiUrl(url: string) {
  localStorage.setItem("apiUrl", url.trim());
}

export function getDefaultServer(): string {
  return DEFAULT_SERVER;
}

// Connection-error listeners (used by ConnectionGate to show the error screen).
let connectionErrorListener: (() => void) | null = null;

export function onConnectionError(cb: () => void): () => void {
  connectionErrorListener = cb;
  return () => { connectionErrorListener = null; };
}

export function clearConnectionError() {
  connectionErrorListener = null;
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = isElectron ? "#/login" : "/login";
    } else if (!error.response) {
      // Network failure — the server is unreachable. Only notify if connected once.
      connectionErrorListener?.();
    }
    return Promise.reject(error);
  }
);

export default api;
