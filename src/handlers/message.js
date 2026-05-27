import { extractDOIs, looksLikePaper, getMessageText } from '../utils/doi.js';
import { writeRIS, copyTo } from '../utils/file.js';
import { fetchByDOI } from '../services/crossref.js';
import { generateRIS, risFilename } from '../services/ris.js';
import { generateSummary } from '../services/summary.js';
import { downloadPDF } from '../services/download.js';
import { OUTBOX_DIR, PDF_AUTO_IMPORT_DIR } from '../config.js';

/**
 * Handle an incoming WhatsApp message.
 * Detects DOIs, fetches metadata, generates RIS + summary, posts back.
 */
export async function handleMessage(msg, client) {
  const text = getMessageText(msg);

  // Skip our own messages
  if (msg.fromMe) return null;

  const chat = await msg.getChat();

  // Quick check: does this look paper-related?
  if (!looksLikePaper(text)) return null;

  // Extract DOIs
  const dois = extractDOIs(text);
  if (dois.length === 0) return null;

  console.log(`[Handle] Detected DOIs: ${dois.join(', ')} from ${msg.author || msg.from}`);

  const results = [];

  for (const doi of dois) {
    try {
      const result = await processDOI(doi, chat);
      if (result) results.push(result);
    } catch (err) {
      console.error(`[Handle] Error processing ${doi}:`, err.message);
      await chat.sendMessage(`⚠️ Konnte Paper nicht verarbeiten: ${doi}\nFehler: ${err.message}`);
    }
  }

  return results;
}

/**
 * Process a single DOI: fetch, generate RIS, maybe PDF, post summary.
 */
async function processDOI(doi, chat) {
  console.log(`[Process] Fetching ${doi}...`);

  // 1. Fetch metadata
  const paper = await fetchByDOI(doi);
  if (!paper.title) throw new Error('No title found');

  console.log(`[Process] Got: "${paper.title}" by ${paper.authors[0]?.full || '?'} (${paper.year})`);

  // 2. Generate RIS file
  const ris = generateRIS(paper);
  const risFile = risFilename(paper);
  const risPath = await writeRIS(OUTBOX_DIR, risFile, ris);
  console.log(`[Process] RIS saved: ${risPath}`);

  // 3. Also copy RIS to PDF auto-import folder if configured (EndNote picks up both)
  if (PDF_AUTO_IMPORT_DIR) {
    await copyTo(PDF_AUTO_IMPORT_DIR, risPath);
  }

  // 4. Try downloading PDF (best-effort)
  const pdfPath = await downloadPDF(doi, OUTBOX_DIR);

  // 5. Generate summary
  const summary = await generateSummary(paper);

  // 6. Post to WhatsApp
  const msg = formatWhatsAppMessage(paper, summary, pdfPath);
  await chat.sendMessage(msg);

  console.log(`[Process] Done: ${doi}`);

  return { doi, title: paper.title, risPath, pdfPath };
}

/**
 * Format a nice WhatsApp message with paper info + summary.
 */
function formatWhatsAppMessage(paper, summary, pdfPath) {
  const authors = paper.authors.slice(0, 4).map(a => a.full).join(', ');
  const andOthers = paper.authors.length > 4 ? ' et al.' : '';

  let msg = `📄 *${paper.title}*\n`;
  msg += `👤 ${authors}${andOthers}\n`;

  if (paper.journal) msg += `📰 ${paper.journal} (${paper.year})\n`;
  msg += `🔗 ${paper.url}\n`;

  if (summary) {
    msg += `\n📝 *Summary:*\n${summary}\n`;
  }

  msg += `\n✅ In die Bibliothek aufgenommen`;

  if (pdfPath) {
    msg += ` 📎 PDF liegt bereit`;
  }

  return msg;
}
