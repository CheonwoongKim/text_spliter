import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const projectRefFile = join(process.cwd(), "supabase", ".temp", "project-ref");

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
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
