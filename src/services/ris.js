/**
 * Generate RIS format string from paper metadata.
 */

export function generateRIS(paper) {
  const lines = [];

  // Type: Journal article (TY - JOUR)
  lines.push('TY  - JOUR');

  // Authors
  for (const a of paper.authors) {
    const name = a.family ? `${a.family}, ${a.given}` : a.full;
    lines.push(`A1  - ${name}`);
  }

  // Title
  lines.push(`T1  - ${paper.title}`);

  // DOI
  if (paper.DOI) lines.push(`DO  - ${paper.DOI}`);

  // Year
  if (paper.year) lines.push(`PY  - ${paper.year}`);

  // URL
  if (paper.url) lines.push(`UR  - ${paper.url}`);

  // Journal
  if (paper.journal) {
    lines.push(`JF  - ${paper.journal}`);
    lines.push(`JO  - ${paper.journal}`);
  }

  // Volume, Issue, Pages
  if (paper.volume) lines.push(`VL  - ${paper.volume}`);
  if (paper.issue) lines.push(`IS  - ${paper.issue}`);
  if (paper.pages) lines.push(`SP  - ${paper.pages}`);

  // Publisher
  if (paper.publisher) lines.push(`PB  - ${paper.publisher}`);

  // Abstract (first ~300 chars)
  if (paper.abstract) {
    const clean = stripHTML(paper.abstract).trim();
    // Split into reasonable chunks
    const sentences = clean.split(/(?<=\.)\s+/).filter(Boolean);
    for (const s of sentences.slice(0, 6)) {
      lines.push(`AB  - ${s}`);
    }
  }

  // End record
  lines.push('ER  -');
  lines.push(''); // trailing newline

  return lines.join('\n');
}

/**
 * Generate a safe filename from the paper.
 */
export function risFilename(paper) {
  const safeDOI = (paper.DOI || 'unknown').replace(/[\/\\:;]/g, '_').substring(0, 80);
  return `${safeDOI}.ris`;
}

function stripHTML(html) {
  return html.replace(/<\/?[^>]+(>|$)/g, ' ').replace(/\s+/g, ' ');
}
