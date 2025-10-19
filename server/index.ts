// Flask-only deployment - optimized startup
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log("🚀 Starting Flask application");
console.log(`Project root: ${projectRoot}`);
console.log(`PORT: ${process.env.PORT || '5000'}`);

// Start Flask directly - dependencies installed during build
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
