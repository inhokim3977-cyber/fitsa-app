import express from "express";
import { spawn } from "child_process";
import { createServer } from "http";
import compression from "compression";

const app = express();

// Enable compression for responses >= 1KB
app.use(compression({ threshold: 1024 }));

// Start Flask on port 5001
const FLASK_PORT = 5001;
const NODE_PORT = 5000;

// Flask readiness flag
let flaskReady = false;

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
  const maxRetries = 60;
  const delay = 1000;
  
  console.log(`Background task: checking Flask health (max ${maxRetries} retries, ${delay}ms delay)...`);
  
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
      if (i % 5 === 0) {
        console.log(`Flask not ready... attempt ${i + 1}/${maxRetries}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.error(`❌ Flask failed to start after ${maxRetries} attempts (${maxRetries * delay / 1000}s total)`);
}

// Proxy middleware - only proxy when Flask is ready
app.use(async (req, res) => {
  // If Flask not ready yet, provide startup health responses
  if (!flaskReady) {
    // GET/HEAD "/" → 200 text/html (for deployment health check)
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/') {
      return res.status(200).type('text/html').send('OK — starting');
    }
    
    // GET/HEAD "/health" → 200 application/json (for health check)
    if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/health') {
      return res.status(200).json({ status: 'ok' });
    }
    
    // Other paths → 503 Service Unavailable
    return res.status(503).json({ 
      error: 'Service is starting, please wait...',
      status: 'initializing'
    });
  }

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
