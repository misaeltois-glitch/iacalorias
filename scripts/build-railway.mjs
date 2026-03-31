import { execSync } from "node:child_process";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function run(cmd, env = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, ...env },
  });
}

console.log("=== Railway Build ===\n");

// 1. Build the API server
run("pnpm --filter @workspace/api-server run build");

// 3. Build the frontend (at root path, no Replit-specific base path)
run("pnpm --filter @workspace/ia-calorias run build", {
  NODE_ENV: "production",
  BASE_PATH: "/",
  PORT: "3000",
});

// 4. Copy frontend static files into the API server dist folder
const frontendDist = path.join(root, "artifacts/ia-calorias/dist/public");
const apiPublicDir = path.join(root, "artifacts/api-server/dist/public");

if (!existsSync(frontendDist)) {
  console.error(`❌ Frontend dist not found at: ${frontendDist}`);
  process.exit(1);
}

mkdirSync(apiPublicDir, { recursive: true });
cpSync(frontendDist, apiPublicDir, { recursive: true });

console.log(`\n✅ Frontend copied to ${apiPublicDir}`);
console.log("=== Build complete ===\n");
