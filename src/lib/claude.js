import { buildPrompt, buildFromPRPrompt, buildReviewPrompt, buildParsingPrompt, buildFactBasedPrompt, buildV2ReviewPrompt, buildAutoFixPrompt, buildQuoteSuggestionsPrompt } from '../constants/prompts';
import { formatKBForPrompt } from '../constants/knowledgeBase';

const API_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

async function callClaude(prompt, apiKey, maxTokens = 4000) {
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

/**
 * Review content for multiple channels in parallel.
 * Returns { channelId: Issue[], ... } where Issue = { severity, category, message, quote, section }
 */
export async function reviewMultiChannel({ contentByChannel, channels, channelIds, userSourceText, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');

  const reviews = {};

  await Promise.all((channelIds || channels || []).map(async (channelId) => {
    const content = contentByChannel[channelId];
    if (!content) return;
    try {
      const prompt = buildReviewPrompt({ content, channelId, userSourceText });
      const raw = await callClaude(prompt, apiKey, 2000);
      // Extract JSON from response (may have surrounding text)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        reviews[channelId] = Array.isArray(parsed) ? parsed : [];
      } else {
        reviews[channelId] = [];
      }
    } catch (e) {
      reviews[channelId] = [{ severity: 'yellow', category: '검수 오류', message: `검수 실패: ${e.message}`, quote: '', section: '' }];
    }
  }));

  return reviews;
}

// =====================================================
// Factory v2 API Functions — 3-pass pipeline
// =====================================================

/**
 * STEP 1: Parse source text into category + structured fields.
 * Returns { category: string, fields: { key: value|null } }
 */
export async function parseContent({ sourceText, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildParsingPrompt(sourceText);
  const raw = await callClaude(prompt, apiKey, 2000);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('파싱 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * STEP 3: Generate content from confirmed facts for a single channel.
 * Accepts knowledgeBase entries for automatic KB inclusion in prompt.
 * Returns generated text string.
 */
export async function generateFromFacts({ category, confirmedFields, timing, channelId, apiKey, knowledgeBase }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const kbText = knowledgeBase ? formatKBForPrompt(knowledgeBase) : '';
  const prompt = buildFactBasedPrompt({ category, confirmedFields, timing, channelId, kbText });
  return await callClaude(prompt, apiKey, 4000);
}

/**
 * STEP 4: Review generated content against confirmed facts.
 * Returns { summary: { critical, warning, factRatio }, issues: [...] }
 */
export async function reviewV2({ content, confirmedFields, channelId, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildV2ReviewPrompt({ content, confirmedFields, channelId });
  const raw = await callClaude(prompt, apiKey, 2000);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('검수 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * STEP 4.5: Auto-fix content based on review issues.
 * Returns { fixedContent, fixes[], needsInput[] }
 */
export async function autoFixContent({ content, issues, confirmedFields, channelId, apiKey, knowledgeBase }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const kbText = knowledgeBase ? formatKBForPrompt(knowledgeBase) : '';
  const prompt = buildAutoFixPrompt({ content, issues, confirmedFields, channelId, kbText });
  const raw = await callClaude(prompt, apiKey, 4000);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('자동 수정 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate 3 CEO quote suggestions based on context.
 * Returns [{ label, tone, text }, ...]
 */
export async function generateQuoteSuggestions({ category, confirmedFields, generatedContent, timing, apiKey }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildQuoteSuggestionsPrompt({ category, confirmedFields, generatedContent, timing });
  const raw = await callClaude(prompt, apiKey, 1500);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('인용문 생성 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}
