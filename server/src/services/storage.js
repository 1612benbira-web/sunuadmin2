import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
export const MAGIC = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
export function detectType(buf) {
  return Object.keys(MAGIC).find((t) => MAGIC[t].every((b, i) => buf[i] === b));
}
// Interface de stockage : remplaçable par un stockage objet privé en production.
export const storage = {
  async save(buf, ext) { await fs.mkdir(DIR, { recursive: true }); const key = crypto.randomUUID() + ext; await fs.writeFile(path.join(DIR, key), buf); return key; },
  read: (key) => fs.readFile(path.join(DIR, path.basename(key))),
};
