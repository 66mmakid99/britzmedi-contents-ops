import { describe, it, expect } from 'vitest';
import { getRepurposePrompt } from '../constants/prompts';

const MOCK_PRESS_RELEASE = {
  title: '브릿츠메디, 태국 더마 솔루션스와 토르RF 독점유통 계약 체결',
  body: '브릿츠메디가 태국 방콕 소재 더마 솔루션스와 3년간 연 300대 규모의 토르RF 독점유통 계약을 체결했다. 4월 15일 방콕 본사에서 계약식이 진행되었으며, 올해 하반기부터 납품을 시작할 예정이다.',
  source: '태국 방콕 Derma Solutions사와 토르RF 독점유통 계약 체결.',
  category: '파트너십',
};

describe('STEP 4: 채널 재가공 프롬프트', () => {

  it('네이버 블로그 프롬프트가 SEO, 소제목, 이미지위치를 포함해야 한다', () => {
    const prompt = getRepurposePrompt('naver-blog', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('SEO');
    expect(prompt).toContain('소제목');
    expect(prompt).toContain('IMAGE');
    expect(prompt).toContain('2,200자');
  });

  it('카카오톡 프롬프트가 250자 이내, 이모지, 헤드라인을 포함해야 한다', () => {
    const prompt = getRepurposePrompt('kakao', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('250자');
    expect(prompt).toContain('이모지');
    expect(prompt).toContain('헤드라인');
  });

  it('인스타그램 프롬프트가 캡션, 해시태그, 이미지 가이드를 포함해야 한다', () => {
    const prompt = getRepurposePrompt('instagram', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('캡션');
    expect(prompt).toContain('해시태그');
    expect(prompt).toContain('이미지 가이드');
    expect(prompt).toContain('50~150자');
  });

  it('링크드인 프롬프트가 전문가 톤, 인사이트를 포함해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE);
    expect(prompt).toContain('전문가');
    expect(prompt).toContain('인사이트');
    expect(prompt).toContain('800~1,200자');
  });

  it('링크드인 영문 옵션이 동작해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE, { language: 'en' });
    expect(prompt).toContain('영문');
  });

  it('링크드인 이중언어 옵션이 동작해야 한다', () => {
    const prompt = getRepurposePrompt('linkedin', MOCK_PRESS_RELEASE, { language: 'ko+en' });
    expect(prompt).toContain('한국어');
    expect(prompt).toContain('영문');
  });

  it('모든 채널 프롬프트에 공통 규칙(팩트, 날조금지, 수치계산금지)이 있어야 한다', () => {
    const channels = ['naver-blog', 'kakao', 'instagram', 'linkedin'];
    channels.forEach(ch => {
      const prompt = getRepurposePrompt(ch, MOCK_PRESS_RELEASE);
      expect(prompt).toContain('팩트 완전성');
      expect(prompt).toContain('날조 금지');
      expect(prompt).toContain('수치 자의 계산 금지');
    });
  });

  it('존재하지 않는 채널 ID는 빈 문자열을 반환해야 한다', () => {
    const prompt = getRepurposePrompt('twitter', MOCK_PRESS_RELEASE);
    expect(prompt).toBe('');
  });
});
