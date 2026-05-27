import { writeFile, mkdir, copyFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Write a RIS file to disk.
 * Returns the file path.
 */
export async function writeRIS(dir, filename, content) {
  await mkdir(dir, { recursive: true });
  const path = join(dir, filename);
  // Ensure .ris extension
  const finalPath = path.endsWith('.ris') ? path : path + '.ris';
  await writeFile(finalPath, content, 'utf-8');
  console.log(`[File] Wrote ${finalPath}`);
  return finalPath;
}

/**
 * Download a file from URL to a local path.
 */
export async function downloadFile(url, destPath) {
  await mkdir(dirname(destPath), { recursive: true });

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
  console.log(`[File] Downloaded ${url} -> ${destPath}`);
  return destPath;
}

/**
 * Copy a file to another location (e.g., to EndNote's PDF Auto Import folder).
 * Returns the destination path, or null if copy failed.
 */
export async function copyTo(dir, filePath) {
  if (!dir) return null;
  try {
    await access(dir);
  } catch {
    console.log(`[File] Cannot copy to ${dir}: directory does not exist`);
    return null;
  }

  const name = filePath.split('/').pop() || filePath.split('\\').pop();
  const dest = join(dir, name);
  await copyFile(filePath, dest);
  console.log(`[File] Copied ${filePath} -> ${dest}`);
  return dest;
}
