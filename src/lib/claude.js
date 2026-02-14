import { buildPrompt } from '../constants/prompts';

/**
 * Generate content for a single channel.
 * Returns the raw text output from Claude.
 */
async function generateForChannel({ pillarId, topicPrompt, channelId, extraContext, apiKey }) {
  const prompt = buildPrompt({ pillarId, topicPrompt, channelId, extraContext });

  const res = await fetch('https://britzmedi-api-proxy.mmakid.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
}

/**
 * Generate content for multiple channels in parallel.
 * Returns { channelId: text, ... } and { channelId: error, ... }
 */
export async function generateMultiChannel({ pillarId, topicPrompt, channels, extraContext, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  if (!channels.length) throw new Error('채널을 선택하세요');

  const results = {};
  const errors = {};

  const promises = channels.map(async (channelId) => {
    try {
      const text = await generateForChannel({
        pillarId,
        topicPrompt,
        channelId,
        extraContext,
        apiKey,
      });
      results[channelId] = text;
    } catch (e) {
      errors[channelId] = e.message;
    }
  });

  await Promise.all(promises);
  return { results, errors };
}
