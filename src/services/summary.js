import { LLM_API_KEY, LLM_MODEL, LLM_ENDPOINT } from '../config.js';

/**
 * Generate a short paper summary.
 *
 * With LLM configured: uses the configured API for a real summary.
 * Without LLM: returns the first ~300 chars of abstract.
 */
export async function generateSummary(paper) {
  // If we have an LLM configured, use it
  if (LLM_API_KEY && LLM_ENDPOINT) {
    try {
      return await llmSummary(paper);
    } catch (err) {
      console.log(`[Summary] LLM failed, falling back to abstract: ${err.message}`);
    }
  }

  // Fallback: just use the abstract
  return abstractSummary(paper);
}

/**
 * LLM-powered summary via OpenAI-compatible API.
 */
async function llmSummary(paper) {
  const abstract = (paper.abstract || '')
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const prompt = `Summarize this research paper in 3-4 concise bullet points (keep it under 150 words total):

Title: ${paper.title}
Authors: ${paper.authors.map(a => a.full).join(', ')}
Journal: ${paper.journal} (${paper.year})
${abstract ? `\nAbstract: ${abstract.substring(0, 1000)}` : ''}

Write only the bullet points, no intro.`;

  const body = {
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.3,
  };

  const res = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`LLM API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || abstractSummary(paper);
}

/**
 * Abstract-only summary (no AI needed).
 */
function abstractSummary(paper) {
  if (!paper.abstract) return null;

  const clean = paper.abstract
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Return first ~400 chars, ending at a sentence boundary
  if (clean.length <= 400) return clean;

  const truncated = clean.substring(0, 400);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > 200) return truncated.substring(0, lastPeriod + 1);

  return truncated + '...';
}
