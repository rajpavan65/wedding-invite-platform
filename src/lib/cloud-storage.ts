/**
 * src/lib/cloud-storage.ts
 *
 * Cloud storage client — migrated from local filesystem to AWS S3 + CloudFront (Sprint 2).
 *
 * Upload strategy:
 *   - Photos → s3://BUCKET/photos/{orderId}/{filename}
 *   - Renders → s3://BUCKET/renders/{orderId}/{filename}
 *   - Avatars → s3://BUCKET/avatars/{clientId}/{ceremonyType}.png
 *
 * Delivery:
 *   - All assets served via CloudFront CDN (not S3 directly)
 *   - URL format: https://CLOUDFRONT_DOMAIN/{key}
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ─── S3 Client singleton ──────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.S3_BUCKET || "";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";

if (!BUCKET || !CLOUDFRONT_DOMAIN) {
  console.warn("⚠️ S3_BUCKET or CLOUDFRONT_DOMAIN env vars are missing.");
}

// ─── Content types by extension ──────────────────────────────────────────────
function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const types: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
  };
  return types[ext] ?? "application/octet-stream";
}

// ─── Cloud Storage Client ─────────────────────────────────────────────────────
export const cloudStorage = {
  /**
   * Uploads a file to S3 and returns the CloudFront CDN URL.
   *
   * @param bucket - Logical bucket name: "photos", "renders", or "avatars"
   * @param folder - Sub-folder path, typically the orderId
   * @param filename - Target filename in S3
   * @param data - File contents as Buffer or Uint8Array
   */
  async uploadFile(
    bucket: "photos" | "renders" | "avatars",
    folder: string,
    filename: string,
    data: Buffer | Uint8Array
  ): Promise<string> {
    const key = `${bucket}/${folder}/${filename}`;
    const contentType = getContentType(filename);

    console.log(`\n[S3] ☁️ Uploading → s3://${BUCKET}/${key}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
        // 30-day cache for photos/renders — they don't change
        CacheControl: "max-age=2592000, public",
      })
    );

    const cdnUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;
    console.log(`[S3] ✅ Upload complete → ${cdnUrl}`);
    return cdnUrl;
  },

  /**
   * Deletes a file from S3.
   * CloudFront cache will expire naturally (TTL 30 days) or can be invalidated separately.
   */
  async deleteFile(
    bucket: "photos" | "renders" | "avatars",
    folder: string,
    filename: string
  ): Promise<void> {
    const key = `${bucket}/${folder}/${filename}`;
    console.log(`[S3] 🗑️ Deleting s3://${BUCKET}/${key}`);

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    console.log(`[S3] ✅ Deleted ${key}`);
  },

  /**
   * Returns the CloudFront URL for a given S3 key without uploading.
   * Useful for building URLs for already-uploaded assets.
   */
  getUrl(bucket: "photos" | "renders" | "avatars", folder: string, filename: string): string {
    return `https://${CLOUDFRONT_DOMAIN}/${bucket}/${folder}/${filename}`;
  },
};
