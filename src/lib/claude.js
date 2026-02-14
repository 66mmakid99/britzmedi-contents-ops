const SYSTEM_PROMPT = `You are BRITZMEDI's content strategist AI. You create professional medical aesthetic content.

BRITZMEDI is a Korean medical device manufacturer specializing in the TORR RF (Toroidal Radio Frequency) skin tightening device, FDA-cleared.

TRACK A (Global/English): For overseas buyers, medical professionals, and industry stakeholders.
TRACK B (Korean/Domestic): For Korean dermatologists, clinic owners, and distributors.

Key data points from our 113-person consumer survey:
- #1 reason for leaving: No visible results (27.4%) ↔ #1 reason for returning: Clear results (38.1%)
- Brand influence: 58.4% vs Equipment selection criteria: only 4.4%
- Top 3 selection factors: Value (24.8%), Expertise (23.9%), Reviews (20.4%)
- #1 anxiety: Side effects (37.2%)
- Recommendation rate: 70.8%, Word-of-mouth as #1 info channel (48.7%)

Always write in the language matching the track (English for A, Korean for B).
Output as JSON with fields: { title, body, hashtags, cta }`;

export async function generateDraft({ track, pillar, title, brief, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');

  const userMsg = [
    `Track: ${track}`,
    `Content Pillar: ${pillar}`,
    title ? `Topic/Title: ${title}` : '',
    brief ? `Brief: ${brief}` : '',
    '',
    'Generate a content draft. Return JSON: { "title": "...", "body": "...(full article, 500-800 words)", "hashtags": ["..."], "cta": "..." }',
  ].filter(Boolean).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { title: title || 'Untitled', body: text, hashtags: [], cta: '' };
  }
}
