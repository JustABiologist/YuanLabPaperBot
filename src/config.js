import { config } from 'dotenv';
import { resolve, dirname, isAbsolute, normalize } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root. Use override:true so process.env takes priority.
config({ path: resolve(__dirname, '..', '.env') });

function env(key, fallback = '') {
  return process.env[key] ?? fallback;
}

/**
 * Resolve a path from config.
 * If it's already absolute (starts with /, \, or X:\), use as-is.
 * Otherwise resolve relative to project root.
 * Also normalizes backslashes -> forward slashes for cross-platform safety.
 */
function resolvePath(raw, defaultRel = '') {
  const val = (raw || defaultRel).trim();
  if (!val) return '';

  // Normalize backslashes to forward slashes
  const normalized = val.replace(/\\/g, '/');

  // Check if absolute: starts with / or a drive letter (e.g., C:/)
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) {
    return normalize(normalized);
  }

  // Relative path: resolve against project root
  return resolve(__dirname, '..', normalized);
}

// Environment
export const NODE_ENV = env('NODE_ENV', 'production');

// WhatsApp
export const BOT_GROUP_NAME = env('BOT_GROUP_NAME', 'Lab Paper Chat');
export const BOT_GROUP_ID = env('BOT_GROUP_ID', '');

// Paths
export const OUTBOX_DIR = resolvePath(env('OUTBOX_DIR'), './data/outbox');
export const SESSION_DIR = resolve(__dirname, '..', './data/sessions');
export const PDF_AUTO_IMPORT_DIR = resolvePath(env('PDF_AUTO_IMPORT_DIR'), '');

// LLM (optional)
export const LLM_API_KEY = env('LLM_API_KEY', '');
export const LLM_MODEL = env('LLM_MODEL', 'gpt-4o-mini');
export const LLM_ENDPOINT = env('LLM_ENDPOINT', '');

// Crossref
export const CROSSREF_MAIL = env('CROSSREF_MAIL', '');
