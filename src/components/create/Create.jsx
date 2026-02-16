import { useState, useEffect } from 'react';
import { CHANNEL_CONFIGS, PR_CATEGORIES } from '../../constants/prompts';
import { SPOKESPERSONS, getRecommendedSpokesperson } from '../../constants/index';
import { uploadPressReleaseImage, deletePressReleaseImage } from '../../lib/imageUpload';
import { parseContent, generateFromFacts, reviewV2, autoFixContent, generateQuoteSuggestions } from '../../lib/claude';
import { parseSections, assembleSections, assembleTextOnly } from '../../lib/sectionUtils';
import { generatePressReleaseDocx } from '../../lib/generatePressReleaseDocx';
import { saveAs } from 'file-saver';

// v2 step labels for the stepper
const V2_STEP_LABELS = ['입력', '파싱', '팩트 확인', '생성', '검수/수정', '결과'];
const V2_STEP_INDEX = { input: 0, parsing: 1, confirm: 2, generating: 3, reviewing: 4, fixing: 4, results: 5 };

// =====================================================
// Press Release fixed fields (NewsWire form defaults)
// =====================================================
const PR_FIXED_DEFAULTS = {
  출처: '브릿츠메디',
  날짜: '',
  웹사이트: 'www.britzmedi.co.kr / www.britzmedi.com',
  소셜링크: 'Instagram: https://www.instagram.com/britzmedi_official\nLinkedIn: https://www.linkedin.com/company/britzmedi\nYouTube: https://www.youtube.com/@britzmedi',
  담당자명: '이성호',
  직책: 'CMO',
  이메일: 'sh.lee@britzmedi.co.kr',
  전화번호: '010-6525-9442',
};

function assemblePR(sections, fixed) {
  const parts = sections.map((s) => `[${s.label}]\n${s.text}`);
  parts.push(`[출처]\n${fixed.출처}`);
  parts.push(`[날짜]\n${fixed.날짜}`);
  parts.push(`[웹사이트]\n${fixed.웹사이트}`);
  parts.push(`[소셜 링크]\n${fixed.소셜링크}`);
  parts.push(`[연락처]\n담당자명: ${fixed.담당자명}\n직책: ${fixed.직책}\n이메일: ${fixed.이메일}\n전화번호: ${fixed.전화번호}`);
  return parts.join('\n\n');
}

// =====================================================
// Word/PDF export helpers
// =====================================================

/** Filter out placeholder blocks and photo/attachment guide from export text */
function filterPlaceholders(text) {
  // First remove photo guide and attachment guide sections entirely
  const cleaned = text
    .replace(/\[사진\s*가이드\][\s\S]*?(?=\[회사\s*소개\]|\[첨부|\n\n\n|$)/gi, '')
    .replace(/\[첨부파일?\s*가이드\][\s\S]*?(?=\[회사\s*소개\]|뉴스와이어|\n\n\n|$)/gi, '')
    .replace(/사진 가이드[\s\S]*?(?=회사 소개|첨부파일|뉴스와이어|\n\n\n|$)/gi, '')
    .replace(/첨부파일 가이드[\s\S]*?(?=회사 소개|뉴스와이어|\n\n\n|$)/gi, '');
  return cleaned.split('\n\n')
    .filter((block) => !block.includes('[대표 인용문 - 직접 작성 또는 확인 필요]'))
    .map((block) => block
      .replace(/\[입력 필요:[^\]]*\]/g, '')
      .replace(/\[QUOTE_PLACEHOLDER\]/g, '')
      .replace(/\[인용문\]/g, '')
      .replace(/\[대표 인용문[^\]]*\]/g, '')
      .trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Build data object from PR sections and generate .docx download */
async function handleWordDownload(sections, prFixed, selectedQuote, images = []) {
  const getSection = (label) => sections.find((s) => s.label === label)?.text?.trim() || '';
  const getBodySections = () => {
    return sections
      .filter((s) => s.label === '본문' || s.label.startsWith('본문'))
      .map((s) => s.text?.trim())
      .filter(Boolean)
      .join('\n\n');
  };
  const getListSection = (label) => {
    const text = getSection(label);
    if (!text) return [];
    return text.split('\n').map((l) => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  };

  const data = {
    title: getSection('제목'),
    subtitle: getSection('부제목'),
    body: getBodySections() || getSection('전체'),
    quote: null, // quotes are now integrated into body paragraph 4
    companyIntro: getSection('회사 소개') || getSection('회사 개요'),
    images: images.map((img) => ({ url: img.file_url, caption: img.caption, width: img.width, height: img.height })),
    date: prFixed.날짜 || new Date().toISOString().split('T')[0],
    website: prFixed.웹사이트 || 'www.britzmedi.co.kr / www.britzmedi.com',
  };

  const blob = await generatePressReleaseDocx(data);
  saveAs(blob, `${data.title || '보도자료'}.docx`);
}

/** 소스에 있는 기간+수량 쌍이 생성 결과에도 있는지 확인, 없으면 삽입 */
function enforceFactPairs(content, source) {
  if (!source || !content) return content;
  let result = content;

  // "N년" 패턴 (3년 계약, 3년간, 3년 동안 등)
  const periodMatch = source.match(/(\d+)년\s*(계약|간|동안)/);
  const volumeMatch = source.match(/연\s*(\d+)대/);

  if (periodMatch && volumeMatch) {
    const num = periodMatch[1]; // "3"
    // 본문에 "N년"이 없으면 "연 XXX대" 앞에 삽입
    if (!result.includes(num + '년')) {
      result = result.replace(/연\s*(\d+)대/, num + '년간 연 $1대');
    }
  }

  return result;
}

function openPrintView(text, title) {
  const clean = filterPlaceholders(text);
  const w = window.open('', '_blank');
  if (!w) return;

  // 섹션 파싱 (라벨 제거, 내용만 추출)
  const sections = {};
  let currentLabel = null;
  clean.split('\n\n').forEach((block) => {
    const m = block.match(/^\[([^\]]+)\]\n?([\s\S]*)$/);
    if (m) {
      currentLabel = m[1];
      sections[currentLabel] = (sections[currentLabel] || '') + m[2].trim();
    } else if (currentLabel) {
      sections[currentLabel] = (sections[currentLabel] || '') + '\n\n' + block.trim();
    } else {
      sections['_body'] = (sections['_body'] || '') + '\n\n' + block.trim();
    }
  });

  const titleText = sections['제목'] || title;
  const subtitle = sections['부제목'] || '';
  const bodyParts = Object.entries(sections)
    .filter(([k]) => !['제목', '부제목', '회사 소개', '회사 개요', '출처', '날짜', '웹사이트', '소셜 링크', '연락처'].includes(k))
    .map(([, v]) => v.trim())
    .filter(Boolean);
  const companyIntro = sections['회사 소개'] || sections['회사 개요'] || '';
  const contact = sections['연락처'] || '';

  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleText}</title>
<style>
  body{font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:11pt;line-height:1.8;max-width:700px;margin:40px auto;padding:0 20px;color:#222;}
  .header{text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:30px;}
  .header h1{font-size:14pt;letter-spacing:8px;margin:0 0 4px 0;color:#333;}
  .header p{font-size:10pt;color:#666;margin:0;}
  .title{text-align:center;font-size:16pt;font-weight:bold;margin:30px 0 8px 0;}
  .subtitle{text-align:center;font-size:12pt;color:#666;margin:0 0 30px 0;}
  .body p{margin:8px 0;text-align:justify;}
  .divider{border:none;border-top:1px solid #ccc;margin:30px 0 15px 0;}
  .company{color:#666;font-size:10pt;line-height:1.6;}
  .company-title{font-weight:bold;font-size:10pt;color:#666;margin-bottom:4px;}
  .contact-table{width:100%;border-collapse:collapse;font-size:10pt;margin-top:15px;}
  .contact-table td{padding:6px 10px;border:1px solid #ccc;}
  .contact-table .label{background:#f2f2f2;font-weight:bold;width:100px;}
  @media print{body{margin:0;max-width:100%;}}
</style></head>
<body>
  <div class="header">
    <h1>보 도 자 료</h1>
    <p>PRESS RELEASE</p>
  </div>
  <div class="title">${titleText}</div>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <div class="body">${bodyParts.map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</div>
  ${companyIntro ? `<hr class="divider"><div class="company-title">회사 소개</div><div class="company">${companyIntro.replace(/\n/g, '<br>')}</div>` : ''}
  <table class="contact-table">
    <tr><td class="label">회사명</td><td>BRITZMEDI Co., Ltd. (브릿츠메디 주식회사)</td></tr>
    <tr><td class="label">대표이사</td><td>이신재</td></tr>
    <tr><td class="label">본사</td><td>경기도 성남시 둔촌대로 388 크란츠테크노 1211호</td></tr>
    <tr><td class="label">홈페이지</td><td>www.britzmedi.co.kr / www.britzmedi.com</td></tr>
    <tr><td class="label">미디어 문의</td><td>이성호 CMO<br>sh.lee@britzmedi.co.kr<br>010-6525-9442</td></tr>
  </table>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// =====================================================
// Main Component
// =====================================================
export default function Create({ onAdd, apiKey, setApiKey, prSourceData, onClearPRSource, knowledgeBase, onGoToRepurpose }) {
  // --- Shared state ---
  const [selectedChannels, setSelectedChannels] = useState(['pressrelease']);
  const [showKey, setShowKey] = useState(false);
  const [editedSections, setEditedSections] = useState({});
  const [prFixed, setPrFixed] = useState({ ...PR_FIXED_DEFAULTS });
  const [copyStatus, setCopyStatus] = useState('');
  const [registered, setRegistered] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState('');

  // --- From-PR mode state ---
  const [loading, setLoading] = useState(false);
  const [genResults, setGenResults] = useState(null);
  const [reviewResults, setReviewResults] = useState({});
  const [reviewing, setReviewing] = useState(false);

  // --- v2 factory state ---
  const [v2Step, setV2Step] = useState('input');
  const [sourceText, setSourceText] = useState('');
  const [timing, setTiming] = useState('pre');
  const [parsedResult, setParsedResult] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [confirmedFields, setConfirmedFields] = useState({});
  const [v2Content, setV2Content] = useState({});
  const [v2Review, setV2Review] = useState({});
  const [v2Error, setV2Error] = useState('');
  const [v2FixReport, setV2FixReport] = useState({});

  // --- Quote suggestions state ---
  const [quoteSuggestions, setQuoteSuggestions] = useState([]);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // --- Spokesperson state ---
  const [spokespersonKey, setSpokespersonKey] = useState('ceo');
  const [spokespersonName, setSpokespersonName] = useState(SPOKESPERSONS.ceo.name);

  // --- Image upload state ---
  const [uploadedImages, setUploadedImages] = useState([]); // [{id, file_name, file_url, file_path, caption, position, width, height}]
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  // Auto-recommend spokesperson when category changes
  useEffect(() => {
    const recKey = getRecommendedSpokesperson(selectedCategory);
    setSpokespersonKey(recKey);
    setSpokespersonName(SPOKESPERSONS[recKey].name);
  }, [selectedCategory]);

  const isFromPR = !!prSourceData;

  // Derived: red issues for from-PR mode
  const hasRedIssues = Object.values(reviewResults).some(
    (issues) => issues.some((i) => i.severity === 'red')
  );
  // --- Section edit helpers ---
  const updateSection = (ch, idx, newText) => {
    setEditedSections((prev) => {
      const copy = { ...prev };
      copy[ch] = [...(copy[ch] || [])];
      copy[ch][idx] = { ...copy[ch][idx], text: newText };
      return copy;
    });
  };
  const updatePrFixed = (key, val) => setPrFixed((prev) => ({ ...prev, [key]: val }));

  // --- Copy all (라벨 제외, 사진/첨부가이드 제외) ---
  const handleCopyAll = (ch) => {
    const sections = editedSections[ch];
    if (!sections) return;
    // Filter out photo guide and attachment guide sections
    const filteredSections = sections.filter((s) =>
      !(/사진\s*가이드/i.test(s.label) ||
        /첨부파일?\s*가이드/i.test(s.label) ||
        /이미지\s*가이드/i.test(s.label) ||
        /이미지\s*생성\s*프롬프트/i.test(s.label) ||
        /이미지\s*프롬프트/i.test(s.label))
    );
    const text = ch === 'pressrelease' ? assemblePR(filteredSections, prFixed) : assembleTextOnly(filteredSections);
    navigator.clipboard?.writeText(text);
    setCopyStatus(ch);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  // Channel auto-selected as 'pressrelease' — no toggle needed

  // --- Reset ---
  const resetAll = () => {
    setSelectedChannels([]);
    setEditedSections({});
    setPrFixed({ ...PR_FIXED_DEFAULTS });
    setCopyStatus('');
    setRegistered(false);
    setActiveResultTab('');
    if (isFromPR) {
      setLoading(false);
      setGenResults(null);
      setReviewResults({});
      setReviewing(false);
      onClearPRSource?.();
    } else {
      setV2Step('input');
      setSourceText('');
      setTiming('pre');
      setParsedResult(null);
      setSelectedCategory('general');
      setConfirmedFields({});
      setV2Content({});
      setV2Review({});
      setV2Error('');
      setV2FixReport({});
      setQuoteSuggestions([]);
      setQuoteLoading(false);
      setSelectedQuote(null);
      setSpokespersonKey('ceo');
      setSpokespersonName(SPOKESPERSONS.ceo.name);
      setUploadedImages([]);
      setImageUploading(false);
      setImageError('');
    }
  };

  // ===========================================
  // FROM-PR HANDLERS (unchanged)
  // ===========================================

  const handleGenerateFromPR = async () => {
    if (!apiKey) { setShowKey(true); return; }
    if (!selectedChannels.length) return;
    setLoading(true);
    setGenResults(null);
    setRegistered(false);
    setEditedSections({});
    setReviewResults({});
    setReviewing(false);
    try {
      const result = await generateFromPR({ prText: prSourceData.draft, channels: selectedChannels, apiKey });
      setGenResults(result);
      setActiveResultTab(selectedChannels[0] || '');
      const parsed = {};
      for (const [ch, text] of Object.entries(result.results || {})) parsed[ch] = parseSections(text);
      setEditedSections(parsed);

      if (Object.keys(result.results || {}).length > 0) {
        setReviewing(true);
        try {
          const reviews = await reviewMultiChannel({
            contentByChannel: result.results,
            channelIds: Object.keys(result.results),
            userSourceText: prSourceData.draft,
            apiKey,
          });
          setReviewResults(reviews);
        } catch { /* review failure is non-blocking */ }
        setReviewing(false);
      }
    } catch (e) {
      setGenResults({ results: {}, errors: { _global: e.message } });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFromPR = () => {
    if (!genResults || registered) return;
    for (const ch of selectedChannels) {
      const sections = editedSections[ch];
      if (!sections) continue;
      const text = assembleSections(sections);
      const titleSec = sections.find((s) => s.label === '제목' || s.label === '훅' || s.label === '캡션');
      const title = titleSec?.text?.slice(0, 60)?.trim() || `${prSourceData.title} — ${CHANNEL_CONFIGS[ch]?.name}`;
      onAdd({
        id: Date.now() + Math.random(),
        title,
        track: 'B',
        pillar: 'PR',
        stage: 'draft',
        channels: { [ch]: false },
        date: new Date().toISOString().split('T')[0],
        draft: text,
      });
    }
    setRegistered(true);
  };

  // ===========================================
  // V2 FACTORY HANDLERS
  // ===========================================

  /** STEP 0 → 1 → 2: Parse source text */
  const handleV2Parse = async () => {
    if (!apiKey) { setShowKey(true); setV2Error('Claude API Key를 먼저 입력해주세요 ↑'); return; }
    if (!sourceText.trim()) return;
    setV2Step('parsing');
    setV2Error('');
    try {
      const result = await parseContent({ sourceText, apiKey });
      setParsedResult(result);
      setSelectedCategory(result.category || 'general');
      setConfirmedFields(result.fields || {});
      setV2Step('confirm');
    } catch (e) {
      setV2Error(`파싱 실패: ${e.message}`);
      setV2Step('input');
    }
  };

  /** STEP 2 → 3 → 4 → 5: Generate + Review + Quote suggestions */
  const handleV2Generate = async () => {
    if (!apiKey) { setShowKey(true); return; }
    setV2Step('generating');
    setV2Error('');
    setRegistered(false);
    setCopyStatus('');
    setV2FixReport({});
    setQuoteSuggestions([]);
    setSelectedQuote(null);
    setPrFixed((prev) => ({ ...prev, 날짜: new Date().toISOString().split('T')[0] }));

    try {
      // Generate for each channel (with knowledge base)
      const results = {};
      const errors = {};
      await Promise.all(selectedChannels.map(async (ch) => {
        try {
          results[ch] = await generateFromFacts({
            category: selectedCategory,
            confirmedFields,
            timing,
            channelId: ch,
            apiKey,
            knowledgeBase,
          });
        } catch (e) {
          errors[ch] = e.message;
        }
      }));

      // 팩트 쌍 강제 (예: "3년" 누락 방지)
      for (const ch of Object.keys(results)) {
        results[ch] = enforceFactPairs(results[ch], sourceText);
      }

      setV2Content(results);

      // Parse sections for editor
      const parsed = {};
      for (const [ch, text] of Object.entries(results)) {
        parsed[ch] = parseSections(text);
      }
      setEditedSections(parsed);
      setActiveResultTab(selectedChannels.find((ch) => results[ch]) || selectedChannels[0] || '');

      if (Object.keys(errors).length > 0 && Object.keys(results).length === 0) {
        setV2Error(`생성 실패: ${Object.values(errors).join(', ')}`);
        setV2Step('confirm');
        return;
      }

      // Quote suggestions — always generate alternatives (AI already put A안 in paragraph 4)
      const firstContent = Object.values(results)[0] || '';

      // Auto-review + quote suggestions in parallel
      setV2Step('reviewing');
      const reviewPromise = (async () => {
        const reviews = {};
        await Promise.all(selectedChannels.map(async (ch) => {
          if (!results[ch]) return;
          try {
            reviews[ch] = await reviewV2({
              content: results[ch],
              confirmedFields,
              channelId: ch,
              apiKey,
            });
          } catch {
            reviews[ch] = { summary: { critical: 0, warning: 0, factRatio: '검수 실패' }, issues: [] };
          }
        }));
        return reviews;
      })();

      const sp = SPOKESPERSONS[spokespersonKey];
      const quotePromise = (async () => {
        try {
          setQuoteLoading(true);
          const suggestions = await generateQuoteSuggestions({
            category: selectedCategory,
            confirmedFields,
            generatedContent: firstContent,
            timing,
            apiKey,
            speakerName: spokespersonName || sp?.name,
            speakerTitle: sp?.title || '대표',
          });
          setQuoteSuggestions(Array.isArray(suggestions) ? suggestions : []);
        } catch {
          setQuoteSuggestions([]);
        } finally {
          setQuoteLoading(false);
        }
      })();

      const [reviews] = await Promise.all([reviewPromise, quotePromise]);
      setV2Review(reviews);

      // Check if any channel has fixable issues
      const hasIssues = selectedChannels.some((ch) =>
        reviews[ch]?.issues?.some((i) => i.category !== '팩트 비율')
      );

      if (hasIssues) {
        // Auto-fix step (4th API call)
        setV2Step('fixing');
        const fixResults = {};
        await Promise.all(selectedChannels.map(async (ch) => {
          const review = reviews[ch];
          if (!review?.issues?.length) return;
          try {
            fixResults[ch] = await autoFixContent({
              content: results[ch],
              issues: review.issues,
              confirmedFields,
              channelId: ch,
              apiKey,
              knowledgeBase,
            });
          } catch {
            fixResults[ch] = null;
          }
        }));

        setV2FixReport(fixResults);

        // Update editedSections and v2Content with fixed content + 팩트 쌍 강제
        setEditedSections((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              const enforced = enforceFactPairs(fixResult.fixedContent, sourceText);
              copy[ch] = parseSections(enforced);
            }
          }
          return copy;
        });
        setV2Content((prev) => {
          const copy = { ...prev };
          for (const [ch, fixResult] of Object.entries(fixResults)) {
            if (fixResult?.fixedContent) {
              copy[ch] = enforceFactPairs(fixResult.fixedContent, sourceText);
            }
          }
          return copy;
        });
      }

      setV2Step('results');
    } catch (e) {
      setV2Error(`오류: ${e.message}`);
      setV2Step('confirm');
    }
  };

  /** Replace existing quote in content with selected alternative */
  const handleSelectQuote = (quoteText) => {
    // Find the A안 (first suggestion) text to use as search target for replacement
    const existingQuote = selectedQuote || (quoteSuggestions[0]?.text);
    setSelectedQuote(quoteText);
    if (!existingQuote) return;
    setEditedSections((prev) => {
      const copy = { ...prev };
      for (const ch of selectedChannels) {
        if (!copy[ch]) continue;
        copy[ch] = copy[ch].map((sec) => ({
          ...sec,
          text: sec.text.replace(existingQuote, quoteText),
        }));
      }
      return copy;
    });
  };

  /** Regenerate quote suggestions */
  const handleRegenerateQuotes = async () => {
    if (!apiKey) return;
    const firstContent = Object.values(v2Content)[0] || '';
    setQuoteLoading(true);
    setQuoteSuggestions([]);
    setSelectedQuote(null);
    const sp = SPOKESPERSONS[spokespersonKey];
    try {
      const suggestions = await generateQuoteSuggestions({
        category: selectedCategory,
        confirmedFields,
        generatedContent: firstContent,
        timing,
        apiKey,
        speakerName: spokespersonName || sp?.name,
        speakerTitle: sp?.title || '대표',
      });
      setQuoteSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch {
      setQuoteSuggestions([]);
    } finally {
      setQuoteLoading(false);
    }
  };

  // --- Image upload handlers ---
  const handleImageUpload = async (files) => {
    if (!files?.length || uploadedImages.length >= 5) return;
    setImageUploading(true);
    setImageError('');
    const remaining = 5 - uploadedImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue;
        const { record } = await uploadPressReleaseImage(file, null, '', uploadedImages.length);
        setUploadedImages((prev) => [...prev, record]);
      }
    } catch (e) {
      console.error('Image upload failed:', e);
      setImageError(`사진 업로드 실패: ${e.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  const handleImageDelete = async (img) => {
    try {
      await deletePressReleaseImage(img.id, img.file_path);
      setUploadedImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch (e) {
      console.error('Image delete failed:', e);
    }
  };

  const handleImageCaptionChange = (imgId, caption) => {
    setUploadedImages((prev) => prev.map((i) => i.id === imgId ? { ...i, caption } : i));
  };

  const handleImageMove = (idx, direction) => {
    setUploadedImages((prev) => {
      const arr = [...prev];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= arr.length) return arr;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((item, i) => ({ ...item, position: i }));
    });
  };

  /** Export: register to pipeline */
  const handleV2Register = () => {
    if (registered) return;
    const isPR = selectedChannels.includes('pressrelease') && selectedChannels.length === 1;
    if (isPR) {
      // Single press release → publish
      const sections = editedSections.pressrelease || [];
      const fullText = assemblePR(sections, prFixed);
      const titleSec = sections.find((s) => s.label === '제목');
      onAdd({
        id: Date.now(),
        title: titleSec?.text?.trim() || '보도자료',
        track: 'B',
        pillar: 'PR',
        stage: 'published',
        channels: { pressrelease: true },
        date: prFixed.날짜 || new Date().toISOString().split('T')[0],
        draft: fullText,
      });
    } else {
      // Multi-channel or non-PR
      const drafts = {};
      for (const ch of selectedChannels) {
        const sections = editedSections[ch];
        if (!sections) continue;
        drafts[ch] = ch === 'pressrelease' ? assemblePR(sections, prFixed) : assembleSections(sections);
      }
      const firstSections = editedSections[selectedChannels[0]] || [];
      const titleSec = firstSections.find((s) => s.label === '제목' || s.label === '훅' || s.label === '캡션');
      onAdd({
        id: Date.now(),
        title: titleSec?.text?.slice(0, 60)?.trim() || '콘텐츠',
        track: 'B',
        pillar: 'PR',
        stage: selectedChannels.includes('pressrelease') ? 'published' : 'draft',
        channels: selectedChannels.reduce((acc, ch) => ({ ...acc, [ch]: false }), {}),
        date: new Date().toISOString().split('T')[0],
        draft: Object.keys(drafts).length === 1 ? Object.values(drafts)[0] : drafts,
      });
    }
    setRegistered(true);
  };

  // FROM-PR mode now redirects to repurpose page (handled in App.jsx)
  if (isFromPR) {
    onClearPRSource?.();
    return null;
  }

  // ===========================================
  // RENDER — V2 FACTORY MODE (6-step flow)
  // ===========================================
  const v2StepIdx = V2_STEP_INDEX[v2Step] ?? 0;
  const isPRChannel = true; // Always pressrelease

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">보도자료 제작</h2>
        {v2Step !== 'input' && (
          <button onClick={resetAll} className="text-[12px] text-mist hover:text-steel border-none bg-transparent cursor-pointer">처음부터 다시</button>
        )}
      </div>

      <APIKeyBox apiKey={apiKey} setApiKey={setApiKey} showKey={showKey} setShowKey={setShowKey} />

      {/* v2 Stepper */}
      {v2Step !== 'results' && (
        <div className="flex items-center gap-1">
          {V2_STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                i < v2StepIdx ? 'bg-accent text-white' : i === v2StepIdx ? 'bg-dark text-white' : 'bg-pale text-mist'
              }`}>{i + 1}</div>
              <span className={`text-[10px] hidden md:block truncate ${i === v2StepIdx ? 'text-dark font-semibold' : 'text-mist'}`}>{label}</span>
              {i < V2_STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-pale mx-1" />}
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {v2Error && (
        <div className="text-[13px] text-danger bg-danger/5 rounded-xl p-4 border border-danger/20">
          {v2Error}
          <button onClick={() => setV2Error('')} className="ml-2 text-[11px] text-danger/60 border-none bg-transparent cursor-pointer underline">닫기</button>
        </div>
      )}

      {/* ============================== */}
      {/* STEP 0: Input                  */}
      {/* ============================== */}
      {v2Step === 'input' && (
        <div className="space-y-4">
          {/* Source text */}
          <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
            <div>
              <div className="text-[13px] font-bold mb-1">소스 텍스트</div>
              <div className="text-[11px] text-mist">보도자료로 작성할 원본 자료를 붙여넣으세요 (이벤트 정보, 계약 내용, 제품 스펙 등)</div>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="예: BRITZMEDI가 2026년 3월 15-17일 AMWC Monaco 2026에 참가합니다. 부스 번호 H301에서 TORR RF 신제품을 전시합니다..."
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y"
            />
            <div className="text-[11px] text-mist text-right">{sourceText.length}자</div>
          </div>

          {/* Channel info (auto-selected: pressrelease) */}
          <div className="text-[11px] text-accent bg-accent/5 rounded-lg px-3 py-2 border border-accent/10">
            보도자료 생성 후 "채널 콘텐츠 만들기"에서 네이버/카카오톡/LinkedIn/인스타그램으로 재가공할 수 있습니다.
          </div>

          {/* Timing selection */}
          <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
            <div className="text-[13px] font-bold mb-1">시점 (시제)</div>
            <div className="flex gap-3">
              <button onClick={() => setTiming('pre')}
                className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                  timing === 'pre' ? 'bg-dark text-white border-dark' : 'bg-white border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-bold">예고형 (사전)</div>
                <div className={`text-[11px] mt-0.5 ${timing === 'pre' ? 'text-silver' : 'text-mist'}`}>~할 예정이다, ~에 참가한다</div>
              </button>
              <button onClick={() => setTiming('post')}
                className={`flex-1 p-3 rounded-lg border cursor-pointer transition-all text-left ${
                  timing === 'post' ? 'bg-dark text-white border-dark' : 'bg-white border-pale hover:bg-snow'
                }`}>
                <div className="text-[13px] font-bold">리뷰형 (사후)</div>
                <div className={`text-[11px] mt-0.5 ${timing === 'post' ? 'text-silver' : 'text-mist'}`}>~했다, ~를 선보였다</div>
              </button>
            </div>
          </div>

          {/* Parse button */}
          <button
            type="button"
            onClick={handleV2Parse}
            disabled={!sourceText.trim()}
            className={`w-full py-3.5 rounded-lg text-[14px] font-bold border-none transition-colors ${
              sourceText.trim()
                ? 'bg-accent text-white hover:bg-accent-dim cursor-pointer active:scale-[0.98]'
                : 'bg-silver/50 text-mist cursor-not-allowed'
            }`}
          >
            소스 파싱 시작 (STEP 1)
          </button>
          {!sourceText.trim() && (
            <div className="text-[11px] text-danger text-center -mt-2">
              ⬆ 소스 텍스트를 입력하세요
            </div>
          )}
        </div>
      )}

      {/* ============================== */}
      {/* STEP 1: Parsing (loading)      */}
      {/* ============================== */}
      {v2Step === 'parsing' && (
        <LoadingCard title="소스 텍스트 파싱 중..." subtitle="AI가 소스에서 구조화된 팩트를 추출하고 있습니다" />
      )}

      {/* ============================== */}
      {/* STEP 2: Fact Confirmation      */}
      {/* ============================== */}
      {v2Step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 border border-pale space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold">팩트 확인</div>
                <div className="text-[11px] text-mist">AI가 추출한 팩트를 확인하고 수정하세요. 이 정보만으로 콘텐츠가 생성됩니다.</div>
              </div>
              <button onClick={() => { setV2Step('input'); setV2Error(''); }}
                className="text-[11px] text-accent border-none bg-transparent cursor-pointer hover:underline">소스 수정</button>
            </div>

            {/* Category selector */}
            <CategorySelector value={selectedCategory} onChange={setSelectedCategory} />

            {/* Field cards */}
            <div className="space-y-2.5">
              {(PR_CATEGORIES[selectedCategory]?.fields || []).map((fieldDef) => (
                <FieldCard
                  key={fieldDef.key}
                  fieldDef={fieldDef}
                  value={confirmedFields[fieldDef.key]}
                  onChange={(val) => setConfirmedFields((prev) => ({ ...prev, [fieldDef.key]: val }))}
                />
              ))}
            </div>

            {/* Spokesperson selector */}
            <div className="bg-accent/5 rounded-xl p-4 border border-accent/10 space-y-3">
              <div>
                <div className="text-[13px] font-bold">대변인 선택</div>
                <div className="text-[11px] text-mist">인용문에 사용할 대변인을 선택하세요. 카테고리에 따라 자동 추천됩니다.</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(SPOKESPERSONS).map(([key, sp]) => {
                  const isRecommended = sp.bestFor.includes(selectedCategory);
                  const isSelected = spokespersonKey === key;
                  return (
                    <button key={key} onClick={() => { setSpokespersonKey(key); setSpokespersonName(sp.name); }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all text-left ${
                        isSelected
                          ? 'bg-dark text-white border-dark'
                          : 'bg-white border-pale hover:bg-snow'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-bold">{sp.role}</span>
                        {isRecommended && !isSelected && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">추천</span>
                        )}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-silver' : 'text-mist'}`}>{sp.title}</div>
                      <div className={`text-[11px] mt-1 ${isSelected ? 'text-white' : 'text-slate'}`}>
                        {sp.name || '(미지정)'}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Editable name field (only when nameEditable or name is empty) */}
              {(SPOKESPERSONS[spokespersonKey]?.nameEditable || !SPOKESPERSONS[spokespersonKey]?.name) && (
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-steel whitespace-nowrap">{SPOKESPERSONS[spokespersonKey]?.role} 이름:</label>
                  <input
                    type="text"
                    value={spokespersonName}
                    onChange={(e) => setSpokespersonName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-white"
                  />
                </div>
              )}
            </div>

            {/* Summary: how many facts confirmed */}
            <div className="bg-snow rounded-lg p-3">
              <div className="text-[12px] text-steel">
                확인된 팩트: <span className="font-bold text-accent">
                  {Object.values(confirmedFields).filter((v) => v !== null && v !== '' && v !== undefined).length}
                </span> / {PR_CATEGORIES[selectedCategory]?.fields.length || 0}개 필드
              </div>
              <div className="text-[11px] text-mist mt-1">
                채널: 보도자료 | 시점: {timing === 'pre' ? '예고형' : '리뷰형'} | 대변인: {spokespersonName || '미지정'} ({SPOKESPERSONS[spokespersonKey]?.role})
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex gap-2">
            <button onClick={() => { setV2Step('input'); setV2Error(''); }}
              className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">이전</button>
            <button onClick={handleV2Generate}
              className="flex-1 py-3 rounded-lg text-[14px] font-bold bg-accent text-white border-none cursor-pointer hover:bg-accent-dim">
              팩트 확인 완료 → 보도자료 생성 (STEP 3)
            </button>
          </div>
        </div>
      )}

      {/* ============================== */}
      {/* STEP 3: Generating (loading)   */}
      {/* ============================== */}
      {v2Step === 'generating' && (
        <LoadingCard title="팩트 기반 보도자료 생성 중..." subtitle="확인된 팩트만으로 보도자료를 작성하고 있습니다" />
      )}

      {/* ============================== */}
      {/* STEP 4: Reviewing + Fixing     */}
      {/* ============================== */}
      {v2Step === 'reviewing' && (
        <LoadingCard title="AI 검수 진행 중..." subtitle="팩트 비율, 의료법, 표기법을 자동 검수합니다" />
      )}
      {v2Step === 'fixing' && (
        <LoadingCard title="AI 자동 수정 중..." subtitle="검수에서 발견된 문제를 자동으로 수정하고 있습니다" />
      )}

      {/* ============================== */}
      {/* STEP 5: Results + Export       */}
      {/* ============================== */}
      {v2Step === 'results' && (
        <div className="space-y-4">
          {/* Fix Report or Pass Message */}
          {Object.keys(v2FixReport).length > 0 ? (
            <FixReport fixReport={v2FixReport} selectedChannels={selectedChannels} editedSections={editedSections} setEditedSections={setEditedSections} />
          ) : (
            Object.keys(v2Review).length > 0 && (
              <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                <div className="text-[13px] font-bold text-success">✅ AI 검수 전체 통과</div>
                <div className="text-[11px] text-success/70 mt-1">모든 채널에서 문제가 발견되지 않았습니다.</div>
              </div>
            )
          )}

          {/* Quote Suggestions (if quote was empty) */}
          {(quoteSuggestions.length > 0 || quoteLoading) && !selectedQuote && (
            <QuoteSuggestions
              suggestions={quoteSuggestions}
              loading={quoteLoading}
              onSelect={handleSelectQuote}
              onRegenerate={handleRegenerateQuotes}
            />
          )}
          {selectedQuote && (
            <div className="bg-success/5 rounded-xl p-3 border border-success/20 flex items-center justify-between">
              <div className="text-[12px] text-success font-semibold">인용문이 교체되었습니다</div>
              <button onClick={() => { setSelectedQuote(null); setQuoteSuggestions([]); }}
                className="text-[11px] text-steel border-none bg-transparent cursor-pointer hover:underline">다른 인용문 선택</button>
            </div>
          )}

          {/* Image Upload (press release only) */}
          {isPRChannel && (
            <ImageUploader
              images={uploadedImages}
              uploading={imageUploading}
              error={imageError}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              onCaptionChange={handleImageCaptionChange}
              onMove={handleImageMove}
            />
          )}

          {/* Channel tabs */}
          {selectedChannels.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {selectedChannels.map((ch) => {
                const cfg = CHANNEL_CONFIGS[ch];
                const hasContent = !!v2Content[ch];
                const fixed = !!v2FixReport[ch];
                const needsInputCount = v2FixReport[ch]?.needsInput?.length || 0;
                let indicator = '✅';
                if (!hasContent) indicator = '⚠️';
                else if (fixed && needsInputCount > 0) indicator = `⚠️${needsInputCount}`;
                return (
                  <button key={ch} onClick={() => { setActiveResultTab(ch); setCopyStatus(''); }}
                    className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                      activeResultTab === ch ? 'bg-dark text-white border-dark' : !hasContent ? 'bg-danger/5 text-danger border-danger/20' : 'bg-white text-slate border-pale hover:bg-snow'
                    }`}>
                    {cfg.name} {indicator}
                  </button>
                );
              })}
            </div>
          )}

          {/* Editor + Issue annotations for active channel */}
          {activeResultTab && editedSections[activeResultTab]?.length > 0 && (
            <V2EditorView
              channelId={activeResultTab}
              sections={editedSections[activeResultTab]}
              updateSection={(idx, val) => updateSection(activeResultTab, idx, val)}
              review={v2FixReport[activeResultTab] ? null : v2Review[activeResultTab]}
              isPR={activeResultTab === 'pressrelease'}
              prFixed={prFixed}
              updatePrFixed={updatePrFixed}
              handleCopyAll={() => handleCopyAll(activeResultTab)}
              copyStatus={copyStatus === activeResultTab}
              onRegenerate={handleV2Generate}
            />
          )}

          {/* Export actions */}
          <div className="space-y-3">
            {/* PR-specific export buttons */}
            {isPRChannel && (
              <div className="flex gap-2">
                <button onClick={() => handleWordDownload(editedSections.pressrelease || [], prFixed, selectedQuote, uploadedImages)}
                  className="flex-1 py-3 rounded-lg text-[13px] font-semibold text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
                  Word 다운로드 (.docx)
                </button>
                <button onClick={() => {
                  const sections = editedSections.pressrelease || [];
                  const text = assemblePR(sections, prFixed);
                  const titleSec = sections.find((s) => s.label === '제목');
                  openPrintView(text, titleSec?.text?.trim() || '보도자료');
                }} className="flex-1 py-3 rounded-lg text-[13px] font-semibold text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
                  PDF 다운로드
                </button>
              </div>
            )}

            {/* Register */}
            <div className="flex gap-2">
              <button onClick={resetAll} className="px-5 py-3 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">새 콘텐츠 만들기</button>
              <button onClick={handleV2Register} disabled={registered}
                className={`flex-1 py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                  registered ? 'bg-success text-white cursor-default' : 'bg-dark text-white hover:bg-charcoal'
                }`}>
                {registered ? '파이프라인에 등록 완료 ✓' : '파이프라인에 등록'}
              </button>
            </div>

            {/* Go to channel repurpose */}
            {registered && onGoToRepurpose && (
              <button
                onClick={() => {
                  const sections = editedSections.pressrelease || [];
                  const titleSec = sections.find((s) => s.label === '제목');
                  const fullText = assemblePR(sections, prFixed);
                  onGoToRepurpose({
                    title: titleSec?.text?.trim() || '보도자료',
                    date: prFixed.날짜 || new Date().toISOString().split('T')[0],
                    draft: fullText,
                  });
                }}
                className="w-full py-3.5 rounded-lg text-[14px] font-bold bg-accent text-white border-none cursor-pointer hover:bg-accent-dim transition-colors"
              >
                📢 채널 콘텐츠 만들기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// V2 Sub-components
// =====================================================

function LoadingCard({ title, subtitle }) {
  return (
    <div className="bg-white rounded-xl p-8 border border-pale flex flex-col items-center gap-3">
      <span className="inline-block w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      <div className="text-[14px] font-bold text-slate">{title}</div>
      <div className="text-[12px] text-mist">{subtitle}</div>
    </div>
  );
}

function CategorySelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-steel mb-1.5">카테고리</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer">
        {Object.entries(PR_CATEGORIES).map(([id, cat]) => (
          <option key={id} value={id}>{cat.icon} {cat.label}</option>
        ))}
      </select>
    </div>
  );
}

function FieldCard({ fieldDef, value, onChange }) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <div className={`rounded-lg border p-3 transition-colors ${isEmpty ? 'border-pale bg-snow/50' : 'border-accent/20 bg-white'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold text-steel">
          {fieldDef.label}
          {fieldDef.required && <span className="text-danger ml-1">*</span>}
        </label>
        {isEmpty && <span className="text-[10px] text-mist italic">(소스에 없음)</span>}
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        rows={isEmpty ? 1 : 2}
        placeholder={isEmpty ? '소스에서 추출되지 않음 — 직접 입력 가능' : ''}
        className={`w-full px-3 py-2 rounded-lg border text-[12px] leading-[1.6] outline-none resize-none transition-colors ${
          isEmpty ? 'border-pale bg-snow text-mist focus:border-accent focus:text-slate' : 'border-pale bg-white text-slate focus:border-accent'
        }`}
      />
    </div>
  );
}

function FixReport({ fixReport, selectedChannels, editedSections, setEditedSections }) {
  const allFixes = [];
  const allNeedsInput = [];

  for (const ch of selectedChannels) {
    const result = fixReport[ch];
    if (!result) continue;
    if (result.fixes) allFixes.push(...result.fixes);
    if (result.needsInput) allNeedsInput.push(...result.needsInput);
  }

  const totalFixed = allFixes.length;
  if (totalFixed === 0 && allNeedsInput.length === 0) {
    return (
      <div className="bg-success/5 rounded-xl p-4 border border-success/20">
        <div className="text-[13px] font-bold text-success">✅ AI 검수 통과 — 수정 사항 없음</div>
      </div>
    );
  }

  const handleApplyInput = (placeholder, value) => {
    if (!value.trim()) return;
    setEditedSections((prev) => {
      const copy = { ...prev };
      for (const ch of Object.keys(copy)) {
        if (!copy[ch]) continue;
        copy[ch] = copy[ch].map((sec) => ({
          ...sec,
          text: sec.text.replace(placeholder, value.trim()),
        }));
      }
      return copy;
    });
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-accent/20 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold">수정 리포트</div>
        <div className="text-[11px] text-success font-semibold">AI 자동 수정 {totalFixed}건 완료</div>
      </div>
      {allFixes.map((fix, i) => (
        <div key={`fix-${i}`} className="flex items-start gap-2 text-[12px] text-slate leading-relaxed">
          <span className="text-success shrink-0 mt-0.5">✅</span>
          <span><span className="font-semibold text-success">[자동 수정]</span> {fix.description}</span>
        </div>
      ))}
      {allNeedsInput.map((ni, i) => (
        <NeedsInputItem key={`input-${i}`} item={ni} onApply={handleApplyInput} />
      ))}
    </div>
  );
}

function NeedsInputItem({ item, onApply }) {
  const [value, setValue] = useState('');
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (!value.trim()) return;
    onApply(item.placeholder, value);
    setApplied(true);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2 text-[12px] text-slate leading-relaxed">
        <span className="text-warning shrink-0 mt-0.5">⚠️</span>
        <span><span className="font-semibold text-warning">[입력 필요]</span> {item.description}</span>
      </div>
      {!applied ? (
        <div className="flex gap-2 ml-6">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="직접 입력 (선택 사항 — 비워두면 플레이스홀더 유지)"
            className="flex-1 px-3 py-2 rounded-lg border border-warning/30 text-[12px] outline-none focus:border-accent bg-snow"
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
          {value.trim() && (
            <button onClick={handleApply}
              className="px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim shrink-0">
              적용
            </button>
          )}
        </div>
      ) : (
        <div className="ml-6 text-[11px] text-success font-semibold">입력 완료 ✓</div>
      )}
    </div>
  );
}

function V2EditorView({ channelId, sections, updateSection, review, isPR, prFixed, updatePrFixed, handleCopyAll, copyStatus, onRegenerate }) {
  const issues = review?.issues || [];
  const issuesBySection = {};
  issues.forEach((issue) => {
    const key = issue.section || '_general';
    if (!issuesBySection[key]) issuesBySection[key] = [];
    issuesBySection[key].push(issue);
  });

  return (
    <div className="bg-white rounded-xl border border-pale overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold">{CHANNEL_CONFIGS[channelId]?.name}</div>
          <button onClick={onRegenerate}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">재생성</button>
        </div>

        {issuesBySection._general?.length > 0 && (
          <IssueAnnotations issues={issuesBySection._general} />
        )}

        <div className="text-[11px] font-semibold text-accent mb-1">AI 생성 영역</div>
        {sections.map((sec, idx) => (
          <div key={idx}>
            <SectionField label={sec.label} value={sec.text}
              onChange={(val) => updateSection(idx, val)}
              rows={sec.label === '본문' || sec.label === '전체' ? 12 : sec.label.startsWith('본문') || sec.label.startsWith('소제목') ? 8 : 3} />
            {issuesBySection[sec.label]?.length > 0 && (
              <IssueAnnotations issues={issuesBySection[sec.label]} />
            )}
          </div>
        ))}

        {isPR && (
          <>
            <div className="border-t border-pale pt-4 mt-4">
              <div className="text-[11px] font-semibold text-steel mb-3">뉴스와이어 입력 필드</div>
            </div>
            <SectionField label="출처" value={prFixed.출처} onChange={(v) => updatePrFixed('출처', v)} rows={1} />
            <SectionField label="날짜" value={prFixed.날짜} onChange={(v) => updatePrFixed('날짜', v)} rows={1} />
            <SectionField label="웹사이트" value={prFixed.웹사이트} onChange={(v) => updatePrFixed('웹사이트', v)} rows={1} />
            <SectionField label="소셜 링크" value={prFixed.소셜링크} onChange={(v) => updatePrFixed('소셜링크', v)} rows={3} />
            <div className="bg-snow rounded-lg p-4 space-y-3">
              <div className="text-[12px] font-semibold text-steel">연락처</div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput label="담당자명" value={prFixed.담당자명} onChange={(v) => updatePrFixed('담당자명', v)} placeholder="이름 입력" />
                <LabelInput label="직책" value={prFixed.직책} onChange={(v) => updatePrFixed('직책', v)} placeholder="직책 입력" />
                <LabelInput label="이메일" value={prFixed.이메일} onChange={(v) => updatePrFixed('이메일', v)} placeholder="email@britzmedi.co.kr" />
                <LabelInput label="전화번호" value={prFixed.전화번호} onChange={(v) => updatePrFixed('전화번호', v)} placeholder="010-0000-0000" />
              </div>
            </div>
          </>
        )}

        <button onClick={handleCopyAll}
          className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
            copyStatus ? 'bg-success text-white' : 'bg-dark text-white hover:bg-charcoal'
          }`}>
          {copyStatus ? '전체 복사 완료 ✓' : `전체 복사 — ${CHANNEL_CONFIGS[channelId]?.name}`}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Shared sub-components (preserved)
// =====================================================

function APIKeyBox({ apiKey, setApiKey, showKey, setShowKey }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-pale">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-semibold text-steel">Claude API Key</span>
        <button type="button" onClick={() => setShowKey(!showKey)} className="text-[11px] text-accent border-none bg-transparent cursor-pointer">
          {showKey ? '숨기기' : apiKey ? '변경' : '설정'}
        </button>
      </div>
      {showKey ? (
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-api..."
          className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-snow" />
      ) : (
        <div className="text-[11px] text-mist">{apiKey ? '••••••••' + apiKey.slice(-8) : '키가 설정되지 않았습니다'}</div>
      )}
    </div>
  );
}

function ResultsView({ genResults, selectedChannels, activeResultTab, setActiveResultTab, editedSections, updateSection, handleCopyAll, copyStatus, setCopyStatus, loading, onRegenerate, isPR, prFixed, updatePrFixed, reviewResults, reviewing, hasRedIssues, bottomActions }) {
  const activeReview = reviewResults?.[activeResultTab] || [];

  const issuesBySection = {};
  activeReview.forEach((issue) => {
    const key = issue.section || '_general';
    if (!issuesBySection[key]) issuesBySection[key] = [];
    issuesBySection[key].push(issue);
  });

  return (
    <div className="space-y-4">
      {genResults.errors?._global && (
        <div className="text-[13px] text-danger bg-danger/5 rounded-xl p-4 border border-danger/20">{genResults.errors._global}</div>
      )}
      {selectedChannels.length > 0 && !genResults.errors?._global && (
        <>
          <ReviewSummary reviewResults={reviewResults} reviewing={reviewing} selectedChannels={selectedChannels} />

          <div className="flex gap-1.5 overflow-x-auto">
            {selectedChannels.map((ch) => {
              const cfg = CHANNEL_CONFIGS[ch];
              const hasError = !!genResults.errors?.[ch];
              const chIssues = reviewResults?.[ch] || [];
              const redCount = chIssues.filter((i) => i.severity === 'red').length;
              const yellowCount = chIssues.filter((i) => i.severity === 'yellow').length;
              return (
                <button key={ch} onClick={() => { setActiveResultTab(ch); setCopyStatus(''); }}
                  className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                    activeResultTab === ch ? 'bg-dark text-white border-dark' : hasError ? 'bg-danger/5 text-danger border-danger/20' : 'bg-white text-slate border-pale hover:bg-snow'
                  }`}>
                  {cfg.name} {hasError ? '⚠️' : redCount > 0 ? `🔴${redCount}` : yellowCount > 0 ? `🟡${yellowCount}` : '✅'}
                </button>
              );
            })}
          </div>
          {activeResultTab && (
            <div className="bg-white rounded-xl border border-pale overflow-hidden">
              {genResults.errors?.[activeResultTab] ? (
                <div className="p-5 text-[13px] text-danger">생성 실패: {genResults.errors[activeResultTab]}</div>
              ) : editedSections[activeResultTab]?.length > 0 ? (
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-bold">{CHANNEL_CONFIGS[activeResultTab]?.name}</div>
                    <button onClick={onRegenerate} disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">재생성</button>
                  </div>

                  {issuesBySection._general?.length > 0 && (
                    <IssueAnnotations issues={issuesBySection._general} />
                  )}

                  <div className="text-[11px] font-semibold text-accent mb-1">AI 생성 영역</div>
                  {editedSections[activeResultTab].map((sec, idx) => (
                    <div key={idx}>
                      <SectionField label={sec.label} value={sec.text}
                        onChange={(val) => updateSection(activeResultTab, idx, val)}
                        rows={sec.label === '본문' || sec.label === '전체' ? 12 : sec.label.startsWith('본문') || sec.label.startsWith('소제목') ? 8 : 3} />
                      {issuesBySection[sec.label]?.length > 0 && (
                        <IssueAnnotations issues={issuesBySection[sec.label]} />
                      )}
                    </div>
                  ))}
                  {isPR && (
                    <>
                      <div className="border-t border-pale pt-4 mt-4">
                        <div className="text-[11px] font-semibold text-steel mb-3">뉴스와이어 입력 필드</div>
                      </div>
                      <SectionField label="출처" value={prFixed.출처} onChange={(v) => updatePrFixed('출처', v)} rows={1} />
                      <SectionField label="날짜" value={prFixed.날짜} onChange={(v) => updatePrFixed('날짜', v)} rows={1} />
                      <SectionField label="웹사이트" value={prFixed.웹사이트} onChange={(v) => updatePrFixed('웹사이트', v)} rows={1} />
                      <SectionField label="소셜 링크" value={prFixed.소셜링크} onChange={(v) => updatePrFixed('소셜링크', v)} rows={3} />
                      <div className="bg-snow rounded-lg p-4 space-y-3">
                        <div className="text-[12px] font-semibold text-steel">연락처</div>
                        <div className="grid grid-cols-2 gap-3">
                          <LabelInput label="담당자명" value={prFixed.담당자명} onChange={(v) => updatePrFixed('담당자명', v)} placeholder="이름 입력" />
                          <LabelInput label="직책" value={prFixed.직책} onChange={(v) => updatePrFixed('직책', v)} placeholder="직책 입력" />
                          <LabelInput label="이메일" value={prFixed.이메일} onChange={(v) => updatePrFixed('이메일', v)} placeholder="email@britzmedi.co.kr" />
                          <LabelInput label="전화번호" value={prFixed.전화번호} onChange={(v) => updatePrFixed('전화번호', v)} placeholder="010-0000-0000" />
                        </div>
                      </div>
                    </>
                  )}
                  <button onClick={() => handleCopyAll(activeResultTab)}
                    className={`w-full py-3 rounded-lg text-[14px] font-bold border-none cursor-pointer transition-colors ${
                      copyStatus === activeResultTab ? 'bg-success text-white' : 'bg-dark text-white hover:bg-charcoal'
                    }`}>
                    {copyStatus === activeResultTab ? '전체 복사 완료 ✓' : `전체 복사 — ${CHANNEL_CONFIGS[activeResultTab]?.name}`}
                  </button>
                </div>
              ) : (
                <div className="p-5 text-[13px] text-mist">생성된 내용이 없습니다</div>
              )}
            </div>
          )}
          {bottomActions}
        </>
      )}
    </div>
  );
}

function ReviewSummary({ reviewResults, reviewing, selectedChannels }) {
  if (reviewing) {
    return (
      <div className="bg-accent/5 rounded-xl p-4 border border-accent/20 flex items-center gap-3">
        <span className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <span className="text-[13px] font-semibold text-accent">AI 검수 진행 중...</span>
      </div>
    );
  }

  if (!reviewResults || Object.keys(reviewResults).length === 0) return null;

  let totalRed = 0;
  let totalYellow = 0;
  let totalChannels = 0;
  let passedChannels = 0;
  const factRatios = [];

  for (const ch of selectedChannels) {
    const issues = reviewResults[ch];
    if (!issues) continue;
    totalChannels++;
    const reds = issues.filter((i) => i.severity === 'red').length;
    const yellows = issues.filter((i) => i.severity === 'yellow').length;
    totalRed += reds;
    totalYellow += yellows;
    if (reds === 0 && yellows === 0) passedChannels++;
    const factItem = issues.find((i) => i.category === '팩트 비율');
    if (factItem) factRatios.push({ ch, message: factItem.message, severity: factItem.severity });
  }

  if (totalChannels === 0) return null;

  const allPass = totalRed === 0 && totalYellow === 0;

  return (
    <div className={`rounded-xl p-4 border ${
      totalRed > 0 ? 'bg-danger/5 border-danger/20' : totalYellow > 0 ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'
    }`}>
      <div className="text-[12px] font-bold mb-2">AI 검수 결과</div>
      <div className="flex items-center gap-4 text-[13px] flex-wrap">
        {totalRed > 0 && (
          <span className="font-bold text-danger">🔴 {totalRed}건 (반드시 수정)</span>
        )}
        {totalYellow > 0 && (
          <span className="font-bold text-warning">🟡 {totalYellow}건 (확인 권장)</span>
        )}
        {allPass && (
          <span className="font-bold text-success">✅ 전체 통과 ({passedChannels}채널)</span>
        )}
      </div>
      {factRatios.length > 0 && (
        <div className="mt-2 space-y-1">
          {factRatios.map((fr, i) => (
            <div key={i} className={`text-[12px] font-semibold ${fr.severity === 'red' ? 'text-danger' : 'text-warning'}`}>
              📊 {fr.message}
            </div>
          ))}
        </div>
      )}
      {totalRed > 0 && (
        <div className="text-[11px] text-danger mt-2">🔴 필수 수정 사항이 있습니다. 수정 후 내보내기가 가능합니다.</div>
      )}
    </div>
  );
}

function IssueAnnotations({ issues }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="space-y-1.5 mt-1 mb-2">
      {issues.map((issue, i) => (
        <div key={i} className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed border ${
          issue.severity === 'red' ? 'bg-danger/5 border-danger/20 text-danger' : 'bg-warning/5 border-warning/20 text-warning'
        }`}>
          <div className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">{issue.severity === 'red' ? '🔴' : '🟡'}</span>
            <div>
              <span className="font-bold">[{issue.category}]</span> {issue.message}
              {issue.quote && (
                <div className={`mt-1 text-[10px] italic ${issue.severity === 'red' ? 'text-danger/70' : 'text-warning/70'}`}>
                  &quot;{issue.quote}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionField({ label, value, onChange, rows = 3 }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate mb-1.5">[{label}]</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full px-4 py-3 rounded-lg border border-pale text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y" />
    </div>
  );
}

function QuoteSuggestions({ suggestions, loading, onSelect, onRegenerate }) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-accent/20">
        <div className="flex items-center gap-3">
          <span className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-[13px] font-semibold text-accent">인용문 대안 생성 중...</span>
        </div>
      </div>
    );
  }

  if (customMode) {
    return (
      <div className="bg-white rounded-xl p-4 border border-accent/20 space-y-3">
        <div className="text-[13px] font-bold">대표 인용문 직접 작성</div>
        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder='이신재 브릿츠메디 대표는 "..." 이라고 밝혔다.'
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] leading-[1.6] outline-none focus:border-accent bg-snow resize-y"
        />
        <div className="flex gap-2">
          <button onClick={() => setCustomMode(false)}
            className="px-3 py-2 rounded-lg text-[12px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">AI 제안 보기</button>
          <button onClick={() => { if (customText.trim()) onSelect(customText.trim()); }}
            disabled={!customText.trim()}
            className={`flex-1 py-2 rounded-lg text-[12px] font-semibold border-none cursor-pointer ${
              customText.trim() ? 'bg-accent text-white hover:bg-accent-dim' : 'bg-pale text-mist cursor-not-allowed'
            }`}>본문에 삽입</button>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-4 border border-accent/20 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold">인용문 대안 선택</div>
          <div className="text-[11px] text-mist">AI가 본문에 기본 인용문(A안)을 삽입했습니다. 다른 톤을 원하면 B/C안을 선택하세요.</div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onRegenerate}
            className="px-2.5 py-1.5 rounded-lg text-[11px] text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">다시 생성</button>
          <button onClick={() => setCustomMode(true)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] text-steel bg-snow border border-pale cursor-pointer hover:bg-pale">직접 작성</button>
        </div>
      </div>
      <div className="space-y-2">
        {suggestions.map((q, i) => (
          <div key={i} className="rounded-lg border border-pale p-3 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent">
                    {q.label}안
                  </span>
                  <span className="text-[10px] text-mist">{q.tone}</span>
                </div>
                <div className="text-[12px] text-slate leading-relaxed">{q.text}</div>
              </div>
              <button onClick={() => onSelect(q.text)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
                선택
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabelInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] text-mist mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-pale text-[12px] outline-none focus:border-accent bg-white" />
    </div>
  );
}

function ImageUploader({ images, uploading, error, onUpload, onDelete, onCaptionChange, onMove }) {
  const fileInputRef = { current: null };
  const handleDrop = (e) => {
    e.preventDefault();
    onUpload(e.dataTransfer.files);
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-pale space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold">사진 첨부</div>
          <div className="text-[11px] text-mist">보도자료에 포함할 사진을 업로드하세요 (최대 5장, JPG/PNG)</div>
        </div>
        <span className="text-[11px] text-steel">{images.length}/5</span>
      </div>

      {error && (
        <div className="text-[12px] text-danger bg-danger/5 rounded-lg px-3 py-2 border border-danger/20">
          {error}
        </div>
      )}

      {/* Upload zone */}
      {images.length < 5 && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-pale rounded-lg p-6 text-center cursor-pointer hover:border-accent/30 hover:bg-accent/5 transition-colors"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-[12px] text-accent">업로드 중...</span>
            </div>
          ) : (
            <div className="text-[12px] text-mist">
              클릭하거나 파일을 드래그하여 업로드
            </div>
          )}
          <input
            ref={(el) => { fileInputRef.current = el; }}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((img, idx) => (
            <div key={img.id} className="flex gap-3 p-2.5 rounded-lg border border-pale bg-snow">
              <img src={img.file_url} alt={img.file_name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-[11px] text-mist truncate">{img.file_name}</div>
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={(e) => onCaptionChange(img.id, e.target.value)}
                  placeholder="사진 캡션 입력..."
                  className="w-full px-2 py-1 rounded border border-pale text-[11px] outline-none focus:border-accent bg-white"
                />
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => onMove(idx, -1)} disabled={idx === 0}
                  className={`w-6 h-6 rounded text-[10px] border border-pale cursor-pointer ${idx === 0 ? 'text-pale bg-snow cursor-not-allowed' : 'text-steel bg-white hover:bg-snow'}`}>▲</button>
                <button onClick={() => onMove(idx, 1)} disabled={idx === images.length - 1}
                  className={`w-6 h-6 rounded text-[10px] border border-pale cursor-pointer ${idx === images.length - 1 ? 'text-pale bg-snow cursor-not-allowed' : 'text-steel bg-white hover:bg-snow'}`}>▼</button>
                <button onClick={() => onDelete(img)}
                  className="w-6 h-6 rounded text-[10px] text-danger border border-danger/20 bg-danger/5 cursor-pointer hover:bg-danger/10">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
