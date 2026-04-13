import { Client } from "minio"

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "hrms_minio",
  secretKey: process.env.MINIO_SECRET_KEY || "hrms_minio_secret",
})

const BUCKET = process.env.MINIO_BUCKET || "hrms-documents"

export async function ensureBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET)
      console.log(`Created MinIO bucket: ${BUCKET}`)
    }
  } catch (error) {
    console.error("Failed to ensure MinIO bucket:", error)
  }
}

export async function uploadFile(
  objectKey: string,
  buffer: Buffer,
  contentType: string,
  size: number
): Promise<void> {
  await ensureBucket()
  await minioClient.putObject(BUCKET, objectKey, buffer, size, {
    "Content-Type": contentType,
  })
}

export async function getSignedUrl(
  objectKey: string,
  expirySeconds = 900
): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, objectKey, expirySeconds)
}

export async function deleteFile(objectKey: string): Promise<void> {
  await minioClient.removeObject(BUCKET, objectKey)
}

export function getObjectKey(prefix: string, originalFileName: string, id: string): string {
  const ext = originalFileName.split(".").pop()?.toLowerCase() || "bin"
  const sanitized = originalFileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]/gi, "-")
    .toLowerCase()
    .substring(0, 40)
  return `${prefix}/${id}-${sanitized}.${ext}`
}
