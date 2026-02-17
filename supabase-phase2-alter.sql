-- Phase 2: 수정 이력 자동 추적 시스템 — DB 변경
-- edit_type check constraint 확장 (auto_review, auto_channel_review, manual_regenerate 추가)

ALTER TABLE edit_history DROP CONSTRAINT IF EXISTS edit_history_edit_type_check;
ALTER TABLE edit_history ADD CONSTRAINT edit_history_edit_type_check
  CHECK (edit_type IN (
    'tone_change', 'fact_correction', 'term_replacement', 'structure_change',
    'addition', 'deletion', 'style_polish', 'other',
    'auto_review',            -- Phase 2-A: 보도자료 자동 검수 보정
    'auto_channel_review',    -- Phase 2-B: 채널 콘텐츠 자동 검수 보정
    'manual_regenerate'       -- Phase 2-C: 수정 포인트 재생성
  ));
