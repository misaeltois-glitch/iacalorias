import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.use("/api/subscription/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (used by Railway)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

// Serve React SPA in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticPath = path.join(__dirname, "public");

  if (existsSync(staticPath)) {
    // JS/CSS assets have content-hash names — cache forever
    app.use(express.static(staticPath, { maxAge: '1y', etag: false }));

    // SPA fallback: all non-API routes serve index.html with no-cache
    // so the browser always fetches the latest HTML (which references the latest hashed bundles)
    app.get("/{*path}", (_req, res) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(staticPath, "index.html"));
    });

    logger.info({ staticPath }, "Serving frontend static files");
  } else {
    logger.warn({ staticPath }, "Frontend static files not found — SPA not served");
  }
}

export default app;
