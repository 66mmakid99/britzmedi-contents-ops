-- CTA 클릭 추적 테이블
CREATE TABLE IF NOT EXISTS cta_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- 어떤 CTA인지
  cta_type VARCHAR(20) NOT NULL CHECK (cta_type IN ('demo', 'consult')),
  -- 어느 채널에서 왔는지
  channel VARCHAR(50) NOT NULL,
  -- 어떤 캠페인(콘텐츠)인지
  campaign VARCHAR(200),
  -- 어떤 보도자료에서 파생됐는지
  press_release_id UUID REFERENCES press_releases(id) ON DELETE SET NULL,
  -- 클릭 메타
  referrer TEXT,
  user_agent TEXT,
  -- 시간
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_cta_clicks_type ON cta_clicks(cta_type);
CREATE INDEX idx_cta_clicks_channel ON cta_clicks(channel);
CREATE INDEX idx_cta_clicks_campaign ON cta_clicks(campaign);
CREATE INDEX idx_cta_clicks_date ON cta_clicks(clicked_at);

-- RLS
ALTER TABLE cta_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for cta_clicks" ON cta_clicks FOR ALL USING (true) WITH CHECK (true);
