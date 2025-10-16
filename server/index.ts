import { spawn } from "child_process";

console.log("Starting Flask application...");

const flask = spawn("python", ["app.py"], {
  stdio: "inherit",
  env: process.env
});

flask.on("error", (err) => {
  console.error("Failed to start Flask:", err);
  process.exit(1);
});

flask.on("exit", (code) => {
  console.log(`Flask exited with code ${code}`);
  process.exit(code || 0);
});

process.on("SIGTERM", () => {
  flask.kill("SIGTERM");
});

process.on("SIGINT", () => {
  flask.kill("SIGINT");
});
