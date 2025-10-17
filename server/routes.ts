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
  const objectStorageService = new ObjectStorageService();

  // Serve static files from "static" directory (for Flask frontend)
  app.use(express.static("static"));

  // API endpoint for Flask to upload files to Object Storage
  app.post("/api/storage/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const extension = req.body.extension || 'png';
      const objectPath = objectStorageService.generateObjectPath(extension);

      await objectStorageService.uploadBuffer(
        req.file.buffer,
        objectPath,
        req.file.mimetype
      );

      // Generate both URLs:
      // - publicUrl: For browser access via Flask proxy
      // - signedUrl: For external API access (Replicate)
      const publicUrl = objectStorageService.getPublicUrl(objectPath);
      const signedUrl = await objectStorageService.getPublicSignedUrl(objectPath);

      res.json({ publicUrl, signedUrl, objectPath });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Endpoint to serve objects from storage
  app.get("/objects/*", async (req, res) => {
    try {
      const objectPath = (req.params as any)[0] || "";
      await objectStorageService.downloadObject(objectPath, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Virtual fitting endpoint
  app.post(
    "/api/virtual-fitting",
    upload.fields([
      { name: "userPhoto", maxCount: 1 },
      { name: "clothingPhoto", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };

        if (!files?.userPhoto?.[0] || !files?.clothingPhoto?.[0]) {
          return res.status(400).json({ error: "Both images are required" });
        }

        const userPhotoFile = files.userPhoto[0];
        const clothingPhotoFile = files.clothingPhoto[0];

        // Upload original photos to storage
        const userPhotoPath = objectStorageService.generateObjectPath("png");
        const clothingPhotoPath = objectStorageService.generateObjectPath("png");

        console.log("Uploading photos to storage:", { userPhotoPath, clothingPhotoPath });

        await Promise.all([
          objectStorageService.uploadBuffer(
            userPhotoFile.buffer,
            userPhotoPath,
            "image/png"
          ),
          objectStorageService.uploadBuffer(
            clothingPhotoFile.buffer,
            clothingPhotoPath,
            "image/png"
          ),
        ]);

        console.log("Photos uploaded successfully");

        // Create virtual fitting record
        const fitting = await storage.createVirtualFitting({
          userPhotoPath,
          clothingPhotoPath,
          status: "processing",
        });

        // Generate virtual fitting result
        const userPhotoBase64 = userPhotoFile.buffer.toString("base64");
        const clothingPhotoBase64 = clothingPhotoFile.buffer.toString("base64");

        // Get public URLs for Replicate API
        const userPhotoUrl = objectStorageService.getPublicUrl(userPhotoPath);
        const clothingPhotoUrl = objectStorageService.getPublicUrl(clothingPhotoPath);

        console.log("Generating virtual fitting with AI...");
        const result = await generateVirtualFitting({
          userPhotoBase64,
          clothingPhotoBase64,
          userPhotoUrl,
          clothingPhotoUrl,
        });
        console.log("AI generation completed, result base64 length:", result.resultImageBase64.length);

        // Upload result to storage
        const resultPhotoPath = objectStorageService.generateObjectPath("png");
        const resultBuffer = Buffer.from(result.resultImageBase64, "base64");

        console.log("Uploading result to storage:", resultPhotoPath);
        await objectStorageService.uploadBuffer(
          resultBuffer,
          resultPhotoPath,
          "image/png"
        );
        console.log("Result uploaded successfully");

        // Update fitting record
        await storage.updateVirtualFitting(fitting.id, {
          resultPhotoPath,
          status: "completed",
        });

        // Return result URL
        const resultUrl = objectStorageService.getPublicUrl(resultPhotoPath);

        res.json({
          id: fitting.id,
          resultUrl,
          status: "completed",
        });
      } catch (error) {
        console.error("Error processing virtual fitting:", error);
        res.status(500).json({
          error: "Failed to process virtual fitting",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get fitting by ID
  app.get("/api/virtual-fitting/:id", async (req, res) => {
    try {
      const fitting = await storage.getVirtualFitting(req.params.id);
      if (!fitting) {
        return res.sendStatus(404);
      }

      const resultUrl = fitting.resultPhotoPath
        ? objectStorageService.getPublicUrl(fitting.resultPhotoPath)
        : null;

      res.json({
        ...fitting,
        resultUrl,
      });
    } catch (error) {
      console.error("Error fetching fitting:", error);
      res.sendStatus(500);
    }
  });

  // Get all fittings
  app.get("/api/virtual-fittings", async (req, res) => {
    try {
      const fittings = await storage.getAllVirtualFittings();
      const fittingsWithUrls = fittings.map((fitting) => ({
        ...fitting,
        resultUrl: fitting.resultPhotoPath
          ? objectStorageService.getPublicUrl(fitting.resultPhotoPath)
          : null,
      }));
      res.json(fittingsWithUrls);
    } catch (error) {
      console.error("Error fetching fittings:", error);
      res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
