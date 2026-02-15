/**
 * 채널 콘텐츠 생성 함수
 * 보도자료 → Claude API → 채널별 콘텐츠
 */

import { getRepurposePrompt } from '../constants/prompts';
import { REPURPOSE_CHANNELS } from '../constants/channels';

const API_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

async function callClaudeForChannel(prompt, apiKey, maxTokens = 2000) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
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
 * 단일 채널 콘텐츠 생성
 */
export async function generateChannelContent(pressRelease, channelId, options = {}) {
  const { apiKey } = options;
  if (!apiKey) throw new Error('API 키가 필요합니다');

  const channel = REPURPOSE_CHANNELS.find(c => c.id === channelId);
  if (!channel) throw new Error(`알 수 없는 채널: ${channelId}`);

  const prompt = getRepurposePrompt(channelId, pressRelease, options);
  const maxTokens = channelId === 'kakao' ? 1000 : 2000;
  const response = await callClaudeForChannel(prompt, apiKey, maxTokens);

  return parseChannelResponse(channelId, response);
}

/**
 * 전체 채널 일괄 생성
 */
export async function generateAllChannels(pressRelease, options = {}) {
  const results = {};
  const errors = {};

  for (const channel of REPURPOSE_CHANNELS) {
    try {
      results[channel.id] = await generateChannelContent(pressRelease, channel.id, options);
    } catch (error) {
      errors[channel.id] = error.message;
      console.error(`[${channel.name}] 생성 실패:`, error);
    }
  }

  return { results, errors };
}

/**
 * 채널별 응답 파싱
 */
function parseChannelResponse(channelId, rawResponse) {
  const text = typeof rawResponse === 'string' ? rawResponse : rawResponse?.content || '';

  switch (channelId) {
    case 'naver-blog':
      return parseNaverBlog(text);
    case 'kakao':
      return parseKakao(text);
    case 'instagram':
      return parseInstagram(text);
    case 'linkedin':
      return parseLinkedin(text);
    default:
      return { body: text };
  }
}

function parseNaverBlog(text) {
  const titleMatch = text.match(/제목:\s*(.+)/);
  const keywordsMatch = text.match(/SEO키워드:\s*(.+)/);

  const bodyStart = text.indexOf('---', text.indexOf('---') + 3);
  const body = bodyStart > 0 ? text.substring(bodyStart + 3).trim() : text;

  const imagePositions = [];
  const imageRegex = /\[IMAGE:\s*(.+?)\]/g;
  let match;
  while ((match = imageRegex.exec(body)) !== null) {
    imagePositions.push({ position: match.index, description: match[1] });
  }

  return {
    title: titleMatch?.[1]?.trim() || '',
    body,
    seoKeywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [],
    imagePositions,
    charCount: body.length,
  };
}

function parseKakao(text) {
  return {
    body: text.trim(),
    charCount: text.trim().length,
  };
}

function parseInstagram(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        slides: parsed.slides || [],
        hashtags: parsed.hashtags || [],
        caption: parsed.caption || '',
        charCount: parsed.slides?.join('').length || 0,
      };
    }
  } catch {
    // JSON 파싱 실패 시 텍스트 기반 파싱
  }

  const slides = text.split(/\n\n+/)
    .filter(s => s.trim())
    .map(s => s.replace(/^슬라이드\s*\d+[:\s]*/i, '').trim());

  const hashtagLine = slides.find(s => s.startsWith('#'));
  const hashtags = hashtagLine
    ? hashtagLine.match(/#(\S+)/g)?.map(t => t.replace('#', '')) || []
    : [];

  return {
    slides: slides.filter(s => !s.startsWith('#')),
    hashtags,
    caption: '',
    charCount: slides.join('').length,
  };
}

function parseLinkedin(text) {
  const hashtagRegex = /#(\S+)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  const koMatch = text.match(/---한국어---\s*([\s\S]*?)---English---/);
  const enMatch = text.match(/---English---\s*([\s\S]*?)$/);

  if (koMatch && enMatch) {
    return {
      body: koMatch[1].trim(),
      bodyEn: enMatch[1].trim(),
      hashtags,
      language: 'ko+en',
      charCount: koMatch[1].trim().length,
    };
  }

  return {
    body: text.trim(),
    hashtags,
    charCount: text.trim().length,
  };
}
