import { useState, useEffect, useRef } from 'react';
import { KB_CATEGORIES } from '../../constants/knowledgeBase';
import { validateFile, extractTextFromFile, formatFileSize } from '../../lib/fileExtract';
import { saveRawText, deleteRawText } from '../../lib/rawTextStorage';
import { summarizeDocumentForKB } from '../../lib/claude';
import { supabase } from '../../lib/supabase';
import {
  getAllBrandVoiceRules, saveBrandVoiceRule, updateBrandVoiceRule, deleteBrandVoiceRule,
  getAllFacts, saveFact, updateFact, deleteFact,
  getAllContentBlocks, saveContentBlock, deleteContentBlock,
} from '../../lib/supabaseData';

// =====================================================
// 상수
// =====================================================

const RULE_TYPE_LABELS = {
  banned_term: '🚫 금지어',
  preferred_term: '🎯 선호어',
  tone_rule: '🎨 톤/문체',
  structure_rule: '📐 구조',
  channel_specific: '📺 채널 특수',
};

const FACT_CATEGORY_LABELS = {
  company: '🏢 회사',
  product: '📦 제품',
  partnership: '🤝 파트너십',
  certification: '📋 인증',
  clinical: '🔬 임상',
  market: '📊 시장',
  personnel: '👤 인물',
  event: '📅 이벤트',
};

const BLOCK_CATEGORY_LABELS = {
  company_intro: '🏢 회사 소개',
  product_desc: '📦 제품 설명',
  partnership: '🤝 파트너십',
  certification: '📋 인증',
  market_data: '📊 시장 데이터',
  ceo_quote: '💬 대표 인용',
  boilerplate: '📰 보일러플레이트',
};

const CHANNEL_OPTIONS = [
  { value: '', label: '전체 (공통)' },
  { value: 'email', label: '이메일 뉴스레터' },
  { value: 'naver_blog', label: '네이버 블로그' },
  { value: 'kakao', label: '카카오톡' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'linkedin', label: '링크드인' },
];

// =====================================================
// Main Component
// =====================================================

export default function KnowledgeBase({ entries, setEntries, apiKey, setApiKey, showToast, tracker, onTokenUpdate }) {
  const [tab, setTab] = useState('rules');

  const tabs = [
    { id: 'rules', label: '보이스 규칙', icon: '📋' },
    { id: 'facts', label: '팩트 DB', icon: '📊' },
    { id: 'blocks', label: '콘텐츠 블록', icon: '🧩' },
    { id: 'legacy', label: '기존 KB', icon: '📚' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">지식 베이스</h2>
          <p className="text-[11px] text-mist mt-0.5">AI 콘텐츠 생성 시 자동으로 참조되는 규칙, 팩트, 콘텐츠 블록</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap border cursor-pointer transition-colors ${
              tab === t.id ? 'bg-dark text-white border-dark' : 'bg-white text-slate border-pale hover:bg-snow'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'rules' && <BrandVoiceSection showToast={showToast} />}
      {tab === 'facts' && <FactSection showToast={showToast} />}
      {tab === 'blocks' && <ContentBlockSection showToast={showToast} />}
      {tab === 'legacy' && (
        <LegacyKB entries={entries} setEntries={setEntries} apiKey={apiKey} setApiKey={setApiKey} showToast={showToast} />
      )}
    </div>
  );
}

// =====================================================
// 섹션 1: 브랜드 보이스 규칙
// =====================================================

function BrandVoiceSection({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState({ rule_type: 'banned_term', channel: '', rule_text: '', bad_example: '', good_example: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getAllBrandVoiceRules();
    setItems(data);
    setLoading(false);
  }

  function startAdd() {
    setEditing('new');
    setForm({ rule_type: 'banned_term', channel: '', rule_text: '', bad_example: '', good_example: '' });
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({
      rule_type: item.rule_type,
      channel: item.channel || '',
      rule_text: item.rule_text,
      bad_example: item.bad_example || '',
      good_example: item.good_example || '',
    });
  }

  async function handleSave() {
    if (!form.rule_text.trim()) return;
    const payload = {
      rule_type: form.rule_type,
      channel: form.channel || null,
      rule_text: form.rule_text.trim(),
      bad_example: form.bad_example.trim() || null,
      good_example: form.good_example.trim() || null,
      source: 'manual',
    };
    if (editing === 'new') {
      await saveBrandVoiceRule(payload);
      showToast?.('규칙이 추가되었습니다.');
    } else {
      await updateBrandVoiceRule(editing, payload);
      showToast?.('규칙이 수정되었습니다.');
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('이 규칙을 삭제하시겠습니까?')) return;
    await deleteBrandVoiceRule(id);
    showToast?.('규칙이 삭제되었습니다.', 'info');
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-steel">{items.length}개 규칙</span>
        {editing === null && (
          <button onClick={startAdd} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
            + 규칙 추가
          </button>
        )}
      </div>

      {/* Form */}
      {editing !== null && (
        <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
          <div className="text-[13px] font-bold">{editing === 'new' ? '규칙 추가' : '규칙 수정'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect label="유형" value={form.rule_type} onChange={v => setForm({ ...form, rule_type: v })}
              options={Object.entries(RULE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <FormSelect label="채널" value={form.channel} onChange={v => setForm({ ...form, channel: v })}
              options={CHANNEL_OPTIONS} />
          </div>
          <FormInput label="규칙 내용" value={form.rule_text} onChange={v => setForm({ ...form, rule_text: v })}
            placeholder="예: '뷰티 디바이스' 사용 금지" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput label="잘못된 예시 (선택)" value={form.bad_example} onChange={v => setForm({ ...form, bad_example: v })}
              placeholder="예: 뷰티 디바이스" />
            <FormInput label="올바른 예시 (선택)" value={form.good_example} onChange={v => setForm({ ...form, good_example: v })}
              placeholder="예: 메디컬 에스테틱 디바이스" />
          </div>
          <FormActions onCancel={() => setEditing(null)} onSave={handleSave} disabled={!form.rule_text.trim()} />
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-pale p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pale text-slate font-semibold">
                    {RULE_TYPE_LABELS[item.rule_type] || item.rule_type}
                  </span>
                  {item.channel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/10 text-info">
                      {CHANNEL_OPTIONS.find(c => c.value === item.channel)?.label || item.channel}
                    </span>
                  )}
                  <SourceBadge source={item.source} />
                </div>
                <div className="text-[13px] text-dark">{item.rule_text}</div>
                {(item.bad_example || item.good_example) && (
                  <div className="text-[11px] text-steel mt-1">
                    {item.bad_example && <span>X "{item.bad_example}"</span>}
                    {item.bad_example && item.good_example && <span> → </span>}
                    {item.good_example && <span>O "{item.good_example}"</span>}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <SmallBtn label="수정" onClick={() => startEdit(item)} color="accent" />
                <SmallBtn label="삭제" onClick={() => handleDelete(item.id)} color="danger" />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyMsg text="등록된 보이스 규칙이 없습니다." />}
      </div>
    </div>
  );
}

// =====================================================
// 섹션 2: 팩트 데이터베이스
// =====================================================

function FactSection({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: 'company', subject: '', fact_text: '', fact_pairs: '', valid_from: '', valid_until: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getAllFacts();
    setItems(data);
    setLoading(false);
  }

  function startAdd() {
    setEditing('new');
    setForm({ category: 'company', subject: '', fact_text: '', fact_pairs: '', valid_from: '', valid_until: '' });
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({
      category: item.category,
      subject: item.subject || '',
      fact_text: item.fact_text,
      fact_pairs: item.fact_pairs?.join(', ') || '',
      valid_from: item.valid_from || '',
      valid_until: item.valid_until || '',
    });
  }

  async function handleSave() {
    if (!form.fact_text.trim()) return;
    const pairs = form.fact_pairs.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      category: form.category,
      subject: form.subject.trim() || null,
      fact_text: form.fact_text.trim(),
      fact_pairs: pairs.length > 0 ? pairs : null,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    };
    if (editing === 'new') {
      await saveFact(payload);
      showToast?.('팩트가 추가되었습니다.');
    } else {
      await updateFact(editing, payload);
      showToast?.('팩트가 수정되었습니다.');
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('이 팩트를 삭제하시겠습니까?')) return;
    await deleteFact(id);
    showToast?.('팩트가 삭제되었습니다.', 'info');
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-steel">{items.length}개 팩트</span>
        {editing === null && (
          <button onClick={startAdd} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
            + 팩트 추가
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
          <div className="text-[13px] font-bold">{editing === 'new' ? '팩트 추가' : '팩트 수정'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect label="카테고리" value={form.category} onChange={v => setForm({ ...form, category: v })}
              options={Object.entries(FACT_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <FormInput label="주제" value={form.subject} onChange={v => setForm({ ...form, subject: v })}
              placeholder="예: 토르RF, 이신재" />
          </div>
          <FormInput label="팩트 내용" value={form.fact_text} onChange={v => setForm({ ...form, fact_text: v })}
            placeholder="예: 대표이사: 이신재" />
          <FormInput label="함께 사용할 정보 (쉼표 구분, 선택)" value={form.fact_pairs} onChange={v => setForm({ ...form, fact_pairs: v })}
            placeholder="예: FDA 승인, EBD 분류" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput label="유효 시작일 (선택)" value={form.valid_from} onChange={v => setForm({ ...form, valid_from: v })}
              placeholder="YYYY-MM-DD" />
            <FormInput label="유효 종료일 (선택)" value={form.valid_until} onChange={v => setForm({ ...form, valid_until: v })}
              placeholder="YYYY-MM-DD" />
          </div>
          <FormActions onCancel={() => setEditing(null)} onSave={handleSave} disabled={!form.fact_text.trim()} />
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-pale p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pale text-slate font-semibold">
                    {FACT_CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  {item.subject && (
                    <span className="text-[10px] text-steel">{item.subject}</span>
                  )}
                </div>
                <div className="text-[13px] text-dark">{item.fact_text}</div>
                {item.fact_pairs?.length > 0 && (
                  <div className="text-[11px] text-steel mt-1">함께 사용: {item.fact_pairs.join(', ')}</div>
                )}
                {(item.valid_from || item.valid_until) && (
                  <div className="text-[10px] text-mist mt-1">
                    유효기간: {item.valid_from || '~'} ~ {item.valid_until || '제한 없음'}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <SmallBtn label="수정" onClick={() => startEdit(item)} color="accent" />
                <SmallBtn label="삭제" onClick={() => handleDelete(item.id)} color="danger" />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyMsg text="등록된 팩트가 없습니다." />}
      </div>
    </div>
  );
}

// =====================================================
// 섹션 3: 콘텐츠 블록
// =====================================================

function ContentBlockSection({ showToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', body: '', category: 'company_intro', tags: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getAllContentBlocks();
    setItems(data);
    setLoading(false);
  }

  function startAdd() {
    setEditing('new');
    setForm({ label: '', body: '', category: 'company_intro', tags: '' });
  }

  function startEdit(item) {
    setEditing(item.id);
    setForm({
      label: item.label,
      body: item.body,
      category: item.category || 'company_intro',
      tags: item.tags?.join(', ') || '',
    });
  }

  async function handleSave() {
    if (!form.label.trim() || !form.body.trim()) return;
    const tags = form.tags.split(',').map(s => s.trim()).filter(Boolean);
    if (editing === 'new') {
      await saveContentBlock({
        label: form.label.trim(),
        body: form.body.trim(),
        category: form.category,
        tags: tags.length > 0 ? tags : null,
      });
      showToast?.('콘텐츠 블록이 추가되었습니다.');
    } else {
      // updateContentBlock not in supabaseData, use supabase directly
      if (supabase) {
        await supabase.from('content_blocks').update({
          label: form.label.trim(),
          body: form.body.trim(),
          category: form.category,
          tags: tags.length > 0 ? tags : null,
        }).eq('id', editing);
      }
      showToast?.('콘텐츠 블록이 수정되었습니다.');
    }
    setEditing(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('이 콘텐츠 블록을 삭제하시겠습니까?')) return;
    await deleteContentBlock(id);
    showToast?.('콘텐츠 블록이 삭제되었습니다.', 'info');
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-steel">{items.length}개 블록</span>
        {editing === null && (
          <button onClick={startAdd} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
            + 블록 추가
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
          <div className="text-[13px] font-bold">{editing === 'new' ? '블록 추가' : '블록 수정'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput label="블록 이름" value={form.label} onChange={v => setForm({ ...form, label: v })}
              placeholder="예: 회사 소개 보일러플레이트" />
            <FormSelect label="카테고리" value={form.category} onChange={v => setForm({ ...form, category: v })}
              options={Object.entries(BLOCK_CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          </div>
          <div>
            <label className="block text-[11px] text-steel mb-1">내용</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              placeholder="블록 내용을 입력하세요" rows={5}
              className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] leading-relaxed outline-none focus:border-accent bg-white resize-y" />
          </div>
          <FormInput label="태그 (쉼표 구분, 선택)" value={form.tags} onChange={v => setForm({ ...form, tags: v })}
            placeholder="예: 토르RF, 회사소개" />
          <FormActions onCancel={() => setEditing(null)} onSave={handleSave} disabled={!form.label.trim() || !form.body.trim()} />
        </div>
      )}

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-pale p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pale text-slate font-semibold">
                    {BLOCK_CATEGORY_LABELS[item.category] || item.category}
                  </span>
                  {item.use_count > 0 && (
                    <span className="text-[10px] text-mist">{item.use_count}회 사용</span>
                  )}
                </div>
                <div className="text-[13px] font-medium text-dark">{item.label}</div>
                <div className="text-[11px] text-steel mt-1 line-clamp-2">{item.body}</div>
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {item.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <SmallBtn label="수정" onClick={() => startEdit(item)} color="accent" />
                <SmallBtn label="삭제" onClick={() => handleDelete(item.id)} color="danger" />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyMsg text="등록된 콘텐츠 블록이 없습니다." />}
      </div>
    </div>
  );
}

// =====================================================
// 기존 KB (localStorage 기반)
// =====================================================

function LegacyKB({ entries, setEntries, apiKey, setApiKey, showToast }) {
  const [filterCat, setFilterCat] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'company' });
  const [expandedId, setExpandedId] = useState(null);
  const [uploadStep, setUploadStep] = useState('idle');
  const [uploadFile, setUploadFile] = useState(null);
  const [extractedRawText, setExtractedRawText] = useState('');
  const [fileMetadata, setFileMetadata] = useState(null);
  const [fileRemoved, setFileRemoved] = useState(false);

  const CATEGORY_IDS = ['all', ...Object.keys(KB_CATEGORIES)];

  const filtered = filterCat === 'all' ? entries : entries.filter(e => e.category === filterCat);
  const catCounts = {};
  for (const e of entries) catCounts[e.category] = (catCounts[e.category] || 0) + 1;
  const groupedEntries = {};
  for (const entry of entries) {
    if (!groupedEntries[entry.category]) groupedEntries[entry.category] = [];
    groupedEntries[entry.category].push(entry);
  }

  const handleAdd = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const entryId = fileMetadata ? `kb-file-${Date.now()}` : `kb-${Date.now()}`;
    const entry = {
      id: entryId, title: form.title.trim(), content: form.content.trim(),
      category: form.category, updatedAt: new Date().toISOString(),
      ...(fileMetadata && { source: 'file', fileName: fileMetadata.fileName, fileType: fileMetadata.fileType, extractedData: fileMetadata.extractedData }),
    };
    if (fileMetadata && extractedRawText) { try { saveRawText(entryId, extractedRawText); } catch {} }
    setEntries([entry, ...entries]);
    showToast?.('항목이 추가되었습니다.');
    resetForm();
  };

  const handleUpdate = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const existing = entries.find(e => e.id === editingId);
    const updated = { ...existing, title: form.title.trim(), content: form.content.trim(), category: form.category, updatedAt: new Date().toISOString() };
    if (fileMetadata && extractedRawText) {
      updated.source = 'file'; updated.fileName = fileMetadata.fileName; updated.fileType = fileMetadata.fileType; updated.extractedData = fileMetadata.extractedData;
      try { saveRawText(editingId, extractedRawText); } catch {}
    } else if (fileRemoved && existing?.source === 'file') {
      delete updated.source; delete updated.fileName; delete updated.fileType; delete updated.extractedData;
      try { deleteRawText(editingId); } catch {}
    }
    setEntries(entries.map(e => e.id === editingId ? updated : e));
    showToast?.('항목이 수정되었습니다.');
    resetForm();
  };

  const handleDelete = (id) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    setEntries(entries.filter(e => e.id !== id));
    try { deleteRawText(id); } catch {}
    if (editingId === id) resetForm();
  };

  const startEdit = (entry) => {
    setEditingId(entry.id); setForm({ title: entry.title, content: entry.content, category: entry.category });
    setIsAdding(false); setFileRemoved(false);
    if (entry.source === 'file') {
      setFileMetadata({ fileName: entry.fileName, fileType: entry.fileType, extractedData: entry.extractedData });
      setUploadStep('done'); setUploadFile(null); setExtractedRawText('');
    } else { resetUploadState(); }
  };

  const startAdd = () => { setIsAdding(true); setEditingId(null); setForm({ title: '', content: '', category: 'company' }); setFileRemoved(false); resetUploadState(); };
  const resetUploadState = () => { setUploadStep('idle'); setUploadFile(null); setExtractedRawText(''); setFileMetadata(null); };
  const resetForm = () => { setIsAdding(false); setEditingId(null); setForm({ title: '', content: '', category: 'company' }); setFileRemoved(false); resetUploadState(); };

  const handleFileSelect = async (file) => {
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) { showToast?.(validation.error, 'error'); return; }
    if (!apiKey) { showToast?.('API 키를 먼저 설정해 주세요.', 'error'); return; }
    setUploadFile(file); setUploadStep('extracting'); setFileRemoved(false);
    try {
      const { text, fileType } = await extractTextFromFile(file);
      setExtractedRawText(text); setUploadStep('summarizing');
      const result = await summarizeDocumentForKB({ rawText: text, fileName: file.name, apiKey, tracker });
      onTokenUpdate?.();
      setForm({ title: result.title || file.name, category: result.category || form.category, content: result.summary || '' });
      setFileMetadata({ fileName: file.name, fileType, extractedData: result.extractedData || null });
      setUploadStep('done');
    } catch (err) { showToast?.(err.message, 'error'); setUploadStep('idle'); setUploadFile(null); }
  };

  const handleRemoveFile = () => {
    if (editingId) { setFileRemoved(true); setFileMetadata(null); setUploadStep('idle'); setUploadFile(null); setExtractedRawText(''); }
    else { resetUploadState(); setForm({ title: '', content: '', category: 'company' }); }
  };

  const fileUploadProps = { uploadStep, uploadFile, extractedRawText, fileMetadata, onFileSelect: handleFileSelect, onRemoveFile: handleRemoveFile };
  const isProcessing = uploadStep === 'extracting' || uploadStep === 'summarizing';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-steel">{entries.length}개 항목</span>
        {!isAdding && !editingId && (
          <button onClick={startAdd} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">+ 항목 추가</button>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {CATEGORY_IDS.map(catId => {
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

      {(isAdding || editingId) && (
        <LegacyEntryForm form={form} setForm={setForm} onSubmit={isAdding ? handleAdd : handleUpdate}
          onCancel={resetForm} submitLabel={isAdding ? '추가' : '저장'} fileUpload={fileUploadProps} isProcessing={isProcessing} />
      )}

      <div className="space-y-2">
        {(filterCat === 'all' ? entries : filtered).map(entry => {
          if (editingId === entry.id) return null;
          const cat = KB_CATEGORIES[entry.category];
          return (
            <div key={entry.id} className="bg-white rounded-xl border border-pale p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {cat && <span className="text-[11px] px-2 py-0.5 rounded-full bg-pale text-slate font-semibold">{cat.icon} {cat.label}</span>}
                    {entry.source === 'file' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">📎 {entry.fileName}</span>}
                  </div>
                  <div className="text-[13px] font-bold text-slate">{entry.title}</div>
                  <div className="text-[11px] text-steel mt-1 whitespace-pre-wrap">
                    {expandedId === entry.id ? entry.content : (entry.content.length > 80 ? entry.content.slice(0, 80) + '...' : entry.content)}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <SmallBtn label="편집" onClick={() => startEdit(entry)} color="accent" />
                  <SmallBtn label="삭제" onClick={() => handleDelete(entry.id)} color="danger" />
                </div>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <EmptyMsg text="등록된 항목이 없습니다." />}
      </div>

      <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
        <div className="text-[12px] font-bold text-accent mb-1">기존 지식 베이스 안내</div>
        <div className="text-[11px] text-steel leading-relaxed space-y-1">
          <div>- 여기 등록된 정보는 보도자료 생성 시 AI가 자동으로 참조합니다.</div>
          <div>- PDF/Word/Excel 파일을 업로드하면 AI가 자동으로 요약하여 저장합니다.</div>
        </div>
      </div>
    </div>
  );
}

function LegacyEntryForm({ form, setForm, onSubmit, onCancel, submitLabel, fileUpload, isProcessing }) {
  const fileRef = useRef(null);
  const step = fileUpload?.uploadStep || 'idle';
  const handleFileChange = (e) => { const file = e.target.files?.[0]; if (file) fileUpload?.onFileSelect(file); e.target.value = ''; };

  return (
    <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
      <div className="text-[13px] font-bold">{submitLabel === '추가' ? '새 항목 추가' : '항목 편집'}</div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <FormInput label="제목" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="예: 토르RF 제품 상세" disabled={isProcessing} />
        <div>
          <label className="block text-[11px] text-steel mb-1">카테고리</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} disabled={isProcessing}
            className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer">
            {Object.entries(KB_CATEGORIES).map(([id, cat]) => <option key={id} value={id}>{cat.icon} {cat.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[11px] text-steel mb-1">내용</label>
        <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="상세 정보를 입력하세요"
          rows={5} disabled={isProcessing}
          className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] leading-relaxed outline-none focus:border-accent bg-white resize-y disabled:bg-snow disabled:text-mist" />
      </div>
      {fileUpload && (
        <div className="border border-dashed border-pale rounded-lg p-4">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
          {step === 'idle' && (
            <div className="flex items-center gap-3">
              <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">파일 선택</button>
              <span className="text-[11px] text-mist">PDF, Word, Excel (최대 20MB)</span>
            </div>
          )}
          {isProcessing && (
            <div className="flex items-center gap-3 py-2 justify-center">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span className="text-[13px] text-steel">{step === 'extracting' ? '텍스트 추출 중...' : 'AI 분석 중...'}</span>
            </div>
          )}
          {step === 'done' && fileUpload.fileMetadata && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate">📎 {fileUpload.fileMetadata.fileName}</span>
              <button onClick={fileUpload.onRemoveFile} className="text-[11px] text-danger cursor-pointer bg-transparent border-none hover:underline">파일 제거</button>
            </div>
          )}
        </div>
      )}
      <FormActions onCancel={onCancel} onSave={onSubmit} disabled={!form.title.trim() || !form.content.trim() || isProcessing} label={submitLabel} />
    </div>
  );
}

// =====================================================
// 공통 UI 컴포넌트
// =====================================================

function FormInput({ label, value, onChange, placeholder, disabled }) {
  return (
    <div>
      <label className="block text-[11px] text-steel mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white disabled:bg-snow disabled:text-mist" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] text-steel mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

function FormActions({ onCancel, onSave, disabled, label }) {
  return (
    <div className="flex gap-2 justify-end">
      <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">취소</button>
      <button onClick={onSave} disabled={disabled}
        className={`px-5 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
          !disabled ? 'bg-accent text-white hover:bg-accent-dim' : 'bg-pale text-mist cursor-not-allowed'
        }`}>
        {label || '저장'}
      </button>
    </div>
  );
}

function SourceBadge({ source }) {
  if (source === 'learned') return <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">AI 학습</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-info/15 text-info font-semibold">직접 추가</span>;
}

function SmallBtn({ label, onClick, color }) {
  const cls = color === 'danger'
    ? 'text-danger hover:bg-danger/10'
    : 'text-accent hover:bg-accent/10';
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded text-[11px] bg-transparent border-none cursor-pointer ${cls}`}>
      {label}
    </button>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12 text-steel text-sm">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mr-3" />
      로딩 중...
    </div>
  );
}

function EmptyMsg({ text }) {
  return <div className="text-xs text-mist py-6 text-center">{text}</div>;
}
