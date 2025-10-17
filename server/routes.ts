import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { generateVirtualFitting } from "./virtualFitting";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Proxy ALL requests to Flask (including static files and APIs)
  app.use(async (req, res) => {
    const FLASK_PORT = process.env.FLASK_PORT || 5001;
    const flaskUrl = `http://127.0.0.1:${FLASK_PORT}${req.url}`;
    
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Handle multipart form data properly
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

      // For POST/PUT/PATCH requests with body
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        // Pass raw body for multipart form data
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

  return httpServer;
}
