import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const MAGIC = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
export function detectType(buf) {
  return Object.keys(MAGIC).find((t) => MAGIC[t].every((b, i) => buf[i] === b));
}
// Stockage local : disque du serveur (UPLOAD_DIR). Sur Render, éphémère sauf disque persistant payant.
const local = {
  async save(buf, ext) { await fs.mkdir(DIR, { recursive: true }); const key = crypto.randomUUID() + ext; await fs.writeFile(path.join(DIR, key), buf); return key; },
  read: (key) => fs.readFile(path.join(DIR, path.basename(key))),
};
// Stockage objet privé compatible S3 (AWS S3, Cloudflare R2, Backblaze B2...), activé si S3_BUCKET est défini.
async function makeS3() {
  const { S3_BUCKET: Bucket, S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey, S3_REGION, S3_ENDPOINT } = process.env;
  if (!accessKeyId || !secretAccessKey) throw new Error('S3_ACCESS_KEY_ID et S3_SECRET_ACCESS_KEY requis quand S3_BUCKET est défini.');
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region: S3_REGION || 'auto', endpoint: S3_ENDPOINT || undefined, forcePathStyle: !!S3_ENDPOINT, credentials: { accessKeyId, secretAccessKey } });
  return {
    async save(buf, ext) { const key = crypto.randomUUID() + ext; await client.send(new PutObjectCommand({ Bucket, Key: key, Body: buf })); return key; },
    async read(key) { const r = await client.send(new GetObjectCommand({ Bucket, Key: path.basename(key) })); return Buffer.from(await r.Body.transformToByteArray()); },
  };
}
export const storage = process.env.S3_BUCKET ? await makeS3() : local;
