import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./hooks/use-meal-reminders";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
