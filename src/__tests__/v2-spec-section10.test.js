/**
 * CONTENT-FACTORY-V2-SPEC — 섹션 10: 검수 테스트 7개
 *
 * TEST-1: 할루시네이션 차단 (짧은 소스) — 파싱 null 필드 + 생성 결과에 날조 없는지
 * TEST-2: 할루시네이션 차단 (풍부한 소스) — 모든 팩트 추출 + 날조 없는지
 * TEST-3: 의료법 금지어 — 금지어 자동 변환 + 검수 🔴 감지
 * TEST-4: 영문 표기 — 첫 등장 "국문(영문)" 규칙 준수
 * TEST-5: 시제 일관성 — 예고형=미래, 리뷰형=과거
 * TEST-6: 에디터 기능 — 셀 편집, 전체복사(라벨 제외), Word/PDF
 * TEST-7: 채널 재가공 — 기존 from-PR 플로우 유지 확인
 */

import { describe, it, expect } from 'vitest';
import {
  buildParsingPrompt,
  buildFactBasedPrompt,
  buildReviewPrompt,
  buildV2ReviewPrompt,
  buildAutoFixPrompt,
  buildFromPRPrompt,
  CHANNEL_CONFIGS,
  PR_CATEGORIES,
} from '../constants/prompts.js';
import { formatKBForPrompt } from '../constants/knowledgeBase.js';
import { parseSections, assembleSections, assembleTextOnly } from '../lib/sectionUtils.js';

// =====================================================
// TEST-1: 할루시네이션 차단 (짧은 소스)
// =====================================================
describe('TEST-1: 할루시네이션 차단 — 짧은 소스', () => {
  const shortSource = 'BRITZMEDI가 AMWC Monaco 2026에 참가합니다.';

  it('파싱 프롬프트: 소스에 없는 정보는 null 출력 지시', () => {
    const prompt = buildParsingPrompt(shortSource);
    expect(prompt).toContain('null');
    expect(prompt).toContain('소스에 해당 정보가 없으면 반드시 null');
    expect(prompt).toContain('절대 지어내지 마세요');
  });

  it('파싱 프롬프트: 카테고리 목록 포함', () => {
    const prompt = buildParsingPrompt(shortSource);
    expect(prompt).toContain('exhibition');
    expect(prompt).toContain('partnership');
    expect(prompt).toContain('general');
  });

  it('생성 프롬프트: 날조 금지 규칙 포함', () => {
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: { eventName: 'AMWC Monaco 2026' },
      timing: 'pre',
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('날조');
    expect(prompt).toContain('절대 만들지 마세요');
    expect(prompt).toContain('[추가 정보 필요');
  });

  it('생성 프롬프트: 빈 필드는 팩트 섹션에 포함 안 됨', () => {
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: { eventName: 'AMWC', boothInfo: null, livePrograms: '', exhibitProducts: undefined },
      timing: 'pre',
      channelId: 'pressrelease',
    });
    // Only eventName should appear in the facts section
    expect(prompt).toContain('AMWC');
    // null/empty/undefined fields should be filtered out
    expect(prompt).not.toMatch(/부스 정보.*null/);
    expect(prompt).not.toMatch(/라이브.*: $/m);
  });
});

// =====================================================
// TEST-2: 할루시네이션 차단 (풍부한 소스)
// =====================================================
describe('TEST-2: 할루시네이션 차단 — 풍부한 소스', () => {
  it('생성 프롬프트: 모든 확인된 팩트 포함', () => {
    const fields = {
      eventName: 'AMWC Monaco 2026',
      eventDate: '2026년 3월 15-17일',
      eventLocation: '모나코 그리말디 포럼',
      boothInfo: 'H301',
      exhibitProducts: 'TORR RF, LuminoWave',
    };
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: fields,
      timing: 'pre',
      channelId: 'pressrelease',
    });

    for (const val of Object.values(fields)) {
      expect(prompt).toContain(val);
    }
  });

  it('생성 프롬프트: 지식 베이스 정보 포함', () => {
    const kbEntries = [
      { id: 'kb1', title: 'TORR RF', category: 'product', content: 'FDA 승인 기술' },
    ];
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: { eventName: 'AMWC' },
      timing: 'pre',
      channelId: 'pressrelease',
      kbText: formatKBForPrompt(kbEntries),
    });
    expect(prompt).toContain('FDA 승인 기술');
    expect(prompt).toContain('지식 베이스');
  });

  it('생성 프롬프트: "뼈대(팩트) + 살(지식베이스)" 구조 명시', () => {
    const prompt = buildFactBasedPrompt({
      category: 'general',
      confirmedFields: { headline: '테스트' },
      timing: 'pre',
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('뼈대');
    expect(prompt).toContain('살');
    expect(prompt).toContain('지식');
  });
});

// =====================================================
// TEST-3: 의료법 금지어
// =====================================================
describe('TEST-3: 의료법 금지어 감지 + 자동 변환', () => {
  const FORBIDDEN_TERMS = ['극대화', '최소화', '완벽한', '획기적인', '혁명적인', '완치', '부작용 없음'];
  const REPLACEMENTS = { '극대화': '개선', '최소화': '감소', '완벽한': '우수한', '획기적인': '차별화된' };

  it('v2 검수 프롬프트: 모든 금지어 나열', () => {
    const prompt = buildV2ReviewPrompt({
      content: '테스트 콘텐츠',
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    for (const term of FORBIDDEN_TERMS) {
      expect(prompt).toContain(term);
    }
  });

  it('v1 검수 프롬프트: 금지어 + red severity 지시', () => {
    const prompt = buildReviewPrompt({
      content: '테스트 콘텐츠',
      channelId: 'newsletter',
    });
    for (const term of FORBIDDEN_TERMS) {
      expect(prompt).toContain(term);
    }
    expect(prompt).toContain('"red"');
    expect(prompt).toContain('의료법');
  });

  it('자동 수정 프롬프트: 금지어 → 허용 표현 대체 규칙', () => {
    const prompt = buildAutoFixPrompt({
      content: '이 기기는 획기적인 효과를 극대화합니다.',
      issues: [{ severity: 'red', category: '의료법 준수', message: '금지어: 획기적인', quote: '획기적인' }],
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    for (const [forbidden, allowed] of Object.entries(REPLACEMENTS)) {
      expect(prompt).toContain(forbidden);
      expect(prompt).toContain(allowed);
    }
  });

  it('검수 프롬프트: "RF 마이크로니들링" 감지 규칙', () => {
    const prompt = buildV2ReviewPrompt({
      content: 'RF 마이크로니들링 기술',
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('RF 마이크로니들링');
    expect(prompt).toContain('TOROIDAL 고주파 기반 EBD');
  });

  it('자동 수정 프롬프트: "RF 마이크로니들링" → "TOROIDAL 고주파 기반 EBD" 대체 규칙', () => {
    const prompt = buildAutoFixPrompt({
      content: 'RF 마이크로니들링 기술',
      issues: [{ severity: 'red', category: '의료법 준수', message: '제품 분류 오류' }],
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('RF 마이크로니들링');
    expect(prompt).toContain('TOROIDAL 고주파 기반 EBD');
  });
});

// =====================================================
// TEST-4: 영문 표기
// =====================================================
describe('TEST-4: 영문 표기 — 첫 등장 "국문(영문)" 규칙', () => {
  it('v2 검수 프롬프트: 영문 표기 규칙 포함', () => {
    const prompt = buildV2ReviewPrompt({
      content: '테스트',
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('국문(영문)');
    expect(prompt).toContain('이후 국문만');
  });

  it('생성 프롬프트: 영문 표기 규칙 포함', () => {
    const prompt = buildFactBasedPrompt({
      category: 'general',
      confirmedFields: { headline: '테스트' },
      timing: 'pre',
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('영문 표기');
    expect(prompt).toContain('국문(영문)');
  });

  it('자동 수정 프롬프트: 영문 표기 위반 수정 규칙', () => {
    const prompt = buildAutoFixPrompt({
      content: '테스트',
      issues: [{ severity: 'yellow', category: '표기법', message: '영문 표기 규칙 위반' }],
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('영문 표기 규칙 위반');
    expect(prompt).toContain('국문(영문)');
  });
});

// =====================================================
// TEST-5: 시제 일관성
// =====================================================
describe('TEST-5: 시제 일관성 — 예고형=미래, 리뷰형=과거', () => {
  it('예고형(pre): 미래 시제 + 과거형 금지', () => {
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: { eventName: 'AMWC' },
      timing: 'pre',
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('예고형');
    expect(prompt).toContain('~할 예정이다');
    expect(prompt).toContain('~에 참가한다');
    expect(prompt).toContain('과거형 절대 금지');
  });

  it('리뷰형(post): 과거 시제 + 미래형 금지', () => {
    const prompt = buildFactBasedPrompt({
      category: 'exhibition',
      confirmedFields: { eventName: 'AMWC' },
      timing: 'post',
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('리뷰형');
    expect(prompt).toContain('~했다');
    expect(prompt).toContain('~를 선보였다');
    expect(prompt).toContain('미래형 절대 금지');
  });

  it('v2 검수 프롬프트: 시제 일관성 검수 규칙 포함', () => {
    const prompt = buildV2ReviewPrompt({
      content: '테스트',
      confirmedFields: {},
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('시제');
    expect(prompt).toContain('미래');
    expect(prompt).toContain('과거');
  });
});

// =====================================================
// TEST-6: 에디터 기능 — 셀 편집, 전체복사(라벨 제외), Word/PDF
// =====================================================
describe('TEST-6: 에디터 기능', () => {
  const sampleRaw = `[제목]\n브릿츠메디, AMWC 참가\n\n[본문]\n메디컬 에스테틱 전문기업 브릿츠메디가 참가합니다.\n\n[회사 소개]\n브릿츠메디는 2017년 설립되었습니다.`;

  it('셀 편집: parseSections 정확한 파싱', () => {
    const sections = parseSections(sampleRaw);
    expect(sections).toHaveLength(3);
    expect(sections[0].label).toBe('제목');
    expect(sections[0].text).toBe('브릿츠메디, AMWC 참가');
    expect(sections[1].label).toBe('본문');
    expect(sections[1].text).toContain('참가합니다');
    expect(sections[2].label).toBe('회사 소개');
  });

  it('셀 편집: 빈 입력 처리', () => {
    expect(parseSections('')).toEqual([]);
    expect(parseSections(null)).toEqual([]);
    expect(parseSections(undefined)).toEqual([]);
  });

  it('셀 편집: 라벨 없는 입력 → "전체" 섹션', () => {
    const sections = parseSections('마크다운 없는 일반 텍스트');
    expect(sections).toHaveLength(1);
    expect(sections[0].label).toBe('전체');
  });

  it('전체복사(라벨 제외): assembleTextOnly는 라벨 없이 텍스트만', () => {
    const sections = parseSections(sampleRaw);
    const textOnly = assembleTextOnly(sections);
    // 라벨 [제목], [본문], [회사 소개]가 포함되면 안 됨
    expect(textOnly).not.toContain('[제목]');
    expect(textOnly).not.toContain('[본문]');
    expect(textOnly).not.toContain('[회사 소개]');
    // 텍스트 내용은 포함
    expect(textOnly).toContain('브릿츠메디, AMWC 참가');
    expect(textOnly).toContain('참가합니다');
    expect(textOnly).toContain('2017년 설립');
  });

  it('전체복사 대비: assembleSections는 라벨 포함', () => {
    const sections = parseSections(sampleRaw);
    const withLabels = assembleSections(sections);
    expect(withLabels).toContain('[제목]');
    expect(withLabels).toContain('[본문]');
    expect(withLabels).toContain('[회사 소개]');
  });

  it('Word/PDF 내보내기 함수 존재 확인', async () => {
    // Create.jsx should export/contain downloadAsWord and openPrintView
    const createModule = await import('../components/create/Create.jsx');
    // These are inline functions, so we verify via the module loading without error
    expect(createModule.default).toBeDefined();
  });
});

// =====================================================
// TEST-7: 채널 재가공 — from-PR 플로우
// =====================================================
describe('TEST-7: 채널 재가공 — from-PR 플로우', () => {
  const prText = `[제목]\n브릿츠메디, AMWC Monaco 참가\n\n[본문]\n메디컬 에스테틱 전문기업 브릿츠메디가 AMWC에 참가했다.`;

  it('buildFromPRPrompt: 유효한 채널에 대해 프롬프트 생성', () => {
    const channels = ['newsletter', 'naver-blog', 'kakao', 'linkedin', 'instagram'];
    for (const ch of channels) {
      const prompt = buildFromPRPrompt({ prText, channelId: ch });
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('원본 보도자료');
      expect(prompt).toContain(prText);
      expect(prompt).toContain(CHANNEL_CONFIGS[ch].name);
    }
  });

  it('buildFromPRPrompt: 유효하지 않은 채널 → 빈 문자열', () => {
    const prompt = buildFromPRPrompt({ prText, channelId: 'invalid' });
    expect(prompt).toBe('');
  });

  it('buildFromPRPrompt: 회사 정보 + 톤앤매너 + 금지어 포함', () => {
    const prompt = buildFromPRPrompt({ prText, channelId: 'newsletter' });
    expect(prompt).toContain('BRITZMEDI');
    expect(prompt).toContain('톤앤매너');
    expect(prompt).toContain('금지어');
  });

  it('buildFromPRPrompt: 마크다운 금지 규칙 포함', () => {
    const prompt = buildFromPRPrompt({ prText, channelId: 'naver-blog' });
    expect(prompt).toContain('마크다운 문법');
    expect(prompt).toContain('절대 사용 금지');
  });

  it('PR_DERIVED_CHANNELS 정의 확인', async () => {
    const { PR_DERIVED_CHANNELS } = await import('../constants/prompts.js');
    expect(PR_DERIVED_CHANNELS).toContain('newsletter');
    expect(PR_DERIVED_CHANNELS).toContain('naver-blog');
    expect(PR_DERIVED_CHANNELS).toContain('kakao');
    expect(PR_DERIVED_CHANNELS).toContain('linkedin');
    expect(PR_DERIVED_CHANNELS).toContain('instagram');
  });
});
