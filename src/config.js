import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
config({ path: resolve(__dirname, '..', '.env') });

function env(key, fallback = '') {
  return process.env[key] ?? fallback;
}

// Environment
export const NODE_ENV = env('NODE_ENV', 'production');

// WhatsApp
export const BOT_GROUP_NAME = env('BOT_GROUP_NAME', 'Lab Paper Chat');
export const BOT_GROUP_ID = env('BOT_GROUP_ID', '');

// Paths
export const OUTBOX_DIR = resolve(__dirname, '..', env('OUTBOX_DIR', './data/outbox'));
export const SESSION_DIR = resolve(__dirname, '..', './data/sessions');
export const PDF_AUTO_IMPORT_DIR = env('PDF_AUTO_IMPORT_DIR', '') ? resolve(__dirname, '..', env('PDF_AUTO_IMPORT_DIR')) : '';

// LLM (optional)
export const LLM_API_KEY = env('LLM_API_KEY', '');
export const LLM_MODEL = env('LLM_MODEL', 'gpt-4o-mini');
export const LLM_ENDPOINT = env('LLM_ENDPOINT', '');

// Crossref
export const CROSSREF_MAIL = env('CROSSREF_MAIL', '');
