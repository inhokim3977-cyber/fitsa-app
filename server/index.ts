import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { spawn } from "child_process";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Always start Flask on port 5001 and Node.js proxy on port 5000
  const FLASK_PORT = 5001;
  const NODE_PORT = 5000;

  // Start Flask on port 5001
  log(`Starting Flask application on port ${FLASK_PORT}...`);
  const flask = spawn("python", ["app.py"], {
    stdio: "inherit",
    env: { 
      ...process.env,
      PORT: FLASK_PORT.toString()
    }
  });

  flask.on("error", (err) => {
    console.error("Failed to start Flask:", err);
  });

  // Node.js listens on port 5000 and proxies to Flask
  server.listen(NODE_PORT, "0.0.0.0", () => {
    log(`Node.js proxy server running on port ${NODE_PORT}, forwarding to Flask on ${FLASK_PORT}`);
  });
})();
