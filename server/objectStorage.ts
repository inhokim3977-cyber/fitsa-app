import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service.
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  // Gets the private object directory path
  getPrivateObjectDir(): string {
    const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
    // Remove bucket ID prefix if present
    const bucketId = this.getBucketId();
    if (privateDir.startsWith(`/${bucketId}/`)) {
      return privateDir.substring(`/${bucketId}/`.length);
    }
    if (privateDir.startsWith(bucketId)) {
      return privateDir.substring(bucketId.length + 1);
    }
    return privateDir.replace(/^\//, ''); // Remove leading slash
  }

  // Gets the bucket ID
  getBucketId(): string {
    return process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
  }

  // Generate a unique object path for uploaded files
  generateObjectPath(fileExtension: string = "png"): string {
    const privateDir = this.getPrivateObjectDir();
    const fileName = `${randomUUID()}.${fileExtension}`;
    return `${privateDir}/${fileName}`;
  }

  // Get presigned URL for uploading
  async getUploadURL(objectPath: string): Promise<string> {
    const bucketId = this.getBucketId();
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectPath);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "image/png",
    });

    return url;
  }

  // Download object and stream to response
  async downloadObject(objectPath: string, res: Response): Promise<void> {
    const bucketId = this.getBucketId();
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const [metadata] = await file.getMetadata();
    res.setHeader("Content-Type", metadata.contentType || "image/png");
    res.setHeader("Cache-Control", "public, max-age=31536000");

    file.createReadStream().pipe(res);
  }

  // Upload buffer to object storage
  async uploadBuffer(buffer: Buffer, objectPath: string, contentType: string = "image/png"): Promise<void> {
    const bucketId = this.getBucketId();
    const bucket = objectStorageClient.bucket(bucketId);
    const file = bucket.file(objectPath);

    await file.save(buffer, {
      contentType,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });
  }

  // Get public URL for an object
  getPublicUrl(objectPath: string): string {
    return `/objects/${objectPath}`;
  }
}
