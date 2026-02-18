import { buildPrompt, buildFromPRPrompt, buildReviewPrompt, buildParsingPrompt, buildFactBasedPrompt, buildV2ReviewPrompt, buildAutoFixPrompt, buildQuoteSuggestionsPrompt, buildDocumentSummaryPrompt } from '../constants/prompts';
import { formatKBForPrompt } from '../constants/knowledgeBase';
import { buildContext } from './contextBuilder';

const API_URL = 'https://britzmedi-api-proxy.mmakid.workers.dev';

async function callClaude(prompt, apiKey, maxTokens = 4000, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    // 529 Overloaded → 재시도 (지수 백오프)
    if (res.status === 529 && attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
      continue;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.map((b) => (b.type === 'text' ? b.text : '')).join('') || '';
    const usage = data.usage || null;
    return { text, usage };
  }
  throw new Error('API 과부하 상태입니다. 잠시 후 다시 시도해주세요.');
}

/**
 * Generate content for multiple channels in parallel (normal factory).
 */
export async function generateMultiChannel({ pillarId, topicPrompt, channels, extraContext, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  if (!channels.length) throw new Error('채널을 선택하세요');

  const results = {};
  const errors = {};

  await Promise.all(channels.map(async (channelId) => {
    try {
      const prompt = buildPrompt({ pillarId, topicPrompt, channelId, extraContext });
      const { text, usage } = await callClaude(prompt, apiKey);
      tracker?.addCall(`factory-${channelId}`, usage);
      results[channelId] = text;
    } catch (e) {
      errors[channelId] = e.message;
    }
  }));

  return { results, errors };
}

/**
 * Generate channel content from a press release source (PR → channels).
 */
export async function generateFromPR({ prText, channels, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  if (!channels.length) throw new Error('채널을 선택하세요');

  const results = {};
  const errors = {};

  await Promise.all(channels.map(async (channelId) => {
    try {
      const prompt = buildFromPRPrompt({ prText, channelId });
      const { text, usage } = await callClaude(prompt, apiKey);
      tracker?.addCall(`frompr-${channelId}`, usage);
      results[channelId] = text;
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
export async function reviewMultiChannel({ contentByChannel, channels, channelIds, userSourceText, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');

  const reviews = {};

  await Promise.all((channelIds || channels || []).map(async (channelId) => {
    const content = contentByChannel[channelId];
    if (!content) return;
    try {
      const prompt = buildReviewPrompt({ content, channelId, userSourceText });
      const { text: raw, usage } = await callClaude(prompt, apiKey, 2000);
      tracker?.addCall(`review-multi-${channelId}`, usage);
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
export async function parseContent({ sourceText, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildParsingPrompt(sourceText);
  const { text: raw, usage } = await callClaude(prompt, apiKey, 2000);
  tracker?.addCall('parse', usage);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('파싱 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * STEP 3: Generate content from confirmed facts for a single channel.
 * Accepts knowledgeBase entries for automatic KB inclusion in prompt.
 * Returns generated text string.
 */
export async function generateFromFacts({ category, confirmedFields, timing, channelId, apiKey, knowledgeBase, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const kbText = knowledgeBase ? formatKBForPrompt(knowledgeBase) : '';
  const prompt = buildFactBasedPrompt({ category, confirmedFields, timing, channelId, kbText });

  // Phase 3: 학습 데이터 컨텍스트 주입 (보도자료 = channel null)
  const product = confirmedFields?.제품명 || confirmedFields?.productName || null;
  const learningContext = await buildContext(null, category, product);

  const { text, usage } = await callClaude(prompt + learningContext, apiKey, 4000);
  tracker?.addCall('generate', usage);
  return text;
}

/**
 * STEP 4: Review generated content against confirmed facts.
 * Returns { summary: { critical, warning, factRatio }, issues: [...] }
 */
export async function reviewV2({ content, confirmedFields, channelId, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildV2ReviewPrompt({ content, confirmedFields, channelId });
  const { text: raw, usage } = await callClaude(prompt, apiKey, 2000);
  tracker?.addCall('review-pr', usage);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('검수 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * STEP 4.5: Auto-fix content based on review issues.
 * Returns { fixedContent, fixes[], needsInput[] }
 */
export async function autoFixContent({ content, issues, confirmedFields, channelId, apiKey, knowledgeBase, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const kbText = knowledgeBase ? formatKBForPrompt(knowledgeBase) : '';
  const prompt = buildAutoFixPrompt({ content, issues, confirmedFields, channelId, kbText });
  const { text: raw, usage } = await callClaude(prompt, apiKey, 4000);
  tracker?.addCall('fix-pr', usage);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('자동 수정 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate 3 CEO quote suggestions based on context.
 * Returns [{ label, tone, text }, ...]
 */
/**
 * Summarize an uploaded document for KB storage.
 * Returns { title, category, summary, extractedData }
 */
export async function summarizeDocumentForKB({ rawText, fileName, apiKey, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildDocumentSummaryPrompt(rawText, fileName);
  const { text: raw, usage } = await callClaude(prompt, apiKey, 2000);
  tracker?.addCall('kb-summarize', usage);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('문서 요약 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}

export async function generateQuoteSuggestions({ category, confirmedFields, generatedContent, timing, apiKey, speakerName, speakerTitle, tracker }) {
  if (!apiKey) throw new Error('API 키가 필요합니다');
  const prompt = buildQuoteSuggestionsPrompt({ category, confirmedFields, generatedContent, timing, speakerName, speakerTitle });
  const { text: raw, usage } = await callClaude(prompt, apiKey, 1500);
  tracker?.addCall('quote', usage);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('인용문 생성 결과를 해석할 수 없습니다');
  return JSON.parse(jsonMatch[0]);
}
