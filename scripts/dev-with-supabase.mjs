import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const projectRefFile = join(process.cwd(), "supabase", ".temp", "project-ref");
const workerRoot = join(process.cwd(), "services", "ragas-worker");
const workerPython = process.platform === "win32"
  ? join(workerRoot, ".venv", "Scripts", "python.exe")
  : join(workerRoot, ".venv", "bin", "python");

function runSupabase(args) {
  return execFileSync("supabase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function resolveProjectRef() {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  if (existsSync(projectRefFile)) {
    return readFileSync(projectRefFile, "utf8").trim();
  }

  const projects = JSON.parse(runSupabase(["projects", "list", "--output", "json"]));
  if (projects.length !== 1) {
    throw new Error(
      "Link this repository with `supabase link --project-ref <ref>` or set SUPABASE_PROJECT_REF."
    );
  }

  return projects[0].id;
}

function resolveProjectKeys(projectRef) {
  const keys = JSON.parse(runSupabase([
    "projects",
    "api-keys",
    "--project-ref",
    projectRef,
    "--reveal",
    "--output",
    "json",
  ]));

  const secret = keys.find((key) => key.type === "secret") ||
    keys.find((key) => key.name === "service_role");
  const publishable = keys.find((key) => key.type === "publishable") ||
    keys.find((key) => key.name === "anon");

  if (!secret?.api_key) {
    throw new Error("No Supabase secret or service-role API key was found for the linked project.");
  }

  if (!publishable?.api_key) {
    throw new Error("No Supabase publishable or anon API key was found for the linked project.");
  }

  return {
    secretKey: secret.api_key,
    publishableKey: publishable.api_key,
  };
}

try {
  const projectRef = resolveProjectRef();
  const { secretKey, publishableKey } = resolveProjectKeys(projectRef);
  const nextBin = require.resolve("next/dist/bin/next");
  const args = [nextBin, "dev", ...process.argv.slice(2)];
  const externalWorker = Boolean(process.env.RAGAS_WORKER_URL);
  const workerToken = process.env.RAGAS_WORKER_TOKEN || (externalWorker ? "" : randomBytes(32).toString("hex"));
  const workerUrl = process.env.RAGAS_WORKER_URL || `http://127.0.0.1:${process.env.RAGAS_WORKER_PORT || "8001"}`;
  const parsedWorkerUrl = new URL(workerUrl);

  let worker = null;
  if (!externalWorker && existsSync(workerPython)) {
    worker = spawn(workerPython, [
      "-m", "uvicorn", "app.main:app",
      "--host", parsedWorkerUrl.hostname,
      "--port", parsedWorkerUrl.port || "8001",
      "--reload",
      "--reload-dir", "app",
    ], {
      cwd: workerRoot,
      stdio: "inherit",
      env: { ...process.env, RAGAS_WORKER_TOKEN: workerToken, RAGAS_DO_NOT_TRACK: "true" },
    });
    console.log(`Starting Ragas worker at ${workerUrl} (token hidden)`);
  } else if (!externalWorker) {
    console.warn("Ragas worker is not installed. Run `npm run ragas:setup` to enable model-judged evaluation.");
  } else if (!workerToken) {
    console.warn("RAGAS_WORKER_TOKEN is required when RAGAS_WORKER_URL points to an external worker.");
  }

  console.log(`Starting Next.js with Supabase project ${projectRef} (secret key hidden)`);

  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      APP_SUPABASE_URL: `https://${projectRef}.supabase.co`,
      APP_SUPABASE_SECRET_KEY: secretKey,
      NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      RAGAS_WORKER_URL: workerUrl,
      RAGAS_WORKER_TOKEN: workerToken,
    },
  });

  child.on("exit", (code, signal) => {
    if (worker && !worker.killed) worker.kill("SIGTERM");
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
  worker?.on("exit", (code) => {
    if (code && !child.killed) console.error(`Ragas worker exited with code ${code}.`);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
