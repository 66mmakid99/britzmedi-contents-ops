// =====================================================
// Raw Text Storage — separated from main KB data
// Stores extracted raw text in localStorage under a separate key
// =====================================================

const STORAGE_KEY = 'bm-kb-raw-texts';
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data) {
  const json = JSON.stringify(data);
  if (json.length > MAX_TOTAL_SIZE) {
    throw new Error(`rawText 총 용량이 10MB를 초과합니다. 일부 항목을 삭제해 주세요.`);
  }
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    throw new Error(`localStorage 저장 실패: ${e.message}`);
  }
}

/**
 * Save raw text for a KB entry.
 */
export function saveRawText(entryId, rawText) {
  const data = loadAll();
  data[entryId] = rawText;
  saveAll(data);
}

/**
 * Get raw text for a KB entry. Returns null if not found.
 */
export function getRawText(entryId) {
  const data = loadAll();
  return data[entryId] || null;
}

/**
 * Delete raw text for a KB entry.
 */
export function deleteRawText(entryId) {
  const data = loadAll();
  delete data[entryId];
  saveAll(data);
}
