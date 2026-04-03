import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./hooks/use-meal-reminders";
import { initTracking } from "./lib/tracking";

registerServiceWorker();
initTracking();

createRoot(document.getElementById("root")!).render(<App />);
