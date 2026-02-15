import { useState, useRef } from 'react';
import { KB_CATEGORIES } from '../../constants/knowledgeBase';
import { validateFile, extractTextFromFile, formatFileSize } from '../../lib/fileExtract';
import { saveRawText, deleteRawText } from '../../lib/rawTextStorage';
import { summarizeDocumentForKB } from '../../lib/claude';

const CATEGORY_IDS = ['all', ...Object.keys(KB_CATEGORIES)];

export default function KnowledgeBase({ entries, setEntries, apiKey, setApiKey, showToast }) {
  const [filterCat, setFilterCat] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'company' });
  const [expandedId, setExpandedId] = useState(null);

  // File upload states (shared for add + edit)
  const [uploadStep, setUploadStep] = useState('idle'); // idle | extracting | summarizing | done
  const [uploadFile, setUploadFile] = useState(null);
  const [extractedRawText, setExtractedRawText] = useState('');
  const [fileMetadata, setFileMetadata] = useState(null);
  const [fileRemoved, setFileRemoved] = useState(false);

  const filtered = filterCat === 'all'
    ? entries
    : entries.filter((e) => e.category === filterCat);

  // Category counts
  const catCounts = {};
  for (const e of entries) {
    catCounts[e.category] = (catCounts[e.category] || 0) + 1;
  }

  // Group entries by category for "all" view
  const groupedEntries = {};
  for (const entry of entries) {
    if (!groupedEntries[entry.category]) groupedEntries[entry.category] = [];
    groupedEntries[entry.category].push(entry);
  }

  // ===== Add/Edit Handlers =====

  const handleAdd = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const entryId = fileMetadata ? `kb-file-${Date.now()}` : `kb-${Date.now()}`;
    const entry = {
      id: entryId,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      updatedAt: new Date().toISOString(),
      ...(fileMetadata && {
        source: 'file',
        fileName: fileMetadata.fileName,
        fileType: fileMetadata.fileType,
        extractedData: fileMetadata.extractedData,
      }),
    };
    if (fileMetadata && extractedRawText) {
      try { saveRawText(entryId, extractedRawText); } catch (err) { showToast?.(err.message, 'error'); }
    }
    setEntries([entry, ...entries]);
    showToast?.(fileMetadata ? '파일이 지식 베이스에 추가되었습니다.' : '항목이 추가되었습니다.');
    resetForm();
  };

  const handleUpdate = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const existingEntry = entries.find((e) => e.id === editingId);
    const hadFile = existingEntry?.source === 'file';
    const hasNewFile = !!fileMetadata && !!extractedRawText;

    const updatedEntry = {
      ...existingEntry,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      updatedAt: new Date().toISOString(),
    };

    if (hasNewFile) {
      // New file uploaded during edit → replace
      updatedEntry.source = 'file';
      updatedEntry.fileName = fileMetadata.fileName;
      updatedEntry.fileType = fileMetadata.fileType;
      updatedEntry.extractedData = fileMetadata.extractedData;
      try { saveRawText(editingId, extractedRawText); } catch (err) { showToast?.(err.message, 'error'); }
    } else if (fileRemoved && hadFile) {
      // File was explicitly removed
      delete updatedEntry.source;
      delete updatedEntry.fileName;
      delete updatedEntry.fileType;
      delete updatedEntry.extractedData;
      try { deleteRawText(editingId); } catch { /* ignore */ }
    }
    // else: keep existing file metadata (if any) untouched

    setEntries(entries.map((e) => (e.id === editingId ? updatedEntry : e)));
    showToast?.('항목이 수정되었습니다.');
    resetForm();
  };

  const handleDelete = (id) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    setEntries(entries.filter((e) => e.id !== id));
    try { deleteRawText(id); } catch { /* ignore */ }
    if (editingId === id) resetForm();
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setIsAdding(false);
    setFileRemoved(false);
    if (entry.source === 'file') {
      setFileMetadata({ fileName: entry.fileName, fileType: entry.fileType, extractedData: entry.extractedData });
      setUploadStep('done');
      setUploadFile(null);
      setExtractedRawText('');
    } else {
      resetUploadState();
    }
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm({ title: '', content: '', category: 'company' });
    setFileRemoved(false);
    resetUploadState();
  };

  const resetUploadState = () => {
    setUploadStep('idle');
    setUploadFile(null);
    setExtractedRawText('');
    setFileMetadata(null);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ title: '', content: '', category: 'company' });
    setFileRemoved(false);
    resetUploadState();
  };

  // ===== File Upload Handler =====

  const handleFileSelect = async (file) => {
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) {
      showToast?.(validation.error, 'error');
      return;
    }
    if (!apiKey) {
      showToast?.('API 키를 먼저 설정해 주세요. (콘텐츠 만들기 탭에서 설정 가능)', 'error');
      return;
    }

    setUploadFile(file);
    setUploadStep('extracting');
    setFileRemoved(false);

    try {
      const { text, fileType } = await extractTextFromFile(file);
      setExtractedRawText(text);
      setUploadStep('summarizing');
      const result = await summarizeDocumentForKB({ rawText: text, fileName: file.name, apiKey });
      setForm({
        title: result.title || file.name,
        category: result.category || form.category,
        content: result.summary || '',
      });
      setFileMetadata({
        fileName: file.name,
        fileType,
        extractedData: result.extractedData || null,
      });
      setUploadStep('done');
    } catch (err) {
      showToast?.(err.message || '파일 처리 중 오류가 발생했습니다.', 'error');
      // Restore previous state if editing with existing file
      if (editingId) {
        const entry = entries.find((e) => e.id === editingId);
        if (entry?.source === 'file' && !fileRemoved) {
          setFileMetadata({ fileName: entry.fileName, fileType: entry.fileType, extractedData: entry.extractedData });
          setUploadStep('done');
        } else {
          setUploadStep('idle');
        }
      } else {
        setUploadStep('idle');
      }
      setUploadFile(null);
    }
  };

  const handleReExtract = async () => {
    if (!extractedRawText || !apiKey) return;
    setUploadStep('summarizing');
    try {
      const result = await summarizeDocumentForKB({ rawText: extractedRawText, fileName: uploadFile?.name || fileMetadata?.fileName || 'file', apiKey });
      setForm({
        title: result.title || form.title,
        category: result.category || form.category,
        content: result.summary || '',
      });
      setFileMetadata((prev) => ({ ...prev, extractedData: result.extractedData || null }));
      setUploadStep('done');
    } catch (err) {
      showToast?.(err.message || 'AI 분석 중 오류가 발생했습니다.', 'error');
      setUploadStep('done');
    }
  };

  const handleRemoveFile = () => {
    if (editingId) {
      // Edit mode: mark file as removed, keep form content for manual editing
      setFileRemoved(true);
      setFileMetadata(null);
      setUploadStep('idle');
      setUploadFile(null);
      setExtractedRawText('');
    } else {
      // Add mode: reset form too
      resetUploadState();
      setForm({ title: '', content: '', category: 'company' });
    }
  };

  const fileUploadProps = {
    uploadStep,
    uploadFile,
    extractedRawText,
    fileMetadata,
    onFileSelect: handleFileSelect,
    onReExtract: handleReExtract,
    onRemoveFile: handleRemoveFile,
  };

  // ===== Render =====

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">지식 베이스</h2>
          <p className="text-[11px] text-mist mt-0.5">AI 콘텐츠 생성 시 자동으로 참조되는 회사/제품/기술 정보</p>
        </div>
        {!isAdding && !editingId && (
          <button onClick={startAdd}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
            + 항목 추가
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {CATEGORY_IDS.map((catId) => {
          const isAll = catId === 'all';
          const cat = KB_CATEGORIES[catId];
          const count = isAll ? entries.length : (catCounts[catId] || 0);
          return (
            <button key={catId} onClick={() => setFilterCat(catId)}
              className={`px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
                filterCat === catId ? 'bg-dark text-white border-dark' : 'bg-white text-slate border-pale hover:bg-snow'
              }`}>
              {isAll ? '전체' : `${cat.icon} ${cat.label}`} {count}
            </button>
          );
        })}
      </div>

      {/* Add / Edit form (shown at top) */}
      {(isAdding || editingId) && (
        <EntryForm
          form={form}
          setForm={setForm}
          onSubmit={isAdding ? handleAdd : handleUpdate}
          onCancel={resetForm}
          submitLabel={isAdding ? '추가' : '저장'}
          fileUpload={fileUploadProps}
        />
      )}

      {/* Entry cards — grouped or filtered */}
      {filterCat === 'all' ? (
        <div className="space-y-6">
          {Object.entries(KB_CATEGORIES).map(([catId, cat]) => {
            const catEntries = groupedEntries[catId];
            if (!catEntries || catEntries.length === 0) return null;
            return (
              <div key={catId}>
                {/* Category section header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[13px] font-bold text-slate">{cat.icon} {cat.label}</span>
                  <span className="text-[11px] text-mist">({catEntries.length})</span>
                  <div className="flex-1 h-px bg-pale" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {catEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedId === entry.id}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      onEdit={() => startEdit(entry)}
                      onDelete={() => handleDelete(entry.id)}
                      isEditing={editingId === entry.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {entries.length === 0 && (
            <div className="text-[13px] text-mist text-center py-8">등록된 항목이 없습니다.</div>
          )}
        </div>
      ) : (
        filtered.length === 0 ? (
          <div className="text-[13px] text-mist text-center py-8">
            {`${KB_CATEGORIES[filterCat]?.label} 카테고리에 등록된 항목이 없습니다.`}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                onEdit={() => startEdit(entry)}
                onDelete={() => handleDelete(entry.id)}
                isEditing={editingId === entry.id}
              />
            ))}
          </div>
        )
      )}

      {/* Info card */}
      <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
        <div className="text-[12px] font-bold text-accent mb-1">지식 베이스 활용 안내</div>
        <div className="text-[11px] text-steel leading-relaxed space-y-1">
          <div>- 여기 등록된 정보는 콘텐츠 팩토리 v2에서 AI가 자동으로 참조합니다.</div>
          <div>- 새 제품이 나오면 "제품 정보"에 추가하세요. 이후 모든 콘텐츠에 반영됩니다.</div>
          <div>- PDF/Word/Excel 파일을 업로드하면 AI가 자동으로 요약하여 저장합니다.</div>
          <div>- 잘못된 정보를 수정하면 이후 생성되는 모든 콘텐츠에 반영됩니다.</div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EntryCard — compact card for the grid layout
// =====================================================

function EntryCard({ entry, isExpanded, onToggle, onEdit, onDelete, isEditing }) {
  if (isEditing) return null; // Form is shown at top instead

  const cat = KB_CATEGORIES[entry.category];
  const isPlaceholder = entry.content.includes('(상세 미등록') || entry.content.includes('(미등록');

  return (
    <div className={`bg-white rounded-xl border overflow-hidden flex flex-col transition-colors ${
      isPlaceholder ? 'border-warning/30' : 'border-pale hover:border-silver'
    }`}>
      {/* Card body — clickable to expand */}
      <div className="p-4 flex-1 cursor-pointer" onClick={onToggle}>
        {/* Badges row */}
        {(entry.source === 'file' || isPlaceholder) && (
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {entry.source === 'file' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                📎 {entry.fileName}
              </span>
            )}
            {isPlaceholder && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                ⚠️ 상세 미등록
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <div className="text-[13px] font-bold text-slate leading-snug">{entry.title}</div>

        {/* Content preview or full */}
        <div className="text-[11px] text-steel mt-1.5 leading-relaxed whitespace-pre-wrap">
          {isExpanded
            ? entry.content
            : entry.content.length > 80
              ? entry.content.slice(0, 80) + '...'
              : entry.content}
        </div>

        {/* Expanded: show extracted data */}
        {isExpanded && entry.extractedData && (
          <ExtractedDataView data={entry.extractedData} />
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-pale bg-snow/50">
        <span className="text-[10px] text-mist">
          {new Date(entry.updatedAt).toLocaleDateString('ko-KR')}
        </span>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="px-2.5 py-1 rounded text-[11px] text-accent bg-transparent border-none cursor-pointer hover:bg-accent/10">
            편집
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="px-2.5 py-1 rounded text-[11px] text-danger bg-transparent border-none cursor-pointer hover:bg-danger/10">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EntryForm — add or edit, with file upload support
// =====================================================

function EntryForm({ form, setForm, onSubmit, onCancel, submitLabel, fileUpload }) {
  const fileRef = useRef(null);

  const step = fileUpload?.uploadStep || 'idle';
  const isProcessing = step === 'extracting' || step === 'summarizing';
  // Existing file from entry (edit mode, no new upload)
  const isExistingFile = step === 'done' && !fileUpload?.uploadFile && !!fileUpload?.fileMetadata;
  // Newly uploaded file
  const isNewFile = step === 'done' && !!fileUpload?.uploadFile;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) fileUpload?.onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
      <div className="text-[13px] font-bold">{submitLabel === '추가' ? '새 항목 추가' : '항목 편집'}</div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="block text-[11px] text-steel mb-1">제목</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="예: 토르RF 제품 상세"
            disabled={isProcessing}
            className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white disabled:bg-snow disabled:text-mist" />
        </div>
        <div>
          <label className="block text-[11px] text-steel mb-1">카테고리</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            disabled={isProcessing}
            className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer disabled:bg-snow disabled:text-mist">
            {Object.entries(KB_CATEGORIES).map(([id, cat]) => (
              <option key={id} value={id}>{cat.icon} {cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-steel mb-1">내용</label>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="회사/제품/기술에 대한 상세 정보를 입력하세요"
          rows={6}
          disabled={isProcessing}
          className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] leading-[1.6] outline-none focus:border-accent bg-white resize-y disabled:bg-snow disabled:text-mist" />
      </div>

      {/* ===== File Upload Area ===== */}
      {fileUpload && (
        <div className="border border-dashed border-pale rounded-lg p-4 space-y-3">
          <div className="text-[12px] font-semibold text-steel">📎 파일 첨부 (선택)</div>

          {/* Hidden file input (shared by all buttons) */}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.xls" onChange={handleFileChange} className="hidden" />

          {/* Idle: show file picker */}
          {step === 'idle' && (
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10 transition-colors">
                파일 선택
              </button>
              <span className="text-[11px] text-mist">PDF, Word(.docx), Excel(.xlsx) 지원 (최대 20MB)</span>
            </div>
          )}

          {/* Processing: extracting or summarizing */}
          {isProcessing && (
            <div className="space-y-3">
              {fileUpload.uploadFile && (
                <div className="flex items-center gap-3 bg-snow rounded-lg p-3">
                  <FileIcon name={fileUpload.uploadFile.name} />
                  <div>
                    <div className="text-[13px] font-semibold text-slate">{fileUpload.uploadFile.name}</div>
                    <div className="text-[11px] text-mist">{formatFileSize(fileUpload.uploadFile.size)}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <StepBadge label="텍스트 추출" active={step === 'extracting'} done={step === 'summarizing'} />
                <StepBadge label="AI 분석" active={step === 'summarizing'} done={false} />
              </div>
              <div className="flex items-center gap-3 py-2 justify-center">
                <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <span className="text-[13px] text-steel">
                  {step === 'extracting' ? '텍스트를 추출하는 중...' : 'AI가 문서를 분석하는 중...'}
                </span>
              </div>
            </div>
          )}

          {/* Done — existing file (edit mode, no re-upload) */}
          {isExistingFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-snow rounded-lg p-3 border border-pale">
                <div className="flex items-center gap-3">
                  <FileIcon name={fileUpload.fileMetadata.fileName} />
                  <div>
                    <div className="text-[13px] font-semibold text-slate">{fileUpload.fileMetadata.fileName}</div>
                    <div className="text-[11px] text-mist">기존 첨부파일</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => fileRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-accent bg-white border border-accent/20 cursor-pointer hover:bg-accent/5">
                    파일 교체
                  </button>
                  <button onClick={fileUpload.onRemoveFile}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-danger bg-white border border-danger/20 cursor-pointer hover:bg-danger/5">
                    파일 제거
                  </button>
                </div>
              </div>
              {fileUpload.fileMetadata?.extractedData && (
                <ExtractedDataView data={fileUpload.fileMetadata.extractedData} />
              )}
            </div>
          )}

          {/* Done — newly uploaded file */}
          {isNewFile && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-3">
                  <FileIcon name={fileUpload.uploadFile.name} />
                  <div>
                    <div className="text-[13px] font-semibold text-slate">{fileUpload.uploadFile.name}</div>
                    <div className="text-[11px] text-green-600">AI 분석 완료 — 위 필드에 결과가 반영되었습니다</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={fileUpload.onReExtract}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-steel bg-white border border-pale cursor-pointer hover:bg-snow">
                    다시 분석
                  </button>
                  <button onClick={fileUpload.onRemoveFile}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-danger bg-white border border-danger/20 cursor-pointer hover:bg-danger/5">
                    파일 제거
                  </button>
                </div>
              </div>
              {fileUpload.fileMetadata?.extractedData && (
                <ExtractedDataView data={fileUpload.fileMetadata.extractedData} />
              )}
              {fileUpload.extractedRawText && (
                <details className="text-[11px]">
                  <summary className="text-accent cursor-pointer font-semibold">
                    추출된 원문 보기 ({fileUpload.extractedRawText.length.toLocaleString()}자)
                  </summary>
                  <div className="mt-2 max-h-[200px] overflow-y-auto bg-snow rounded-lg p-3 text-steel whitespace-pre-wrap leading-relaxed text-[11px]">
                    {fileUpload.extractedRawText.slice(0, 5000)}
                    {fileUpload.extractedRawText.length > 5000 && '\n\n... (이하 생략)'}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
          취소
        </button>
        <button onClick={onSubmit} disabled={!form.title.trim() || !form.content.trim() || isProcessing}
          className={`px-5 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
            form.title.trim() && form.content.trim() && !isProcessing ? 'bg-accent text-white hover:bg-accent-dim' : 'bg-pale text-mist cursor-not-allowed'
          }`}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

// =====================================================
// Shared sub-components
// =====================================================

function FileIcon({ name }) {
  const icon = name.endsWith('.pdf') ? '📕' : name.endsWith('.docx') ? '📘' : '📗';
  return <span className="text-[20px]">{icon}</span>;
}

function StepBadge({ label, active, done }) {
  let cls = 'px-3 py-1.5 rounded-full text-[11px] font-semibold ';
  if (done) cls += 'bg-green-100 text-green-700';
  else if (active) cls += 'bg-accent/10 text-accent';
  else cls += 'bg-snow text-mist';
  return <span className={cls}>{done ? '✓ ' : ''}{label}</span>;
}

function ExtractedDataView({ data }) {
  if (!data) return null;
  const { keywords, keyFacts, numbers } = data;
  const hasContent = keywords?.length || keyFacts?.length || numbers?.length;
  if (!hasContent) return null;

  return (
    <div className="mt-2 bg-snow rounded-lg p-3 space-y-2">
      <div className="text-[11px] font-bold text-steel">추출 데이터</div>
      {keywords?.length > 0 && (
        <div>
          <span className="text-[10px] text-mist">키워드: </span>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {keywords.map((kw, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] bg-accent/10 text-accent">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {keyFacts?.length > 0 && (
        <div>
          <span className="text-[10px] text-mist">핵심 사실:</span>
          <ul className="mt-0.5 space-y-0.5">
            {keyFacts.map((f, i) => (
              <li key={i} className="text-[11px] text-steel">- {f}</li>
            ))}
          </ul>
        </div>
      )}
      {numbers?.length > 0 && (
        <div>
          <span className="text-[10px] text-mist">수치 데이터:</span>
          <ul className="mt-0.5 space-y-0.5">
            {numbers.map((n, i) => (
              <li key={i} className="text-[11px] text-steel">- {n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
