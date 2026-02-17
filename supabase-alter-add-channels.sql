-- press_releases 테이블에 channels 컬럼 추가 (기존 테이블이 이미 있을 경우)
ALTER TABLE press_releases ADD COLUMN IF NOT EXISTS channels jsonb DEFAULT '{}'::jsonb;
