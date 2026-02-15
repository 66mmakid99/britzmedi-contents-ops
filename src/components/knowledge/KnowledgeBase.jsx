import { useState } from 'react';
import { KB_CATEGORIES } from '../../constants/knowledgeBase';

const CATEGORY_IDS = ['all', ...Object.keys(KB_CATEGORIES)];

export default function KnowledgeBase({ entries, setEntries }) {
  const [filterCat, setFilterCat] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'company' });
  const [expandedId, setExpandedId] = useState(null);

  const filtered = filterCat === 'all'
    ? entries
    : entries.filter((e) => e.category === filterCat);

  const handleAdd = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const entry = {
      id: `kb-${Date.now()}`,
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      updatedAt: new Date().toISOString(),
    };
    setEntries([entry, ...entries]);
    setForm({ title: '', content: '', category: 'company' });
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setEntries(entries.map((e) =>
      e.id === editingId
        ? { ...e, title: form.title.trim(), content: form.content.trim(), category: form.category, updatedAt: new Date().toISOString() }
        : e
    ));
    setEditingId(null);
    setForm({ title: '', content: '', category: 'company' });
  };

  const handleDelete = (id) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    setEntries(entries.filter((e) => e.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm({ title: '', content: '', category: 'company' });
    }
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setForm({ title: '', content: '', category: 'company' });
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ title: '', content: '', category: 'company' });
  };

  const catCounts = {};
  for (const e of entries) {
    catCounts[e.category] = (catCounts[e.category] || 0) + 1;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">지식 베이스</h2>
          <p className="text-[11px] text-mist mt-0.5">AI 콘텐츠 생성 시 자동으로 참조되는 회사/제품/기술 정보</p>
        </div>
        <button onClick={startAdd}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-accent border-none cursor-pointer hover:bg-accent-dim">
          + 항목 추가
        </button>
      </div>

      {/* Category filter */}
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
              {isAll ? '전체' : `${cat.icon} ${cat.label}`} ({count})
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {isAdding && (
        <EntryForm
          form={form}
          setForm={setForm}
          onSubmit={handleAdd}
          onCancel={cancelForm}
          submitLabel="추가"
        />
      )}

      {/* Entry list */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-[13px] text-mist text-center py-8">
            {filterCat === 'all' ? '등록된 항목이 없습니다.' : `${KB_CATEGORIES[filterCat]?.label} 카테고리에 등록된 항목이 없습니다.`}
          </div>
        )}
        {filtered.map((entry) => {
          const cat = KB_CATEGORIES[entry.category];
          const isEditing = editingId === entry.id;
          const isExpanded = expandedId === entry.id;

          if (isEditing) {
            return (
              <EntryForm
                key={entry.id}
                form={form}
                setForm={setForm}
                onSubmit={handleUpdate}
                onCancel={cancelForm}
                submitLabel="저장"
              />
            );
          }

          return (
            <div key={entry.id} className="bg-white rounded-xl border border-pale overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-snow text-steel border border-pale">
                        {cat?.icon} {cat?.label}
                      </span>
                      <span className="text-[10px] text-mist">
                        {new Date(entry.updatedAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <div className="text-[13px] font-bold text-slate">{entry.title}</div>
                    <div
                      className="text-[12px] text-steel mt-1.5 leading-relaxed whitespace-pre-wrap cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    >
                      {isExpanded ? entry.content : (entry.content.length > 120 ? entry.content.slice(0, 120) + '...' : entry.content)}
                    </div>
                    {entry.content.length > 120 && (
                      <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="text-[11px] text-accent border-none bg-transparent cursor-pointer mt-1 hover:underline">
                        {isExpanded ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(entry)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] text-accent bg-accent/5 border border-accent/20 cursor-pointer hover:bg-accent/10">
                      편집
                    </button>
                    <button onClick={() => handleDelete(entry.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] text-danger bg-danger/5 border border-danger/20 cursor-pointer hover:bg-danger/10">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info card */}
      <div className="bg-accent/5 rounded-xl p-4 border border-accent/20">
        <div className="text-[12px] font-bold text-accent mb-1">지식 베이스 활용 안내</div>
        <div className="text-[11px] text-steel leading-relaxed space-y-1">
          <div>- 여기 등록된 정보는 콘텐츠 팩토리 v2에서 AI가 자동으로 참조합니다.</div>
          <div>- 새 제품이 나오면 "제품 정보"에 추가하세요. 이후 모든 콘텐츠에 반영됩니다.</div>
          <div>- 잘못된 정보를 수정하면 이후 생성되는 모든 콘텐츠에 반영됩니다.</div>
        </div>
      </div>
    </div>
  );
}

function EntryForm({ form, setForm, onSubmit, onCancel, submitLabel }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-accent/30 space-y-3">
      <div className="text-[13px] font-bold">{submitLabel === '추가' ? '새 항목 추가' : '항목 편집'}</div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
        <div>
          <label className="block text-[11px] text-steel mb-1">제목</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="예: 토르RF 제품 상세"
            className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white" />
        </div>
        <div>
          <label className="block text-[11px] text-steel mb-1">카테고리</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] outline-none focus:border-accent bg-white cursor-pointer">
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
          className="w-full px-3 py-2 rounded-lg border border-pale text-[13px] leading-[1.6] outline-none focus:border-accent bg-white resize-y" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[13px] text-slate border border-pale bg-white cursor-pointer hover:bg-snow">
          취소
        </button>
        <button onClick={onSubmit} disabled={!form.title.trim() || !form.content.trim()}
          className={`px-5 py-2 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-colors ${
            form.title.trim() && form.content.trim() ? 'bg-accent text-white hover:bg-accent-dim' : 'bg-pale text-mist cursor-not-allowed'
          }`}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
