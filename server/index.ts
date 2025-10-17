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

  // Production: Flask handles everything on port 5000
  // Development: Node.js API on 5001, Flask on 5000
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, just run Flask on port 5000
    log("Production mode: Starting Flask on port 5000...");
    const flask = spawn("python", ["app.py"], {
      stdio: "inherit",
      env: { ...process.env }
    });

    flask.on("error", (err) => {
      console.error("Failed to start Flask:", err);
      process.exit(1);
    });

    flask.on("exit", (code) => {
      if (code !== 0) {
        console.error(`Flask exited with code ${code}`);
        process.exit(code || 1);
      }
    });
  } else {
    // Development: Node.js API on 5001, Flask on 5000
    const PORT = 5001;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Node.js API server running on port ${PORT}`);
    });

    log("Starting Flask application on port 5000...");
    const flask = spawn("python", ["app.py"], {
      stdio: "inherit",
      env: { 
        ...process.env,
        NODE_API_URL: `http://127.0.0.1:${PORT}`
      }
    });

    flask.on("error", (err) => {
      console.error("Failed to start Flask:", err);
    });
  }
})();
