import { spawn } from "child_process";

console.log("Starting Flask application on port 5000...");

const flask = spawn("python", ["app.py"], {
  stdio: "inherit",
  env: { 
    ...process.env,
    PORT: "5000"
  }
});

flask.on("error", (err) => {
  console.error("Failed to start Flask:", err);
  process.exit(1);
});

flask.on("close", (code) => {
  console.log(`Flask process exited with code ${code}`);
  process.exit(code || 0);
});

// Keep Node.js process alive while Flask is running
process.on('SIGINT', () => {
  flask.kill();
  process.exit(0);
});
