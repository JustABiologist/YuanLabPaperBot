/**
 * DOI detection and extraction utilities.
 */

// Matches various DOI formats in text
const DOI_REGEX = /\b(10\.\d{4,}(?:\.\d+)*\/\S+(?:[^\s.,;!?)>]))/g;

// URL patterns that contain DOIs
const DOI_URL_REGEX = /(?:doi\.org|dx\.doi\.org)\/(10\.\d{4,}(?:\.\d+)*\/\S+)/i;

/**
 * Extract all DOIs from a text string.
 * Handles plain DOIs and doi.org URLs.
 */
export function extractDOIs(text) {
  if (!text || typeof text !== 'string') return [];

  const found = new Set();

  // doi.org URLs
  let m;
  const urlRe = new RegExp(DOI_URL_REGEX.source, 'gi');
  while ((m = urlRe.exec(text)) !== null) {
    found.add(cleanDOI(m[1]));
  }

  // Plain DOIs
  const plainRe = new RegExp(DOI_REGEX.source, 'g');
  while ((m = plainRe.exec(text)) !== null) {
    found.add(cleanDOI(m[1]));
  }

  return [...found];
}

/**
 * Check if a message body looks like it has a paper reference.
 */
export function looksLikePaper(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    /\bdoi\b/.test(lower) ||
    DOI_REGEX.test(text) ||
    /arxiv\.org\//.test(lower) ||
    /pubmed\.ncbi\.nlm\.nih\.gov/.test(lower) ||
    /science\.org/.test(lower) ||
    /nature\.com/.test(lower) ||
    /cell\.com/.test(lower) ||
    /acm\.org/.test(lower) ||
    /ieee\.org/.test(lower) ||
    /springer/.test(lower) ||
    /wiley/.test(lower) ||
    /elsevier/.test(lower) ||
    /sciencedirect/.test(lower) ||
    /biorxiv/.test(lower) ||
    /medrxiv/.test(lower)
  );
}

function cleanDOI(d) {
  // Remove trailing punctuation
  return d.replace(/[.,;!?)>]+$/, '').trim();
}

/**
 * Extract plain text from a WhatsApp message, handling captions on media.
 */
export function getMessageText(msg) {
  const body = msg.body || '';
  const caption = msg.hasMedia ? (msg._data?.caption || '') : '';
  return body || caption || '';
}
