import express from "express";
import { spawn } from "child_process";
import { createServer } from "http";
import compression from "compression";

const app = express();

// Start Flask on port 5001
const FLASK_PORT = 5001;
const NODE_PORT = 5000;

// Flask readiness flag
let flaskReady = false;

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

  // 1) ALL HEAD requests → 200 immediate
  if (req.method === 'HEAD') {
    return res.status(200).set('Content-Type', 'text/plain').end();
  }

  // 2) GET "/" → 200 text/html
  if (req.path === '/') {
    return res.status(200).type('text/html').send('OK — starting');
  }

  // 3) GET "/health" → 200 application/json
  if (req.path === '/health') {
    return res.status(200).type('application/json').json({ status: 'ok' });
  }

  // 4) ALL .js files (with or without query strings) → 200 application/javascript
  if (req.path.endsWith('.js')) {
    return res.status(200)
      .type('application/javascript')
      .setHeader('Cache-Control', 'public, max-age=60')
      .send('// warming up');
  }

  // 5) All other paths → 503
  return res.status(503).json({
    error: 'Service is starting, please wait...',
    status: 'initializing'
  });
});

// Enable compression for responses >= 1KB
app.use(compression({ threshold: 1024 }));

console.log(`Starting Flask application on port ${FLASK_PORT}...`);
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
  flask.kill();
  process.exit(0);
});
