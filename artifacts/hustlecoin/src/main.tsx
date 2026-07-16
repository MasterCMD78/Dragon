import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// On Replit, path-based routing proxies /api/* to the API server, so relative
// URLs work and no base URL is needed (VITE_API_URL is unset).
// On Railway (and any deployment where the API is a separate service/domain),
// set VITE_API_URL to the API server's full URL, e.g.:
//   VITE_API_URL=https://workspaceapi-server-production-ed9c.up.railway.app
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
