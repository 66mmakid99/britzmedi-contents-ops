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
 * 마크다운 마크업 제거 필터 (강화 버전)
 * AI가 규칙을 무시하고 마크다운을 쓸 때를 대비한 이중 방어
 */
export function stripMarkdown(text) {
  if (!text) return '';
  return text
    // 굵게: **text** 또는 __text__
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    // 이탤릭: *text* 또는 _text_ (단, 이미 처리된 ** 이후)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
    // 제목: # ~ ######
    .replace(/^#{1,6}\s+/gm, '')
    // 불릿: - item, * item, + item → · item
    .replace(/^[\-\*\+]\s+/gm, '· ')
    // 코드블록: ```code```
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드: `code`
    .replace(/`([^`]+)`/g, '$1')
    // 인용: > text
    .replace(/^>\s+/gm, '')
    // 구분선: ---, ***, ___
    .replace(/^[\-\*_]{3,}\s*$/gm, '')
    // 링크: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 과도한 빈줄 정리
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 섹션 라벨 제거: [제목], [본문] 등의 라벨만 제거하고 내용은 유지
 */
function removeSectionLabels(text) {
  if (!text) return '';
  return text
    .replace(/^\[제목\]\s*/gm, '')
    .replace(/^\[부제목\]\s*/gm, '')
    .replace(/^\[본문\]\s*/gm, '')
    .replace(/^\[인트로\]\s*/gm, '')
    .replace(/^\[본문1\]\s*/gm, '')
    .replace(/^\[본문2\]\s*/gm, '')
    .replace(/^\[본문3\]\s*/gm, '')
    .replace(/^\[프리헤더\]\s*/gm, '')
    .replace(/^\[핵심요약\]\s*/gm, '')
    .replace(/^\[CTA\]\s*/gm, '')
    .replace(/^\[훅\]\s*/gm, '')
    .replace(/^\[핵심 포인트\]\s*/gm, '')
    .replace(/^\[캡션\]\s*/gm, '')
    .replace(/^\[이미지 가이드\]\s*/gm, '')
    .replace(/^\[해시태그\]\s*/gm, '')
    .replace(/^\[SEO 키워드\]\s*/gm, '')
    .replace(/^\[SEO키워드\]\s*/gm, '')
    .replace(/^\[도입부\]\s*/gm, '')
    .replace(/^\[소제목\d*\]\s*/gm, '')
    .replace(/^\[태그\]\s*/gm, '')
    .trim();
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
  const maxTokens = (channelId === 'kakao' || channelId === 'instagram') ? 1000 : 2000;
  const response = await callClaudeForChannel(prompt, apiKey, maxTokens);

  // 1단계: 마크다운 제거
  const cleaned = stripMarkdown(response);

  // 2단계: 채널별 파싱
  return parseChannelResponse(channelId, cleaned);
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
    case 'newsletter':
      return parseNewsletter(text);
    default:
      return { body: removeSectionLabels(text), charCount: text.length };
  }
}

// =====================================================
// 채널별 파서
// =====================================================

function parseNewsletter(text) {
  const sections = extractSections(text, ['제목', '프리헤더', '인트로', '본문1', '본문2', '본문3', '핵심요약', 'CTA']);

  // 섹션이 파싱되면 구조화, 안 되면 전체 텍스트
  if (sections['제목'] || sections['인트로']) {
    const body = [
      sections['인트로'],
      sections['본문1'],
      sections['본문2'],
      sections['본문3'],
      sections['핵심요약'] ? '\n' + sections['핵심요약'] : '',
      sections['CTA'],
    ].filter(Boolean).join('\n\n');

    return {
      title: sections['제목'] || '',
      preheader: sections['프리헤더'] || '',
      body,
      charCount: body.length,
    };
  }

  const cleaned = removeSectionLabels(text);
  return { body: cleaned, charCount: cleaned.length };
}

function parseNaverBlog(text) {
  // SEO 키워드 추출
  const keywordsMatch = text.match(/\[SEO\s*키워드\]\s*(.+)/i) || text.match(/SEO키워드:\s*(.+)/);
  const seoKeywords = keywordsMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];

  // 태그 추출
  const tagMatch = text.match(/\[태그\]\s*([\s\S]*?)(?=\[|$)/);
  const tags = tagMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [];

  // 제목 추출
  const titleMatch = text.match(/\[제목\]\s*(.+)/) || text.match(/제목:\s*(.+)/);
  const title = titleMatch?.[1]?.trim() || '';

  // 이미지 위치 추출
  const imagePositions = [];
  const imageRegex = /\[IMAGE:\s*(.+?)\]/g;
  let match;
  while ((match = imageRegex.exec(text)) !== null) {
    imagePositions.push({ position: match.index, description: match[1] });
  }

  // 본문: 라벨과 메타 제거 후 깨끗한 텍스트
  let body = text;
  // SEO키워드/태그 라인 제거
  body = body.replace(/\[SEO\s*키워드\]\s*.+/gi, '');
  body = body.replace(/SEO키워드:\s*.+/g, '');
  body = body.replace(/\[태그\]\s*[\s\S]*?(?=\[|$)/g, '');
  body = body.replace(/^---+\s*$/gm, '');
  body = body.replace(/제목:\s*.+\n?/, '');
  // 섹션 라벨 제거하되 내용 유지
  body = removeSectionLabels(body);
  // 대괄호 없는 라벨도 제거 (AI가 가끔 대괄호 없이 출력할 때 대비)
  const BARE_LABELS = ['제목', '부제목', '도입부', '핵심요약', 'SEO 키워드', 'SEO키워드', 'CTA', '태그', '소제목1', '소제목2', '소제목3'];
  BARE_LABELS.forEach(label => {
    body = body.replace(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'gm'), '');
  });
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return {
    title,
    body,
    seoKeywords,
    tags,
    imagePositions,
    charCount: body.length,
  };
}

function parseKakao(text) {
  const sections = extractSections(text, ['제목', '본문', 'CTA']);

  if (sections['제목'] || sections['본문']) {
    const title = sections['제목'] || '';
    const bodyText = sections['본문'] || '';
    const cta = sections['CTA'] || '';

    const fullBody = [title, '', bodyText, '', cta].filter((v, i) => {
      // 빈 줄은 구분용으로 유지, 빈 문자열 섹션은 제거
      if (v === '') return i > 0; // 첫 번째가 빈 줄이면 제거
      return true;
    }).join('\n').trim();

    return {
      title,
      body: fullBody,
      charCount: fullBody.length,
    };
  }

  // 파싱 실패 시 전체 텍스트 (라벨만 제거)
  const cleaned = removeSectionLabels(text);
  return {
    body: cleaned,
    charCount: cleaned.length,
  };
}

function parseInstagram(text) {
  const sections = extractSections(text, ['캡션', '이미지 가이드', '해시태그']);

  const caption = sections['캡션'] || '';
  const imageGuide = sections['이미지 가이드'] || '';
  const hashtagText = sections['해시태그'] || '';

  // 해시태그 추출
  const hashtags = hashtagText.match(/#(\S+)/g)?.map(t => t.replace('#', '')) || [];

  // 캡션이 없으면 전체 텍스트에서 해시태그 전까지를 캡션으로
  const finalCaption = caption || text.replace(/\[캡션\]\s*/g, '').replace(/\[이미지 가이드\][\s\S]*$/g, '').replace(/\[해시태그\][\s\S]*$/g, '').trim();

  return {
    body: finalCaption,
    caption: finalCaption,
    imageGuide,
    hashtags,
    charCount: finalCaption.length,
  };
}

function parseLinkedin(text) {
  // 이중언어 체크
  const koMatch = text.match(/---\s*한국어\s*---\s*([\s\S]*?)---\s*English\s*---/i);
  const enMatch = text.match(/---\s*English\s*---\s*([\s\S]*?)$/i);

  let mainBody = text;
  let bodyEn = null;

  if (koMatch && enMatch) {
    mainBody = koMatch[1].trim();
    bodyEn = enMatch[1].trim();
  }

  // 해시태그를 본문에서 분리
  const hashtagLineRegex = /^(#\S+\s*)+$/gm;
  const hashtagLines = mainBody.match(hashtagLineRegex) || [];
  const allHashtags = hashtagLines.join(' ').match(/#(\S+)/g)?.map(t => t.replace('#', '')) || [];

  // 본문에서 해시태그 줄 제거
  let cleanBody = mainBody.replace(hashtagLineRegex, '').trim();
  // 섹션 라벨 제거
  cleanBody = removeSectionLabels(cleanBody);
  // 구분선 제거
  cleanBody = cleanBody.replace(/^---+\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

  // 영문 버전도 정리
  if (bodyEn) {
    bodyEn = bodyEn.replace(hashtagLineRegex, '').trim();
    bodyEn = removeSectionLabels(bodyEn);
    bodyEn = bodyEn.replace(/^---+\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  return {
    body: cleanBody,
    bodyEn: bodyEn || null,
    hashtags: allHashtags,
    language: bodyEn ? 'ko+en' : 'ko',
    charCount: cleanBody.length,
  };
}

// =====================================================
// 유틸리티
// =====================================================

/**
 * [라벨] 기반으로 섹션을 추출하는 범용 함수
 * 예: extractSections(text, ['제목', '본문', 'CTA'])
 * → { '제목': '...', '본문': '...', 'CTA': '...' }
 */
function extractSections(text, labels) {
  const result = {};
  const pattern = labels.map(l => `\\[${l}\\]`).join('|');
  const regex = new RegExp(`(${pattern})`, 'g');

  const parts = text.split(regex).filter(Boolean);

  let currentLabel = null;
  for (const part of parts) {
    const labelMatch = part.match(/^\[(.+)\]$/);
    if (labelMatch && labels.includes(labelMatch[1])) {
      currentLabel = labelMatch[1];
    } else if (currentLabel) {
      result[currentLabel] = (result[currentLabel] || '') + part.trim();
      currentLabel = null;
    }
  }

  return result;
}
