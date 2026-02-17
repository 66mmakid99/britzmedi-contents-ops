-- =====================================================
-- BRITZMEDI Content Factory — Supabase Migration V2
-- 보도자료 + 채널 결과 + 파이프라인 통합
-- =====================================================

-- 1. press_releases 테이블
CREATE TABLE IF NOT EXISTS press_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source text,
  press_release text,
  category text,
  channels jsonb DEFAULT '{}'::jsonb,
  image_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. pipeline_items 테이블
CREATE TABLE IF NOT EXISTS pipeline_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id uuid NOT NULL REFERENCES press_releases(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'draft'
    CHECK (stage IN ('draft', 'review', 'approved', 'published')),
  position integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. channel_publish_log 테이블 (향후 사용)
CREATE TABLE IF NOT EXISTS channel_publish_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id uuid REFERENCES press_releases(id) ON DELETE SET NULL,
  channel text NOT NULL,
  published_at timestamptz,
  published_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 인덱스
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_press_releases_status ON press_releases(status);
CREATE INDEX IF NOT EXISTS idx_press_releases_created ON press_releases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_pr ON pipeline_items(press_release_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_stage ON pipeline_items(stage);
CREATE INDEX IF NOT EXISTS idx_channel_publish_log_pr ON channel_publish_log(press_release_id);

-- =====================================================
-- updated_at 자동 갱신 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_press_releases_updated
  BEFORE UPDATE ON press_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pipeline_items_updated
  BEFORE UPDATE ON pipeline_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS 정책 (인증 없이 anon 전체 허용)
-- =====================================================

ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_publish_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_press_releases" ON press_releases
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_pipeline_items" ON pipeline_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_channel_publish_log" ON channel_publish_log
  FOR ALL TO anon USING (true) WITH CHECK (true);
