/**
 * 채널 콘텐츠 생성 함수
 * 보도자료 → Claude API → 채널별 콘텐츠
 */

import { getRepurposePrompt, buildReviewPrompt, buildAutoFixPrompt } from '../constants/prompts';
import { REPURPOSE_CHANNELS } from '../constants/channels';
import { buildContext } from './contextBuilder';
import { channelToDb, generateCtaLink, generateCampaignSlug } from './supabaseData';

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
 * 채널명 라벨 제거: AI가 첫 줄에 "LinkedIn 포스트", "이메일 뉴스레터" 등을 넣을 때 제거
 */
export function stripChannelLabel(text) {
  if (!text) return '';
  const labels = [
    'LinkedIn 포스트', 'LinkedIn Post', 'LinkedIn',
    '이메일 뉴스레터', 'Email Newsletter',
    '네이버 블로그', 'Naver Blog',
    '카카오톡 채널', '카카오톡', 'KakaoTalk',
    '인스타그램 포스트', '인스타그램', 'Instagram',
    '보도자료', 'Press Release',
  ];
  const escaped = labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  // 첫 줄이 채널명 라벨(단독 또는 대괄호)이면 제거
  return text.replace(new RegExp(`^\\s*(?:\\[?(?:${escaped})\\]?)[\\s:：—-]*\\n`, 'i'), '').trim();
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
    .replace(/^\[핵심키워드\]\s*/gm, '')
    .replace(/^\[보조키워드\]\s*/gm, '')
    .replace(/^\[도입부\]\s*/gm, '')
    .replace(/^\[서론\]\s*/gm, '')
    .replace(/^\[결론\]\s*/gm, '')
    .replace(/^\[소제목\d*\]\s*/gm, '')
    .replace(/^\[태그\]\s*/gm, '')
    .replace(/^\[첫 댓글용 링크\]\s*/gm, '')
    .replace(/^\[푸터\]\s*/gm, '')
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

  // Phase 3: 학습 데이터 컨텍스트 주입
  const dbChannel = channelToDb[channelId] || channelId;
  const learningContext = await buildContext(dbChannel, null, null);

  const prompt = getRepurposePrompt(channelId, pressRelease, options) + learningContext;
  const maxTokens = (channelId === 'kakao' || channelId === 'instagram') ? 1000
    : channelId === 'naver-blog' ? 3000 : 2000;
  const response = await callClaudeForChannel(prompt, apiKey, maxTokens);

  // 1단계: 마크다운 제거
  const cleaned = stripMarkdown(response);

  // 2단계: 채널명 라벨 제거 (AI가 첫 줄에 "LinkedIn 포스트" 등 넣을 때 대비)
  const noLabel = stripChannelLabel(cleaned);

  // 3단계: 채널별 파싱
  const parsed = parseChannelResponse(channelId, noLabel);

  // 4단계: CTA 플레이스홀더 치환
  return replaceCtaPlaceholders(channelId, parsed, pressRelease);
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
  const sections = extractSections(text, ['제목', '프리헤더', '인트로', '본문1', '본문2', '본문3', '핵심요약', 'CTA', '푸터']);

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
      footer: sections['푸터'] || '',
      charCount: body.length,
    };
  }

  const cleaned = removeSectionLabels(text);
  return { body: cleaned, charCount: cleaned.length };
}

function parseNaverBlog(text) {
  // 핵심키워드 추출 (신규 형식 우선, 구 형식 폴백)
  const coreKwMatch = text.match(/\[핵심키워드\]\s*(.+)/) || text.match(/\[SEO\s*키워드\]\s*(.+)/i) || text.match(/SEO키워드:\s*(.+)/);
  const coreKeywords = coreKwMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];

  // 보조키워드 추출
  const subKwMatch = text.match(/\[보조키워드\]\s*(.+)/);
  const subKeywords = subKwMatch?.[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];

  // 통합 SEO 키워드 (하위 호환)
  const seoKeywords = [...coreKeywords, ...subKeywords];

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
  // 키워드/태그 라인 제거
  body = body.replace(/\[핵심키워드\]\s*.+/gi, '');
  body = body.replace(/\[보조키워드\]\s*.+/gi, '');
  body = body.replace(/\[SEO\s*키워드\]\s*.+/gi, '');
  body = body.replace(/SEO키워드:\s*.+/g, '');
  body = body.replace(/\[태그\]\s*[\s\S]*?(?=\[|$)/g, '');
  body = body.replace(/^---+\s*$/gm, '');
  body = body.replace(/제목:\s*.+\n?/, '');
  // 섹션 라벨 제거하되 내용 유지
  body = removeSectionLabels(body);
  // 대괄호 없는 라벨도 제거 (AI가 가끔 대괄호 없이 출력할 때 대비)
  const BARE_LABELS = ['제목', '부제목', '도입부', '서론', '결론', '핵심요약', '핵심키워드', '보조키워드', 'SEO 키워드', 'SEO키워드', 'CTA', '태그', '소제목1', '소제목2', '소제목3', '소제목4', '소제목5'];
  BARE_LABELS.forEach(label => {
    body = body.replace(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'gm'), '');
  });
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  return {
    title,
    body,
    seoKeywords,
    coreKeywords,
    subKeywords,
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
  // 첫 댓글용 링크 추출 (있으면)
  const firstCommentMatch = text.match(/\[첫 댓글용 링크\]\s*([\s\S]*?)(?=\[해시태그\]|$)/);
  const firstComment = firstCommentMatch?.[1]?.trim() || '';
  // 첫 댓글용 링크 섹션 제거
  let processedText = text.replace(/\[첫 댓글용 링크\][\s\S]*?(?=\[해시태그\]|$)/, '');

  // 이중언어 체크
  const koMatch = processedText.match(/---\s*한국어\s*---\s*([\s\S]*?)---\s*English\s*---/i);
  const enMatch = processedText.match(/---\s*English\s*---\s*([\s\S]*?)$/i);

  let mainBody = processedText;
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
    firstComment,
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

// =====================================================
// CTA 플레이스홀더 치환
// =====================================================

/**
 * AI가 생성한 {DEMO_LINK}, {CONSULT_LINK} 플레이스홀더를 실제 추적 링크로 치환.
 * 플레이스홀더가 누락되었으면 본문 끝에 채널별 CTA를 강제 추가.
 * 채널별 CTA 형식:
 *   이메일: HTML <a> 버튼 (데모+상담)
 *   네이버: URL 텍스트 별도 줄 (데모+상담)
 *   링크드인: URL 별도 줄 (데모만)
 *   카카오: URL 별도 줄 (데모만)
 *   인스타: 텍스트 안내만 (링크 없음)
 */
function replaceCtaPlaceholders(channelId, parsed, pressRelease) {
  const dbChannel = channelToDb[channelId] || channelId;
  const campaign = generateCampaignSlug(pressRelease?.id);
  const demoLink = generateCtaLink('demo', dbChannel, campaign);
  const consultLink = generateCtaLink('consult', dbChannel, campaign);

  const bodyField = parsed.caption !== undefined ? 'caption' : 'body';
  let text = parsed[bodyField] || '';

  // 인스타그램: 링크 불가 — 텍스트 안내만
  if (channelId === 'instagram') {
    text = text.replace(/\{DEMO_LINK\}/g, '').replace(/\{CONSULT_LINK\}/g, '');
    if (!text.includes('프로필 링크')) {
      text += '\n\n프로필 링크에서 데모 신청 & 제품 문의 가능!';
    }
    return { ...parsed, [bodyField]: text.replace(/\n{3,}/g, '\n\n').trim() };
  }

  // 채널별 CTA 블록 정의
  const ctaBlocks = {
    'newsletter': `<a href="${demoLink}" style="display:inline-block;padding:12px 24px;background:#8B7355;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">📋 데모 신청하기</a>\n<a href="${consultLink}" style="display:inline-block;padding:12px 24px;background:#555;color:#fff;text-decoration:none;border-radius:6px;">💬 제품 상담하기</a>`,
    'naver-blog': `👉 데모 신청하기: ${demoLink}\n👉 제품 상담하기: ${consultLink}`,
    'linkedin': `🔗 데모 신청하기 👇\n${demoLink}`,
    'kakao': `▶ 자세히 보기\n${demoLink}`,
  };
  const ctaBlock = ctaBlocks[channelId] || `📋 데모 신청하기: ${demoLink}\n💬 제품 상담하기: ${consultLink}`;

  const hadPlaceholders = text.includes('{DEMO_LINK}') || text.includes('{CONSULT_LINK}');

  if (hadPlaceholders) {
    switch (channelId) {
      case 'newsletter':
        // 이메일: placeholder 포함 줄 제거 후 HTML 버튼 추가
        text = text.replace(/.*\{DEMO_LINK\}.*\n?/g, '');
        text = text.replace(/.*\{CONSULT_LINK\}.*\n?/g, '');
        text = text.trim() + '\n\n' + ctaBlock;
        break;
      case 'naver-blog':
        // 네이버: URL 텍스트로 치환 (자동 링크 변환됨)
        text = text.replace(/\{DEMO_LINK\}/g, demoLink);
        text = text.replace(/\{CONSULT_LINK\}/g, consultLink);
        break;
      case 'linkedin':
        // 링크드인: 데모만 치환, 상담 줄 제거
        text = text.replace(/\{DEMO_LINK\}/g, demoLink);
        text = text.replace(/.*\{CONSULT_LINK\}.*\n?/g, '');
        break;
      case 'kakao':
        // 카카오: 데모만 치환, 상담 줄 제거
        text = text.replace(/\{DEMO_LINK\}/g, demoLink);
        text = text.replace(/.*\{CONSULT_LINK\}.*\n?/g, '');
        break;
      default:
        text = text.replace(/\{DEMO_LINK\}/g, demoLink);
        text = text.replace(/\{CONSULT_LINK\}/g, consultLink);
    }
  } else {
    // 플레이스홀더 없음 → 본문 끝에 채널별 CTA 강제 추가
    text += '\n\n' + ctaBlock;
  }

  return { ...parsed, [bodyField]: text.replace(/\n{3,}/g, '\n\n').trim() };
}

// =====================================================
// Phase 2-B: 채널 콘텐츠 검수 + 자동 보정
// =====================================================

/**
 * 채널 콘텐츠 검수 (v1 buildReviewPrompt 활용)
 * 원본 보도자료를 소스로 사용하여 팩트 대조
 * Returns { summary: { critical, warning }, issues: Issue[] }
 */
export async function reviewChannelContent(channelId, contentText, pressReleaseBody, apiKey) {
  // Phase 3: 팩트 데이터를 검수 프롬프트에 주입 (검수 정확도 향상)
  const dbChannel = channelToDb[channelId] || channelId;
  const factContext = await buildContext(dbChannel, null, null);

  const prompt = buildReviewPrompt({
    content: contentText,
    channelId,
    userSourceText: pressReleaseBody,
  }) + factContext;

  const raw = await callClaudeForChannel(prompt, apiKey, 2000);
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  let issues = [];
  if (jsonMatch) {
    try { issues = JSON.parse(jsonMatch[0]); } catch { issues = []; }
  }
  if (!Array.isArray(issues)) issues = [];

  const critical = issues.filter(i => i.severity === 'red' || i.severity === 'critical').length;
  const warning = issues.filter(i => i.severity === 'yellow').length;

  return {
    summary: { critical, warning },
    issues,
  };
}

/**
 * 채널 콘텐츠 자동 보정 (buildAutoFixPrompt 활용)
 * Returns { fixedContent, fixes[], needsInput[] }
 */
export async function autoFixChannelContent(channelId, contentText, reviewResult, pressReleaseBody, apiKey) {
  const prompt = buildAutoFixPrompt({
    content: contentText,
    issues: reviewResult.issues,
    confirmedFields: { 원본보도자료: pressReleaseBody },
    channelId,
    kbText: '',
  });

  const raw = await callClaudeForChannel(prompt, apiKey, 3000);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { fixedContent: contentText, fixes: [], needsInput: [] };

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // 보정된 텍스트에도 마크다운 제거 + 라벨 제거 적용
    if (parsed.fixedContent) {
      parsed.fixedContent = stripChannelLabel(stripMarkdown(parsed.fixedContent));
    }
    return parsed;
  } catch {
    return { fixedContent: contentText, fixes: [], needsInput: [] };
  }
}
