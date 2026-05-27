import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { SESSION_DIR, OUTBOX_DIR } from './config.js';
import { handleMessage } from './handlers/message.js';

// Ensure output directory exists
import { mkdir } from 'fs/promises';
await mkdir(OUTBOX_DIR, { recursive: true }).catch(() => {});

console.log('='.repeat(50));
console.log('  Lab Paper Bot');
console.log('  Monitors WhatsApp group for DOI links → RIS files + summaries');
console.log('='.repeat(50));

// ── WhatsApp Client Setup ──────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: SESSION_DIR,
    clientId: 'lab-paper-bot',
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  },
  // Don't start automatically -- we manage it
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0,
});

// ── Auth Events ────────────────────────────────────────────

let qrTimeoutId = null;

client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with WhatsApp on your phone:');
  qrcode.generate(qr, { small: true });

  // Auto-restart if QR not scanned within 3 minutes (session probably stale)
  if (qrTimeoutId) clearTimeout(qrTimeoutId);
  qrTimeoutId = setTimeout(() => {
    console.log('[QR] Timeout - restarting to get fresh session...');
    process.exit(42); // systemd / pm2 will restart
  }, 180_000);
});

client.on('authenticated', () => {
  console.log('[Auth] Authenticated successfully');
  if (qrTimeoutId) {
    clearTimeout(qrTimeoutId);
    qrTimeoutId = null;
  }
});

client.on('auth_failure', (msg) => {
  console.error('[Auth] FAILURE:', msg);
  // Delete stale session and retry
  console.log('[Auth] Restarting to clear stale session...');
  process.exit(42);
});

// ── Connection Events ──────────────────────────────────────

client.on('ready', () => {
  console.log('[Client] Ready! Connected to WhatsApp');
  console.log(`[Client] Watching outbox: ${OUTBOX_DIR}`);
});

client.on('disconnected', (reason) => {
  console.log(`[Client] Disconnected: ${reason}`);
  console.log('[Client] Exiting for clean restart...');
  process.exit(42);
});

// ── Message Handler ────────────────────────────────────────

client.on('message', async (msg) => {
  try {
    await handleMessage(msg, client);
  } catch (err) {
    console.error('[Message] Unhandled error:', err);
  }
});

// ── Group Join Events ──────────────────────────────────────

client.on('group_join', async (notification) => {
  console.log(`[Group] Bot added to "${notification.name}" (${notification.id._serialized})`);
});

// ── Keep Alive ────────────────────────────────────────────

// Periodically check connection health
const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(async () => {
  try {
    const state = await client.getState();
    if (state !== 'CONNECTED') {
      console.warn(`[Heartbeat] State: ${state} - not healthy`);
    } else {
      console.log(`[Heartbeat] OK - connected, ${new Date().toISOString()}`);
    }
  } catch (err) {
    console.error(`[Heartbeat] Failed: ${err.message}`);
    process.exit(42);
  }
}, HEARTBEAT_INTERVAL);

// ── Start ──────────────────────────────────────────────────

console.log('[Start] Initializing WhatsApp client...');
client.initialize();

// ── Crash Recovery ─────────────────────────────────────────

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(42);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(42);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SIGINT] Shutting down...');
  await client.destroy().catch(() => {});
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[SIGTERM] Shutting down...');
  await client.destroy().catch(() => {});
  process.exit(0);
});
