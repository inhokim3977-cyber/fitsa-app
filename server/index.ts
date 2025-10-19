import express from "express";
import { spawn } from "child_process";
import { createServer } from "http";
import compression from "compression";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Start Flask on port 5001
const FLASK_PORT = 5001;
const NODE_PORT = 5000;

// Flask readiness flag and process management
let flaskReady = false;
let flaskProcess: any = null;
let flaskRestartAttempt = 0;
const MAX_RESTART_ATTEMPTS = 5;

// ========================================
// STARTUP MIDDLEWARE (MUST BE FIRST!)
// ========================================
// Handles all requests while Flask is initializing
app.use((req, res, next) => {
  if (flaskReady) {
    return next(); // Flask ready, continue to proxy
  }

  // Log warmup requests
  console.log(`[warmup] ${req.method} ${req.path}`);

  // Helper to set common headers for warmup responses
  const setWarmupHeaders = (contentType: string, cacheControl: string = 'public, max-age=10') => {
    res.status(200)
       .type(contentType)
       .setHeader('Cache-Control', cacheControl)
       .setHeader('ETag', `"warmup-${Date.now()}"`);
  };

  // 1) GET/HEAD "/" → 200 text/html
  if (req.path === '/') {
    setWarmupHeaders('text/html', 'no-cache');
    if (req.method === 'HEAD') {
      return res.end();
    }
    return res.send('OK — starting');
  }

  // 2) GET/HEAD "/health" → 200 application/json
  if (req.path === '/health') {
    setWarmupHeaders('application/json', 'no-cache');
    if (req.method === 'HEAD') {
      return res.end();
    }
    return res.json({ status: 'ok' });
  }

  // 3) GET/HEAD .js files → 200 application/javascript
  if (req.path.endsWith('.js')) {
    setWarmupHeaders('application/javascript', 'public, max-age=60');
    if (req.method === 'HEAD') {
      return res.end();
    }
    return res.send('// warming up');
  }

  // 4) All other HEAD requests → 200 text/plain
  if (req.method === 'HEAD') {
    return res.status(200).type('text/plain').end();
  }

  // 5) All other paths → 503
  return res.status(503).json({
    error: 'Service is starting, please wait...',
    status: 'initializing'
  });
});

// Enable compression for responses >= 1KB
app.use(compression({ threshold: 1024 }));

// Flask process management with exponential backoff retry
function startFlaskProcess() {
  // Prevent duplicate processes
  if (flaskProcess && !flaskProcess.killed) {
    console.log("⚠️ Flask process already running, skipping duplicate start");
    return;
  }

  console.log(`Starting Flask application on port ${FLASK_PORT}... (attempt ${flaskRestartAttempt + 1}/${MAX_RESTART_ATTEMPTS})`);
  
  // Determine app.py path and working directory
  // In production (dist/index.js): __dirname = /workspace/dist, go up to /workspace
  // In development (server/index.ts): __dirname = /workspace/server, go up to /workspace
  const projectRoot = join(__dirname, '..');
  const appPath = join(projectRoot, 'app.py');
  
  console.log(`Flask app path: ${appPath}`);
  console.log(`Project root: ${projectRoot}`);
  
  flaskProcess = spawn("python", [appPath], {
    stdio: "inherit",
    cwd: projectRoot,  // Ensure Python runs from project root to find routes/, services/
    env: { 
      ...process.env,
      PORT: FLASK_PORT.toString(),
      PYTHONUNBUFFERED: "1"  // Force Python output to be unbuffered
    }
  });

  flaskProcess.on("error", (err: Error) => {
    console.error("❌ Failed to start Flask:", err);
    scheduleFlaskRestart();
  });

  flaskProcess.on("exit", (code: number | null, signal: string | null) => {
    console.error(`❌ Flask process exited with code ${code}, signal ${signal}`);
    flaskReady = false;
    scheduleFlaskRestart();
  });
}

function scheduleFlaskRestart() {
  if (flaskRestartAttempt >= MAX_RESTART_ATTEMPTS) {
    console.error(`❌ Max Flask restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Staying in warmup mode.`);
    return;
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, 16s
  const delay = Math.min(1000 * Math.pow(2, flaskRestartAttempt), 16000);
  flaskRestartAttempt++;
  
  console.log(`⏱️ Scheduling Flask restart in ${delay}ms...`);
  setTimeout(() => {
    startFlaskProcess();
  }, delay);
}

// Start Flask process
startFlaskProcess();

// Background task: continuously check Flask readiness
async function checkFlaskReadiness() {
  const fetch = (await import('node-fetch')).default;
  const maxRetries = 120; // Increased from 60
  const delay = 500; // Decreased from 1000ms to 500ms
  
  console.log(`Background task: checking Flask health (max ${maxRetries} retries, ${delay}ms delay, total ${maxRetries * delay / 1000}s)...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${FLASK_PORT}/health`, { 
        method: 'GET'
      });
      if (response.status === 200) {
        const data = await response.json() as { status: string };
        if (data.status === 'ok') {
          flaskReady = true;
          console.log(`✅ Flask is ready after ${i + 1} attempts (${(i + 1) * delay / 1000}s)`);
          return;
        }
      }
    } catch (error) {
      // Flask not ready yet, wait and retry
      if (i % 10 === 0) {
        console.log(`Flask not ready... attempt ${i + 1}/${maxRetries}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.error(`❌ Flask failed to start after ${maxRetries} attempts (${maxRetries * delay / 1000}s total)`);
}

// Proxy middleware - forwards all requests to Flask (only reached when Flask is ready)
app.use(async (req, res) => {
  const flaskUrl = `http://127.0.0.1:${FLASK_PORT}${req.url}`;
  
  try {
    const fetch = (await import('node-fetch')).default;
    
    const headers: any = {};
    Object.keys(req.headers).forEach(key => {
      if (key !== 'host' && key !== 'connection') {
        headers[key] = req.headers[key];
      }
    });

    const options: any = {
      method: req.method,
      headers: headers,
    };

    // For POST/PUT/PATCH with body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      await new Promise(resolve => req.on('end', resolve));
      const buffer = Buffer.concat(chunks);
      if (buffer.length > 0) {
        options.body = buffer;
      }
    }

    const response = await fetch(flaskUrl, options);

    // Set status
    res.status(response.status);
    
    // Set content type (let compression handle the rest)
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.type(contentType);
    }

    // Apply long-term caching for static assets
    const staticFilePattern = /\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2)$/i;
    if (staticFilePattern.test(req.url)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Get response as text/buffer and send (compression will intercept)
    const buffer = await response.buffer();
    res.send(buffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
});

// Start Node.js server immediately (non-blocking)
const httpServer = createServer(app);

httpServer.listen(NODE_PORT, "0.0.0.0", () => {
  console.log(`✅ Node.js proxy server LISTENING on port ${NODE_PORT} (Flask readiness: ${flaskReady})`);
  console.log(`Will forward requests to Flask on port ${FLASK_PORT} once ready`);
});

// Start background Flask readiness check (non-blocking)
checkFlaskReadiness().catch(err => {
  console.error('Flask readiness check failed:', err);
});

process.on('SIGINT', () => {
  if (flaskProcess && !flaskProcess.killed) {
    flaskProcess.kill();
  }
  process.exit(0);
});
