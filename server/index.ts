import express from "express";
import { spawn } from "child_process";
import { createServer } from "http";

const app = express();

// Start Flask on port 5001
const FLASK_PORT = 5001;
const NODE_PORT = 5000;

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

// Wait for Flask to start, then start Node.js proxy
setTimeout(() => {
  // Proxy ALL requests to Flask
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

      res.status(response.status);
      Object.entries(response.headers.raw()).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      const buffer = await response.buffer();
      res.send(buffer);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Proxy failed' });
    }
  });

  const httpServer = createServer(app);
  
  httpServer.listen(NODE_PORT, "0.0.0.0", () => {
    console.log(`Node.js proxy server running on port ${NODE_PORT}, forwarding to Flask on ${FLASK_PORT}`);
  });
}, 2000); // Give Flask 2 seconds to start

process.on('SIGINT', () => {
  flask.kill();
  process.exit(0);
});
