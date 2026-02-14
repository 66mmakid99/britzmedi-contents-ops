import { buildPrompt, buildFromPRPrompt } from '../constants/prompts';

const API_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

async function callClaude(prompt, apiKey) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
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
 * Generate content for multiple channels in parallel (normal factory).
 */
export async function generateMultiChannel({ pillarId, topicPrompt, channels, extraContext, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  if (!channels.length) throw new Error('채널을 선택하세요');

  const results = {};
  const errors = {};

  await Promise.all(channels.map(async (channelId) => {
    try {
      const prompt = buildPrompt({ pillarId, topicPrompt, channelId, extraContext });
      results[channelId] = await callClaude(prompt, apiKey);
    } catch (e) {
      errors[channelId] = e.message;
    }
  }));

  return { results, errors };
}

/**
 * Generate channel content from a press release source (PR → channels).
 */
export async function generateFromPR({ prText, channels, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  if (!channels.length) throw new Error('채널을 선택하세요');

  const results = {};
  const errors = {};

  await Promise.all(channels.map(async (channelId) => {
    try {
      const prompt = buildFromPRPrompt({ prText, channelId });
      results[channelId] = await callClaude(prompt, apiKey);
    } catch (e) {
      errors[channelId] = e.message;
    }
  }));

  return { results, errors };
}
