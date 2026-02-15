-- ============================================================
-- BRITZMEDI Content Ops — Supabase Schema
-- ============================================================
-- Supabase SQL Editor에서 이 파일 전체를 복사하여 실행하세요.
-- 순서대로 실행해야 합니다 (FK 참조 때문에).
-- ============================================================

-- 0. UUID 확장 활성화
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. pipeline_items — 콘텐츠 파이프라인 (칸반 보드)
-- ============================================================
create table pipeline_items (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  track         text not null check (track in ('A', 'B')),
  pillar        text,                        -- A1, A2, B1, B2, ...
  status        text not null default '아이디어'
                check (status in ('아이디어','초안작성','검토편집','발행준비','발행완료')),
  channels      jsonb not null default '{}'::jsonb,
                -- { "blog": true, "linkedin": false, "newsletter": true, ... }
  publish_date  date,
  author        text default '',
  notes         text default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 인덱스
create index idx_pipeline_status on pipeline_items (status);
create index idx_pipeline_track on pipeline_items (track);
create index idx_pipeline_publish_date on pipeline_items (publish_date);

-- ============================================================
-- 2. press_releases — 보도자료 (콘텐츠 팩토리 v2)
-- ============================================================
create table press_releases (
  id                uuid primary key default uuid_generate_v4(),
  pipeline_item_id  uuid references pipeline_items(id) on delete set null,

  -- 입력 단계
  category          text not null default 'general'
                    check (category in (
                      'exhibition',      -- 전시회·학회 참가
                      'partnership',     -- 파트너십·계약 체결
                      'product_launch',  -- 신제품·신기술 출시
                      'certification',   -- 인증·임상 성과
                      'award',           -- 수상·선정
                      'general'          -- 기타
                    )),
  timing            text not null default 'post'
                    check (timing in ('pre', 'post')),
                    -- pre = 사전 배포(예고형), post = 사후 배포(리뷰형)
  raw_input         text,                -- STEP 0: 사용자 자유 텍스트 입력

  -- 파싱 & 확인 단계
  parsed_fields     jsonb,               -- STEP 1: AI 파싱 결과
  confirmed_facts   jsonb,               -- STEP 2: 사용자 확인 완료된 팩트

  -- 생성 결과
  title             text,
  subtitle          text,
  body              text,
  quote             text,                -- 선택된 대표 인용문
  company_intro     text,                -- 보일러플레이트
  photo_guide       jsonb default '[]'::jsonb,   -- ["사진1 설명", "사진2 설명"]
  attach_guide      jsonb default '[]'::jsonb,   -- ["첨부1 설명", "첨부2 설명"]
  tags              text,                -- 쉼표 구분 태그 문자열

  -- 검수 결과
  review_result     jsonb,               -- STEP 4: AI 검수 JSON 결과
  -- { summary: { critical, warning, passed, factRatio }, issues: [...] }

  status            text not null default 'draft'
                    check (status in ('draft','reviewed','published')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_pr_pipeline on press_releases (pipeline_item_id);
create index idx_pr_category on press_releases (category);
create index idx_pr_status on press_releases (status);

-- ============================================================
-- 3. channel_contents — 채널별 콘텐츠
-- ============================================================
create table channel_contents (
  id                uuid primary key default uuid_generate_v4(),
  pipeline_item_id  uuid references pipeline_items(id) on delete set null,
  press_release_id  uuid references press_releases(id) on delete set null,
                    -- 보도자료에서 재가공한 경우 원본 참조

  channel           text not null
                    check (channel in (
                      'newsletter',   -- 이메일 뉴스레터
                      'naver',        -- 네이버 블로그
                      'kakao',        -- 카카오톡
                      'linkedin',     -- LinkedIn
                      'instagram',    -- Instagram
                      'blog'          -- 블로그 (Track A)
                    )),

  -- 콘텐츠
  title             text,
  content           text,                -- 생성된 전체 콘텐츠
  metadata          jsonb default '{}'::jsonb,
                    -- 채널별 추가 데이터 (태그, 해시태그, CTA 등)

  -- 검수
  review_result     jsonb,

  status            text not null default 'draft'
                    check (status in ('draft','reviewed','published')),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_cc_pipeline on channel_contents (pipeline_item_id);
create index idx_cc_press_release on channel_contents (press_release_id);
create index idx_cc_channel on channel_contents (channel);

-- ============================================================
-- 4. knowledge_base — 지식 베이스 (회사 정보, 프리셋 등)
-- ============================================================
create table knowledge_base (
  id          uuid primary key default uuid_generate_v4(),
  key         text unique not null,          -- 조회용 고유 키
  category    text not null
              check (category in (
                'company',        -- 회사 정보
                'product',        -- 제품 정보
                'contact',        -- 연락처
                'boilerplate',    -- 보일러플레이트
                'survey',         -- 설문 데이터
                'prompt',         -- AI 프롬프트 템플릿
                'guideline'       -- 가이드라인 (톤앤매너, 의료법 등)
              )),
  title       text not null,
  content     text not null,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_kb_category on knowledge_base (category);
create index idx_kb_key on knowledge_base (key);

-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pipeline_items_updated
  before update on pipeline_items
  for each row execute function update_updated_at();

create trigger trg_press_releases_updated
  before update on press_releases
  for each row execute function update_updated_at();

create trigger trg_channel_contents_updated
  before update on channel_contents
  for each row execute function update_updated_at();

create trigger trg_knowledge_base_updated
  before update on knowledge_base
  for each row execute function update_updated_at();

-- ============================================================
-- 6. Row Level Security (RLS)
-- ============================================================
-- 내부 팀 전용 도구이므로 anon key로 전체 접근 허용
-- 필요 시 auth.uid() 기반 정책으로 교체 가능

alter table pipeline_items enable row level security;
alter table press_releases enable row level security;
alter table channel_contents enable row level security;
alter table knowledge_base enable row level security;

-- anon/authenticated 모두 전체 CRUD 허용
create policy "Allow all for pipeline_items"
  on pipeline_items for all
  using (true) with check (true);

create policy "Allow all for press_releases"
  on press_releases for all
  using (true) with check (true);

create policy "Allow all for channel_contents"
  on channel_contents for all
  using (true) with check (true);

create policy "Allow all for knowledge_base"
  on knowledge_base for all
  using (true) with check (true);

-- ============================================================
-- 7. 초기 데이터: knowledge_base
-- ============================================================
insert into knowledge_base (key, category, title, content) values
(
  'company_info',
  'company',
  'BRITZMEDI 회사 정보',
  'BRITZMEDI Co., Ltd. (브릿츠메디) — 2017년 설립, 메디컬 에스테틱 디바이스 전문기업. 대표이사: 이신재. 본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호.'
),
(
  'boilerplate_kr',
  'boilerplate',
  '보도자료 보일러플레이트 (국문)',
  'BRITZMEDI Co., Ltd. (브릿츠메디)는 2017년 설립된 메디컬 에스테틱 디바이스 전문기업으로, FDA 승인을 받은 토로이달(TOROIDAL) 고주파 기술과 에너지 기반 디바이스(EBD) 분야의 독자적 융합 기술을 기반으로 글로벌 메디컬 에스테틱 디바이스 시장에 혁신적인 솔루션을 제공하고 있다.'
),
(
  'contact_media',
  'contact',
  '미디어 연락처',
  '회사명: BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)\n대표이사: 이신재\n본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호\n홈페이지: www.britzmedi.co.kr / www.britzmedi.com\n미디어 문의: 010-6525-9442'
),
(
  'product_torr_rf',
  'product',
  'TORR RF 제품 정보',
  'TORR RF — FDA 승인 TOROIDAL 고주파 기반 메디컬 에스테틱 디바이스. 핵심 기술: TOROIDAL 고주파 (BRITZMEDI 독자 기술). 분류: EBD (Energy Based Device). 기대 효과: 콜라겐 리모델링 촉진, 시술 후 다운타임 감소.'
),
(
  'survey_113',
  'survey',
  '113명 소비자 설문조사 핵심 데이터',
  '이탈 1위: "효과없음" 27.4% ↔ 재방문 1위: "효과확실" 38.1%\n브랜드 영향: 58.4%, 장비 선택 기준: 4.4%\n피부과 선택 3강: 가성비 24.8% / 전문성 23.9% / 후기 20.4%\n부작용 불안: 37.2%\n추천 경험: 70.8%\n정보채널 1위: 지인추천 48.7% / 온라인후기 33.6%\n시술 빈도: 월 1회 이상 41.6%'
),
(
  'guideline_medical_law',
  'guideline',
  '의료법 준수 가이드라인',
  '금지어: 극대화, 최소화, 최고, 최초(무근거), 완벽한, 획기적인, 혁명적인, 완치, 100%, 확실한 효과, 부작용 없음, 안전 보장, 비교 광고, 효능 단정.\n허용 대체: 극대화→개선/촉진/향상, 최소화→감소, 완벽한→우수한/높은 수준의, 효과 확실→효과가 기대되는.'
),
(
  'guideline_tone',
  'guideline',
  '톤앤매너 가이드',
  '대상: 국내 피부과 원장님, 디스트리뷰터, 의료기기 관계자. 톤: 전문적이되 친근한, 데이터 기반, "동료 전문가가 인사이트를 공유하는" 느낌. 반드시: 출처/데이터 명시, 액셔너블한 인사이트.'
);

-- ============================================================
-- 완료!
-- ============================================================
-- 이 스크립트 실행 후 확인 쿼리:
--   select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- 결과: channel_contents, knowledge_base, pipeline_items, press_releases
-- ============================================================
