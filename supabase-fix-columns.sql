-- =====================================================
-- press_releases: 코드가 사용하는데 테이블에 없는 컬럼 추가
-- =====================================================

-- title: 보도자료 제목
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS title text;

-- press_release: 생성된 보도자료 본문
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS press_release text;

-- status: draft/review/approved/published
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';

-- channels: 5개 채널 재가공 결과 (jsonb) — 이미 있으면 스킵
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '{}'::jsonb;

-- image_url: 이미 있으면 스킵
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS image_url text;

-- source: 이미 있으면 스킵
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS source text;

-- =====================================================
-- pipeline_items: 코드가 사용하는데 테이블에 없을 수 있는 컬럼 추가
-- =====================================================

-- press_release_id: FK to press_releases
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS press_release_id uuid REFERENCES press_releases(id) ON DELETE CASCADE;

-- stage: draft/review/approved/published
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS stage text DEFAULT 'draft';

-- position: 같은 stage 내 순서
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS position integer DEFAULT 0;

-- notes: 메모
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS notes text;

-- updated_at: 자동 갱신
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =====================================================
-- updated_at 트리거 (이미 있으면 재생성)
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_press_releases_updated ON press_releases;
CREATE TRIGGER trg_press_releases_updated
  BEFORE UPDATE ON press_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_pipeline_items_updated ON pipeline_items;
CREATE TRIGGER trg_pipeline_items_updated
  BEFORE UPDATE ON pipeline_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
