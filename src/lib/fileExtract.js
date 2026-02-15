// =====================================================
// File Text Extraction — PDF / Word / Excel
// All libraries use dynamic import to avoid initial bundle impact
// =====================================================

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'xls'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validate file extension and size.
 * Returns { valid, error? }
 */
export function validateFile(file) {
  if (!file) return { valid: false, error: '파일이 선택되지 않았습니다.' };

  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `지원하지 않는 형식입니다. (지원: ${ALLOWED_EXTENSIONS.join(', ')})` };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `파일 크기가 너무 큽니다. (최대 ${formatFileSize(MAX_FILE_SIZE)})` };
  }

  return { valid: true };
}

/**
 * Format bytes into human-readable string.
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Main entry: extract text from file based on extension.
 * Returns { text: string, fileType: string }
 */
export async function extractTextFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':
      return { text: await extractPDF(file), fileType: 'pdf' };
    case 'docx':
      return { text: await extractWord(file), fileType: 'docx' };
    case 'xlsx':
    case 'xls':
      return { text: await extractExcel(file), fileType: ext };
    default:
      throw new Error(`지원하지 않는 파일 형식: ${ext}`);
  }
}

/**
 * Extract text from PDF using pdfjs-dist (dynamic import + CDN worker).
 */
async function extractPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');

  // Use CDN worker to avoid bundling issues
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    if (text.trim()) pages.push(text.trim());
  }

  if (pages.length === 0) {
    throw new Error('텍스트를 추출할 수 없습니다. (이미지 PDF일 수 있습니다)');
  }

  return pages.join('\n\n');
}

/**
 * Extract text from Word (.docx) using mammoth.
 */
async function extractWord(file) {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  if (!result.value || !result.value.trim()) {
    throw new Error('Word 파일에서 텍스트를 추출할 수 없습니다.');
  }

  return result.value.trim();
}

/**
 * Extract text from Excel (.xlsx/.xls) using xlsx.
 */
async function extractExcel(file) {
  const XLSX = await import('xlsx');
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const sheets = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    if (csv.trim()) {
      sheets.push(`[시트: ${sheetName}]\n${csv.trim()}`);
    }
  }

  if (sheets.length === 0) {
    throw new Error('Excel 파일에서 데이터를 추출할 수 없습니다.');
  }

  return sheets.join('\n\n');
}
