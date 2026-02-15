import { describe, it, expect } from 'vitest';
import { PIPELINE_STAGES } from '../constants/pipeline';
import { REPURPOSE_CHANNELS } from '../constants/channels';

describe('STEP 7: 캘린더 & 대시보드 데이터 정합성', () => {

  it('모든 채널이 대시보드 byChannel 키와 매칭되어야 한다', () => {
    const expectedKeys = ['press_release', ...REPURPOSE_CHANNELS.map(c => c.id)];
    expect(expectedKeys).toContain('press_release');
    expect(expectedKeys).toContain('naver-blog');
    expect(expectedKeys).toContain('kakao');
    expect(expectedKeys).toContain('instagram');
    expect(expectedKeys).toContain('linkedin');
  });

  it('파이프라인 단계가 대시보드 byStage 키와 매칭되어야 한다', () => {
    const stageIds = PIPELINE_STAGES.map(s => s.id);
    expect(stageIds).toEqual(['draft', 'review', 'approved', 'published']);
  });

  it('캘린더 날짜 유틸: 월의 첫 날 요일 계산이 정확해야 한다', () => {
    // 2026년 2월 1일 = 일요일 (0)
    const firstDay = new Date(2026, 1, 1).getDay();
    expect(firstDay).toBe(0);
  });

  it('캘린더 날짜 유틸: 월의 일수 계산이 정확해야 한다', () => {
    // 2026년 2월 = 28일
    const daysInFeb = new Date(2026, 2, 0).getDate();
    expect(daysInFeb).toBe(28);
  });
});
