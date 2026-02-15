import { describe, it, expect } from 'vitest';
import { PIPELINE_STAGES, PRIORITY_LEVELS } from '../constants/pipeline';

describe('STEP 6: 파이프라인 상수', () => {

  it('파이프라인 4단계가 올바른 순서로 정의되어야 한다', () => {
    expect(PIPELINE_STAGES).toHaveLength(4);
    expect(PIPELINE_STAGES[0].id).toBe('draft');
    expect(PIPELINE_STAGES[1].id).toBe('review');
    expect(PIPELINE_STAGES[2].id).toBe('approved');
    expect(PIPELINE_STAGES[3].id).toBe('published');
  });

  it('각 단계에 name, icon, color가 있어야 한다', () => {
    PIPELINE_STAGES.forEach(stage => {
      expect(stage.name).toBeTruthy();
      expect(stage.icon).toBeTruthy();
      expect(stage.color).toBeTruthy();
    });
  });

  it('우선순위 레벨이 4개 정의되어야 한다', () => {
    expect(PRIORITY_LEVELS).toHaveLength(4);
    const ids = PRIORITY_LEVELS.map(p => p.id);
    expect(ids).toContain('low');
    expect(ids).toContain('normal');
    expect(ids).toContain('high');
    expect(ids).toContain('urgent');
  });
});
