-- =====================================================
-- Press Release Images table
-- Run this in Supabase SQL Editor after creating
-- the "press-release-images" storage bucket
-- =====================================================

CREATE TABLE press_release_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  press_release_id UUID REFERENCES press_releases(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pri_press_release ON press_release_images(press_release_id);

ALTER TABLE press_release_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for press_release_images"
  ON press_release_images FOR ALL
  USING (true) WITH CHECK (true);

-- =====================================================
-- Storage Policies for "press-release-images" bucket
-- PUBLIC bucket = public READ only.
-- Upload/Delete require explicit policies below.
-- =====================================================

CREATE POLICY "Allow public uploads to press-release-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'press-release-images');

CREATE POLICY "Allow public reads from press-release-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'press-release-images');

CREATE POLICY "Allow public updates to press-release-images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'press-release-images');

CREATE POLICY "Allow public deletes from press-release-images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'press-release-images');
