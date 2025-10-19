// Flask-only deployment - Node.js proxy removed
// This file installs Python dependencies and starts Flask
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log("🚀 Starting Flask application (Node.js proxy disabled)");
console.log(`Project root: ${projectRoot}`);
console.log(`PORT: ${process.env.PORT || '5000'}`);

// Install Python dependencies in production
const requirementsPath = join(projectRoot, 'requirements.txt');
if (existsSync(requirementsPath)) {
  console.log("📦 Installing Python dependencies...");
  const installResult = spawnSync("pip", ["install", "-r", "requirements.txt", "--quiet"], {
    cwd: projectRoot,
    stdio: "inherit"
  });
  
  if (installResult.status !== 0) {
    console.error("❌ Failed to install Python dependencies");
    process.exit(1);
  }
  console.log("✅ Python dependencies installed");
}

const flaskProcess = spawn("python", ["app.py"], {
  stdio: "inherit",
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: process.env.PORT || "5000",
    PYTHONUNBUFFERED: "1"
  }
});

flaskProcess.on("error", (err: Error) => {
  console.error("❌ Failed to start Flask:", err);
  process.exit(1);
});

flaskProcess.on("exit", (code: number | null, signal: string | null) => {
  console.error(`❌ Flask process exited with code ${code}, signal ${signal}`);
  process.exit(code || 1);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping Flask...');
  flaskProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping Flask...');
  flaskProcess.kill('SIGINT');
});
