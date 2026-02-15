/**
 * STEP 1 검증: 숫자 팩트 누락 방지
 *
 * 테스트 소스 2번(파트너십·계약)을 사용:
 * "태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결.
 *  3년 계약, 연 300대 규모. 태국 피부과 시장 진출 본격화.
 *  4월 15일 방콕 본사에서 계약식 진행. 올해 하반기부터 납품 시작 예정."
 */

import { describe, it, expect } from 'vitest';
import { buildFactBasedPrompt, buildV2ReviewPrompt, buildAutoFixPrompt } from '../constants/prompts';

const TEST_SOURCE_2 = `태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결. 3년 계약, 연 300대 규모. 태국 피부과 시장 진출 본격화. 4월 15일 방콕 본사에서 계약식 진행. 올해 하반기부터 납품 시작 예정.`;

const TEST_CONFIRMED_FIELDS = {
  partnerName: 'Derma Solutions',
  dealType: '독점유통 계약',
  dealScope: '태국',
  dealValue: '3년 계약, 연 300대 규모',
  dealDate: '4월 15일',
  dealLocation: '방콕 본사',
  futurePlan: '올해 하반기부터 납품 시작 예정',
};

describe('STEP 1: 숫자 팩트 누락 방지', () => {

  it('생성 프롬프트에 숫자 팩트 완전성 규칙이 포함되어야 한다', () => {
    const prompt = buildFactBasedPrompt({
      category: 'partnership',
      confirmedFields: TEST_CONFIRMED_FIELDS,
      timing: 'pre',
      channelId: 'pressrelease',
      kbText: '',
    });
    expect(prompt).toContain('숫자 팩트 완전성');
    expect(prompt).toContain('1:1 대조');
    expect(prompt).toContain('기간+수량 조합');
  });

  it('검수 프롬프트에 숫자 팩트 검증 규칙이 포함되어야 한다', () => {
    const prompt = buildV2ReviewPrompt({
      content: '더미 본문',
      confirmedFields: TEST_CONFIRMED_FIELDS,
      channelId: 'pressrelease',
    });
    expect(prompt).toContain('숫자 팩트 검증');
    expect(prompt).toContain('fact_omission');
    expect(prompt).toContain('severity');
    expect(prompt).toContain('critical');
  });

  it('자동수정 프롬프트에 숫자 팩트 자동 삽입 규칙이 포함되어야 한다', () => {
    const prompt = buildAutoFixPrompt({
      content: '더미 본문',
      issues: [],
      confirmedFields: TEST_CONFIRMED_FIELDS,
      channelId: 'pressrelease',
      kbText: '',
    });
    expect(prompt).toContain('숫자 팩트 자동 삽입');
    expect(prompt).toContain('fact_omission');
  });

  it('소스 2에서 추출해야 할 핵심 숫자 목록 확인', () => {
    const expectedNumbers = ['3년', '300대', '4월 15일', '하반기'];
    expectedNumbers.forEach(num => {
      expect(TEST_SOURCE_2).toContain(num);
    });
  });
});
