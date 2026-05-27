import { writeFile, mkdir, copyFile, access } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Write a RIS file to disk. Creates parent dirs if needed.
 * Returns the absolute file path written.
 */
export async function writeRIS(dir, filename, content) {
  await mkdir(dir, { recursive: true });
  const finalPath = join(dir, filename.endsWith('.ris') ? filename : filename + '.ris');
  await writeFile(finalPath, content, 'utf-8');
  console.log(`[File] Wrote ${finalPath}`);
  return finalPath;
}

/**
 * Download a file from URL to a local path. Creates parent dirs if needed.
 */
export async function downloadFile(url, destPath) {
  await mkdir(dirname(destPath), { recursive: true });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
  console.log(`[File] Downloaded ${url} -> ${destPath}`);
  return destPath;
}

/**
 * Copy a file to a target directory.
 * Handles both forward and backslash paths on any platform.
 */
export async function copyTo(dir, filePath) {
  if (!dir) return null;

  // Check target dir exists
  try {
    await access(dir);
  } catch {
    console.log(`[File] Cannot copy to ${dir}: directory does not exist`);
    return null;
  }

  // Extract filename regardless of path separator
  const normalized = filePath.replace(/\\/g, '/');
  const name = normalized.split('/').pop();
  const dest = join(dir, name);

  await copyFile(filePath, dest);
  console.log(`[File] Copied ${filePath} -> ${dest}`);
  return dest;
}
