import { supabase, supabaseStorage } from './supabase';

const BUCKET = 'press-release-images';

/**
 * Upload an image to Supabase Storage and save metadata to DB.
 * @param {File} file
 * @param {string|null} pressReleaseId - UUID (nullable for draft mode)
 * @param {string} caption
 * @param {number} position
 * @returns {{ url: string, record: object }}
 */
export async function uploadPressReleaseImage(file, pressReleaseId, caption = '', position = 0) {
  if (!supabase || !supabaseStorage) throw new Error('Supabase가 설정되지 않았습니다. 환경변수를 확인하세요.');
  const ext = file.name.split('.').pop();
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = pressReleaseId
    ? `${pressReleaseId}/${timestamp}_${safeName}`
    : `drafts/${timestamp}_${safeName}`;

  // Upload to storage
  const { error: uploadError } = await supabaseStorage
    .from(BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  // Get public URL
  const { data: urlData } = supabaseStorage.from(BUCKET).getPublicUrl(filePath);
  const fileUrl = urlData.publicUrl;

  // Get image dimensions
  const dims = await getImageDimensions(file);

  // Save to DB
  const record = {
    press_release_id: pressReleaseId || null,
    file_name: file.name,
    file_path: filePath,
    file_url: fileUrl,
    caption,
    position,
    width: dims.width,
    height: dims.height,
    file_size: file.size,
  };

  const { data, error: dbError } = await supabase
    .from('press_release_images')
    .insert(record)
    .select()
    .single();

  if (dbError) throw new Error(`DB 저장 실패: ${dbError.message}`);

  return { url: fileUrl, record: data };
}

/**
 * Delete an image from Storage and DB.
 * @param {string} imageId - UUID
 * @param {string} filePath - Storage path
 */
export async function deletePressReleaseImage(imageId, filePath) {
  if (!supabase || !supabaseStorage) throw new Error('Supabase가 설정되지 않았습니다.');
  // Delete from storage
  await supabaseStorage.from(BUCKET).remove([filePath]);

  // Delete from DB
  const { error } = await supabase
    .from('press_release_images')
    .delete()
    .eq('id', imageId);

  if (error) throw new Error(`삭제 실패: ${error.message}`);
}

/**
 * Get all images for a press release.
 * @param {string} pressReleaseId - UUID
 * @returns {object[]}
 */
export async function getPressReleaseImages(pressReleaseId) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');
  const { data, error } = await supabase
    .from('press_release_images')
    .select('*')
    .eq('press_release_id', pressReleaseId)
    .order('position', { ascending: true });

  if (error) throw new Error(`조회 실패: ${error.message}`);
  return data || [];
}

/** Get image dimensions from a File object */
function getImageDimensions(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
