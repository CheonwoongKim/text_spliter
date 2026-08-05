import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const workerRoot = join(process.cwd(), "services", "ragas-worker");
const virtualEnvironment = join(workerRoot, ".venv");
const python = process.platform === "win32"
  ? join(virtualEnvironment, "Scripts", "python.exe")
  : join(virtualEnvironment, "bin", "python");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: workerRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(python)) {
  run(process.env.PYTHON || "python3", ["-m", "venv", virtualEnvironment]);
}

run(python, ["-m", "pip", "install", "--upgrade", "pip"]);
run(python, ["-m", "pip", "install", "-e", ".[test]"]);
console.log(`Ragas worker environment is ready: ${python}`);
