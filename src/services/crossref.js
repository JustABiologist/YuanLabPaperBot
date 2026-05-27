import fetch from 'node-fetch';
import { CROSSREF_MAIL } from '../config.js';

const BASE = 'https://api.crossref.org/works';

/**
 * Fetch paper metadata from Crossref API by DOI.
 * Returns a normalized metadata object, or throws on failure.
 */
export async function fetchByDOI(doi) {
  const url = `${BASE}/${encodeURIComponent(doi)}`;
  const headers = {
    'User-Agent': CROSSREF_MAIL
      ? `LabPaperBot/1.0 (mailto:${CROSSREF_MAIL})`
      : 'LabPaperBot/1.0 (mailto:bot@example.com)',
  };

  console.log(`[Crossref] Fetching ${url}`);
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Crossref API error: ${res.status} for DOI ${doi}`);
  }

  const data = await res.json();
  return normalize(data.message);
}

/**
 * Normalize Crossref response into a simpler shape.
 */
function normalize(msg) {
  return {
    DOI: msg.DOI || '',
    title: (msg.title || [''])[0] || '',
    authors: (msg.author || []).map(a => ({
      given: a.given || '',
      family: a.family || '',
      full: [a.given, a.family].filter(Boolean).join(' '),
    })),
    year: (msg['published-print']?.['date-parts']?.[0]?.[0])
          || (msg['issued']?.['date-parts']?.[0]?.[0])
          || (msg.created?.['date-parts']?.[0]?.[0])
          || '',
    journal: (msg['container-title'] || [''])[0] || '',
    volume: msg.volume || '',
    issue: msg.issue || '',
    pages: msg.page || '',
    publisher: msg.publisher || '',
    abstract: msg.abstract || '',
    url: `https://doi.org/${msg.DOI}`,
  };
}

/**
 * Try to resolve a PDF download URL for a paper.
 * Uses Unpaywall (free, no auth needed for basic).
 * Returns URL or null.
 */
export async function findPDFURL(doi) {
  try {
    const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(CROSSREF_MAIL || 'bot@lab.com')}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    // Prefer best OA location
    const best = data.best_oa_location;
    if (best?.url_for_pdf) return best.url_for_pdf;
    if (best?.url) return best.url;
    return null;
  } catch {
    return null;
  }
}
