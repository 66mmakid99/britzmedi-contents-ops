/**
 * STEP 2 검증: 보일러플레이트 중복 제거 + 태그 삭제
 */

import { describe, it, expect } from 'vitest';
import { buildFactBasedPrompt } from '../constants/prompts';

describe('STEP 2: 보일러플레이트 & 태그', () => {

  it('생성 프롬프트에 태그 금지 규칙이 포함되어야 한다', () => {
    const prompt = buildFactBasedPrompt({
      category: 'partnership',
      confirmedFields: { partnerName: 'Test' },
      timing: 'pre',
      channelId: 'pressrelease',
      kbText: '',
    });
    expect(prompt).toContain('태그');
    expect(prompt).toMatch(/태그.*금지|태그.*생성하지/);
  });

  it('태그 필터링이 [태그: ...] 패턴을 제거해야 한다', () => {
    const testBody = `
브릿츠메디가 태국 시장에 진출한다.
본문 내용이 여기에 있다.

[태그: #브릿츠메디 #토르RF #태국 #피부과]
    `.trim();

    const cleaned = testBody
      .replace(/\[태그[:\s].*?\]/g, '')
      .replace(/\n태그[:\s].*$/gm, '')
      .replace(/\n#\S+(\s+#\S+)*/g, '')
      .trim();

    expect(cleaned).not.toContain('[태그');
    expect(cleaned).not.toContain('#브릿츠메디');
    expect(cleaned).toContain('브릿츠메디가 태국 시장에 진출한다');
  });
});
