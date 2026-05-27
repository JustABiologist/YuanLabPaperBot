import { findPDFURL } from './crossref.js';
import { downloadFile, copyTo } from '../utils/file.js';
import { PDF_AUTO_IMPORT_DIR } from '../config.js';

/**
 * Attempt to download a PDF for a paper.
 * Returns the local file path, or null if unavailable.
 */
export async function downloadPDF(doi, outboxDir) {
  console.log(`[Download] Looking for PDF for ${doi}...`);

  const pdfUrl = await findPDFURL(doi);
  if (!pdfUrl) {
    console.log(`[Download] No open-access PDF URL found for ${doi}`);
    return null;
  }

  const safeDOI = doi.replace(/[\/\\:;]/g, '_').substring(0, 80);
  const dest = `${outboxDir}/${safeDOI}.pdf`;

  try {
    await downloadFile(pdfUrl, dest);

    // Also copy to EndNote's PDF auto import folder if configured
    if (PDF_AUTO_IMPORT_DIR) {
      await copyTo(PDF_AUTO_IMPORT_DIR, dest);
    }

    return dest;
  } catch (err) {
    console.log(`[Download] Failed to download PDF: ${err.message}`);
    return null;
  }
}
