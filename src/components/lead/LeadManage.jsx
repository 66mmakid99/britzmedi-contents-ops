import { useState, useEffect } from 'react';
import {
  getContactInquiries, saveContactInquiry, updateInquiryStatus, convertInquiryToLead,
  getLeads, getLead, saveLead, deleteLead, updateLeadStatus, addLeadActivity, getLeadStats,
} from '../../lib/supabaseAdmin';

const LEAD_STAGES = [
  { id: 'new', label: '신규', emoji: '🆕', color: 'bg-info/15 text-info' },
  { id: 'contacted', label: '연락완료', emoji: '📞', color: 'bg-accent-light text-accent-dim' },
  { id: 'qualified', label: '적격', emoji: '✅', color: 'bg-success/15 text-success' },
  { id: 'proposal', label: '제안', emoji: '📋', color: 'bg-warn/15 text-warn' },
  { id: 'negotiation', label: '협상', emoji: '🤝', color: 'bg-accent-light text-accent-dim' },
  { id: 'won', label: '성사', emoji: '🎉', color: 'bg-success/15 text-success' },
  { id: 'lost', label: '실패', emoji: '❌', color: 'bg-danger/15 text-danger' },
];

const INQUIRY_TYPES = {
  demo: { label: '데모 신청', emoji: '🖥️' },
  consult: { label: '제품 상담', emoji: '💬' },
  catalog: { label: '자료 요청', emoji: '📄' },
  partnership: { label: '파트너십', emoji: '🤝' },
  support: { label: '기술 지원', emoji: '🔧' },
  general: { label: '일반 문의', emoji: '📩' },
};

const INQUIRY_STATUS = {
  new: { label: '신규', color: 'bg-info/15 text-info' },
  in_progress: { label: '처리중', color: 'bg-warn/15 text-warn' },
  responded: { label: '답변완료', color: 'bg-success/15 text-success' },
  closed: { label: '종료', color: 'bg-pale text-steel' },
};

const SOURCE_LABELS = {
  contact_form: '문의폼', chatbot: '챗봇', email: '이메일',
  phone: '전화', linkedin: '링크드인', website: '웹사이트',
};

export default function LeadManage({ showToast }) {
  const [tab, setTab] = useState('pipeline');
  const [stats, setStats] = useState(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const s = await getLeadStats();
    setStats(s);
  }

  const tabs = [
    { id: 'pipeline', label: '리드 파이프라인' },
    { id: 'inquiries', label: '문의 접수' },
    { id: 'add', label: '+ 리드/문의 추가' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">리드 관리</h2>

      {/* 통계 */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <StatCard label="전체 리드" value={stats.total} icon="👤" />
          <StatCard label="신규" value={stats.new} icon="🆕" />
          <StatCard label="진행중" value={(stats.contacted || 0) + (stats.qualified || 0) + (stats.proposal || 0) + (stats.negotiation || 0)} icon="🔄" />
          <StatCard label="성사" value={stats.won} icon="🎉" />
          <StatCard label="전체 문의" value={stats.inquiries} icon="📩" />
          <StatCard label="미처리 문의" value={stats.newInquiries} icon="🔴" />
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 bg-pale rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 text-[12px] font-medium rounded-md border-none cursor-pointer transition-colors ${
              tab === t.id ? 'bg-white text-dark shadow-sm' : 'bg-transparent text-steel hover:text-slate'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && <LeadPipeline showToast={showToast} onStatsUpdate={loadStats} />}
      {tab === 'inquiries' && <InquiryList showToast={showToast} onStatsUpdate={loadStats} />}
      {tab === 'add' && <AddForm showToast={showToast} onStatsUpdate={loadStats} setTab={setTab} />}
    </div>
  );
}

// =====================================================
// 리드 파이프라인
// =====================================================

function LeadPipeline({ showToast, onStatsUpdate }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const data = await getLeads({ status: statusFilter });
    setLeads(data);
    setLoading(false);
  }

  async function openLead(lead) {
    const detail = await getLead(lead.id);
    setSelectedLead(detail);
  }

  async function handleStatusChange(id, newStatus) {
    await updateLeadStatus(id, newStatus);
    showToast?.('상태 변경됨');
    load();
    onStatsUpdate?.();
    if (selectedLead?.id === id) {
      const detail = await getLead(id);
      setSelectedLead(detail);
    }
  }

  async function handleAddNote(leadId, note) {
    await addLeadActivity(leadId, 'note', note);
    const detail = await getLead(leadId);
    setSelectedLead(detail);
  }

  async function handleDeleteLead(id) {
    if (!window.confirm('리드를 삭제하시겠습니까?')) return;
    await deleteLead(id);
    showToast?.('삭제됨', 'info');
    setSelectedLead(null);
    load();
    onStatsUpdate?.();
  }

  return (
    <div className="space-y-3">
      {/* 스테이지 필터 */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
            statusFilter === 'all' ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-silver'
          }`}
        >
          전체
        </button>
        {LEAD_STAGES.map(s => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              statusFilter === s.id ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-silver'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-4">
        {/* 리드 목록 */}
        <div className="bg-white rounded-xl border border-pale overflow-hidden">
          <div className="max-h-[550px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-mist py-12 text-[13px]">로딩중...</div>
            ) : leads.length === 0 ? (
              <div className="text-center text-mist py-12 text-[13px]">리드가 없습니다</div>
            ) : leads.map(lead => {
              const stage = LEAD_STAGES.find(s => s.id === lead.status);
              return (
                <div
                  key={lead.id}
                  onClick={() => openLead(lead)}
                  className={`p-3 border-b border-pale cursor-pointer hover:bg-snow transition-colors ${
                    selectedLead?.id === lead.id ? 'bg-snow border-l-2 border-l-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">{lead.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage?.color || ''}`}>
                      {stage?.emoji} {stage?.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-steel">
                    {lead.company && `${lead.company} · `}
                    {lead.country || ''}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      {lead.score > 0 && (
                        <span className="text-[10px] font-bold text-accent">점수 {lead.score}</span>
                      )}
                      {lead.deal_value && (
                        <span className="text-[10px] text-steel">{lead.deal_value}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-mist">
                      {new Date(lead.created_at).toLocaleDateString('ko')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 리드 상세 */}
        {selectedLead ? (
          <LeadDetail
            lead={selectedLead}
            onStatusChange={handleStatusChange}
            onAddNote={handleAddNote}
            onDelete={handleDeleteLead}
            onUpdate={async (updated) => {
              const saved = await saveLead(updated);
              if (saved) {
                showToast?.('저장됨');
                load();
                const detail = await getLead(saved.id);
                setSelectedLead(detail);
                onStatsUpdate?.();
              }
            }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-pale flex items-center justify-center h-[550px] text-mist text-[13px]">
            리드를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 리드 상세
// =====================================================

function LeadDetail({ lead, onStatusChange, onAddNote, onDelete, onUpdate }) {
  const [noteText, setNoteText] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const stage = LEAD_STAGES.find(s => s.id === lead.status);

  function startEdit() {
    setForm({ ...lead });
    setEditing(true);
  }

  return (
    <div className="bg-white rounded-xl border border-pale overflow-hidden flex flex-col h-[550px]">
      {/* 헤더 */}
      <div className="p-4 border-b border-pale bg-snow">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[15px] font-bold">{lead.name}</h3>
            <div className="text-[12px] text-steel">
              {lead.company && `${lead.company} · `}
              {lead.position && `${lead.position} · `}
              {lead.country || ''}
            </div>
          </div>
          <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${stage?.color || ''}`}>
            {stage?.emoji} {stage?.label}
          </span>
        </div>

        {/* 연락처 */}
        <div className="flex gap-4 text-[11px] text-steel mt-1">
          {lead.email && <span>📧 {lead.email}</span>}
          {lead.phone && <span>📱 {lead.phone}</span>}
          {lead.website && <span>🌐 {lead.website}</span>}
        </div>

        {/* 관심 제품 */}
        {lead.interested_products?.length > 0 && (
          <div className="flex gap-1 mt-2">
            {lead.interested_products.map((p, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-accent-light text-accent-dim rounded-full">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* 상태 변경 + 액션 */}
      <div className="p-3 border-b border-pale">
        <div className="flex gap-1 flex-wrap items-center">
          <span className="text-[11px] text-steel mr-1">상태:</span>
          {LEAD_STAGES.filter(s => s.id !== lead.status).map(s => (
            <button
              key={s.id}
              onClick={() => onStatusChange(lead.id, s.id)}
              className="text-[10px] px-2 py-0.5 rounded border border-silver bg-white text-steel cursor-pointer hover:border-accent hover:text-accent transition-colors"
            >
              {s.emoji} {s.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={startEdit}
            className="text-[11px] px-2 py-1 bg-info/15 text-info rounded border-none cursor-pointer"
          >
            정보 수정
          </button>
          <button
            onClick={() => onDelete(lead.id)}
            className="text-[11px] px-2 py-1 bg-danger/15 text-danger rounded border-none cursor-pointer"
          >
            삭제
          </button>
        </div>

        {/* 점수 + 거래가치 */}
        <div className="flex gap-4 mt-2 text-[11px]">
          <span className="text-steel">리드 점수: <strong className="text-accent">{lead.score || 0}</strong>/100</span>
          {lead.deal_value && <span className="text-steel">거래가치: <strong>{lead.deal_value}</strong></span>}
          <span className="text-steel">출처: {SOURCE_LABELS[lead.source] || lead.source}</span>
        </div>

        {/* 다음 액션 */}
        {lead.next_action && (
          <div className="mt-2 text-[11px] bg-warn/10 text-warn px-2 py-1 rounded">
            📌 다음 액션: {lead.next_action}
            {lead.next_action_date && ` (${lead.next_action_date})`}
          </div>
        )}

        {/* 메모 */}
        {lead.notes && (
          <div className="mt-2 text-[12px] text-slate bg-snow rounded p-2">
            {lead.notes}
          </div>
        )}
      </div>

      {/* 활동 기록 */}
      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="text-[12px] font-bold text-steel mb-2">활동 기록</h4>
        {(lead.activities || []).length === 0 ? (
          <div className="text-[12px] text-mist">활동 기록이 없습니다</div>
        ) : (lead.activities || []).map(a => (
          <div key={a.id} className="flex gap-2 mb-2">
            <div className="text-[11px] mt-0.5">
              {a.type === 'note' ? '📝' : a.type === 'email' ? '📧' : a.type === 'call' ? '📞' : a.type === 'meeting' ? '🤝' : '🔄'}
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-slate">{a.description}</div>
              <div className="text-[10px] text-mist">{new Date(a.created_at).toLocaleString('ko')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 메모 입력 */}
      <div className="p-3 border-t border-pale">
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="활동 메모 추가..."
            className="flex-1 border border-silver rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-accent"
            onKeyDown={e => {
              if (e.key === 'Enter' && noteText.trim()) {
                onAddNote(lead.id, noteText.trim());
                setNoteText('');
              }
            }}
          />
          <button
            onClick={() => { if (noteText.trim()) { onAddNote(lead.id, noteText.trim()); setNoteText(''); } }}
            className="px-3 py-1.5 text-[12px] bg-dark text-white rounded-lg border-none cursor-pointer hover:bg-charcoal"
          >
            추가
          </button>
        </div>
      </div>

      {/* 수정 모달 */}
      {editing && (
        <LeadEditModal
          form={form}
          setForm={setForm}
          onSave={() => { onUpdate(form); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// =====================================================
// 리드 수정 모달
// =====================================================

function LeadEditModal({ form, setForm, onSave, onClose }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-full max-w-[500px] mx-4 shadow-lg">
        <div className="p-4 border-b border-pale flex items-center justify-between">
          <h3 className="text-[14px] font-bold">리드 정보 수정</h3>
          <button onClick={onClose} className="text-steel text-lg border-none bg-transparent cursor-pointer">✕</button>
        </div>
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <Field label="이름 *" value={form.name} onChange={v => set('name', v)} />
          <Field label="이메일" value={form.email} onChange={v => set('email', v)} />
          <Field label="전화번호" value={form.phone} onChange={v => set('phone', v)} />
          <Field label="회사" value={form.company} onChange={v => set('company', v)} />
          <Field label="웹사이트" value={form.website} onChange={v => set('website', v)} />
          <Field label="직책" value={form.position} onChange={v => set('position', v)} />
          <Field label="국가" value={form.country} onChange={v => set('country', v)} />
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">리드 점수 (0~100)</label>
            <input
              type="number"
              min={0} max={100}
              value={form.score || 0}
              onChange={e => set('score', parseInt(e.target.value) || 0)}
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <Field label="거래 가치" value={form.deal_value} onChange={v => set('deal_value', v)} placeholder="예: $50,000" />
          <Field label="다음 액션" value={form.next_action} onChange={v => set('next_action', v)} />
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">다음 액션 날짜</label>
            <input
              type="date"
              value={form.next_action_date || ''}
              onChange={e => set('next_action_date', e.target.value)}
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">메모</label>
            <textarea
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end p-4 border-t border-pale">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-steel bg-pale rounded-lg border-none cursor-pointer">취소</button>
          <button onClick={onSave} className="px-4 py-2 text-[13px] text-white bg-dark rounded-lg border-none cursor-pointer">저장</button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 문의 접수 목록
// =====================================================

function InquiryList({ showToast, onStatsUpdate }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInq, setSelectedInq] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const data = await getContactInquiries({ status: statusFilter });
    setInquiries(data);
    setLoading(false);
  }

  async function handleStatusChange(id, status) {
    await updateInquiryStatus(id, status);
    showToast?.('상태 변경됨');
    load();
    onStatsUpdate?.();
  }

  async function handleConvert(id) {
    const lead = await convertInquiryToLead(id);
    if (lead) {
      showToast?.('리드로 전환되었습니다');
      load();
      onStatsUpdate?.();
    }
  }

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex gap-2">
        {Object.entries({ all: '전체', ...Object.fromEntries(Object.entries(INQUIRY_STATUS).map(([k, v]) => [k, v.label])) }).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
              statusFilter === k ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-silver'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
        {/* 문의 목록 */}
        <div className="bg-white rounded-xl border border-pale overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-mist py-12 text-[13px]">로딩중...</div>
            ) : inquiries.length === 0 ? (
              <div className="text-center text-mist py-12 text-[13px]">문의가 없습니다</div>
            ) : inquiries.map(inq => {
              const typeInfo = INQUIRY_TYPES[inq.inquiry_type] || INQUIRY_TYPES.general;
              const statusBadge = INQUIRY_STATUS[inq.status] || INQUIRY_STATUS.new;
              return (
                <div
                  key={inq.id}
                  onClick={() => setSelectedInq(inq)}
                  className={`p-3 border-b border-pale cursor-pointer hover:bg-snow transition-colors ${
                    selectedInq?.id === inq.id ? 'bg-snow border-l-2 border-l-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">{inq.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-steel">
                    {typeInfo.emoji} {typeInfo.label}
                    {inq.company && ` · ${inq.company}`}
                    {inq.country && ` · ${inq.country}`}
                  </div>
                  <div className="text-[11px] text-mist mt-1 truncate">{inq.message || '(메시지 없음)'}</div>
                  <div className="text-[10px] text-mist mt-1">
                    {SOURCE_LABELS[inq.source] || inq.source} · {new Date(inq.created_at).toLocaleDateString('ko')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 문의 상세 */}
        {selectedInq ? (
          <div className="bg-white rounded-xl border border-pale overflow-hidden">
            <div className="p-4 border-b border-pale bg-snow">
              <h3 className="text-[14px] font-bold">{selectedInq.name}</h3>
              <div className="text-[12px] text-steel mt-1">
                {selectedInq.company && `${selectedInq.company} · `}
                {selectedInq.position && `${selectedInq.position} · `}
                {selectedInq.country || ''}
              </div>
              <div className="flex gap-3 text-[11px] text-steel mt-2">
                {selectedInq.email && <span>📧 {selectedInq.email}</span>}
                {selectedInq.phone && <span>📱 {selectedInq.phone}</span>}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* 유형 + 관심제품 */}
              <div className="flex gap-2 flex-wrap text-[11px]">
                <span className="px-2 py-0.5 bg-info/10 text-info rounded-full">
                  {INQUIRY_TYPES[selectedInq.inquiry_type]?.emoji} {INQUIRY_TYPES[selectedInq.inquiry_type]?.label}
                </span>
                {selectedInq.interested_product && (
                  <span className="px-2 py-0.5 bg-accent-light text-accent-dim rounded-full">
                    관심: {selectedInq.interested_product}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-pale text-steel rounded-full">
                  {SOURCE_LABELS[selectedInq.source]}
                </span>
              </div>

              {/* 메시지 */}
              {selectedInq.message && (
                <div className="bg-snow rounded-lg p-3 text-[13px] text-slate whitespace-pre-wrap">
                  {selectedInq.message}
                </div>
              )}

              {/* 메모 */}
              {selectedInq.notes && (
                <div className="text-[12px] text-steel">
                  <span className="font-medium">메모:</span> {selectedInq.notes}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="flex gap-2 flex-wrap pt-2">
                {selectedInq.status === 'new' && (
                  <button
                    onClick={() => handleStatusChange(selectedInq.id, 'in_progress')}
                    className="text-[12px] px-3 py-1.5 bg-warn/15 text-warn rounded-lg border-none cursor-pointer"
                  >
                    처리 시작
                  </button>
                )}
                {selectedInq.status !== 'responded' && selectedInq.status !== 'closed' && (
                  <button
                    onClick={() => handleStatusChange(selectedInq.id, 'responded')}
                    className="text-[12px] px-3 py-1.5 bg-success/15 text-success rounded-lg border-none cursor-pointer"
                  >
                    답변 완료
                  </button>
                )}
                {selectedInq.status !== 'closed' && (
                  <button
                    onClick={() => handleConvert(selectedInq.id)}
                    className="text-[12px] px-3 py-1.5 bg-dark text-white rounded-lg border-none cursor-pointer hover:bg-charcoal"
                  >
                    🔄 리드로 전환
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-pale flex items-center justify-center h-[500px] text-mist text-[13px]">
            문의를 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// 리드/문의 추가 폼
// =====================================================

function AddForm({ showToast, onStatsUpdate, setTab }) {
  const [mode, setMode] = useState('lead');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.name?.trim()) { alert('이름을 입력하세요'); return; }
    setSaving(true);
    if (mode === 'lead') {
      const saved = await saveLead({
        ...form,
        interested_products: form.interested_products_text
          ? form.interested_products_text.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });
      if (saved) {
        showToast?.('리드가 추가되었습니다');
        setForm({});
        onStatsUpdate?.();
        setTab('pipeline');
      }
    } else {
      const saved = await saveContactInquiry(form);
      if (saved) {
        showToast?.('문의가 등록되었습니다');
        setForm({});
        onStatsUpdate?.();
        setTab('inquiries');
      }
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {/* 모드 토글 */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('lead'); setForm({}); }}
          className={`text-[13px] px-4 py-2 rounded-lg border cursor-pointer ${
            mode === 'lead' ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-silver'
          }`}
        >
          👤 리드 직접 추가
        </button>
        <button
          onClick={() => { setMode('inquiry'); setForm({}); }}
          className={`text-[13px] px-4 py-2 rounded-lg border cursor-pointer ${
            mode === 'inquiry' ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-silver'
          }`}
        >
          📩 문의 등록
        </button>
      </div>

      <div className="bg-white rounded-xl border border-pale p-4 space-y-3">
        <Field label="이름 *" value={form.name} onChange={v => set('name', v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="이메일" value={form.email} onChange={v => set('email', v)} />
          <Field label="전화번호" value={form.phone} onChange={v => set('phone', v)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="회사" value={form.company} onChange={v => set('company', v)} />
          <Field label="국가" value={form.country} onChange={v => set('country', v)} />
        </div>
        <Field label="직책" value={form.position} onChange={v => set('position', v)} />

        {mode === 'lead' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="웹사이트" value={form.website} onChange={v => set('website', v)} />
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">출처</label>
                <select
                  value={form.source || 'contact_form'}
                  onChange={e => set('source', e.target.value)}
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <Field label="관심 제품 (쉼표 구분)" value={form.interested_products_text} onChange={v => set('interested_products_text', v)} placeholder="토르RF, TORR RF" />
            <Field label="거래 가치" value={form.deal_value} onChange={v => set('deal_value', v)} placeholder="예: $50,000" />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">문의 유형</label>
                <select
                  value={form.inquiry_type || 'general'}
                  onChange={e => set('inquiry_type', e.target.value)}
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
                >
                  {Object.entries(INQUIRY_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">유입 경로</label>
                <select
                  value={form.source || 'contact_form'}
                  onChange={e => set('source', e.target.value)}
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
                >
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <Field label="관심 제품" value={form.interested_product} onChange={v => set('interested_product', v)} />
            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">문의 내용</label>
              <textarea
                value={form.message || ''}
                onChange={e => set('message', e.target.value)}
                rows={4}
                placeholder="문의 내용"
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-[12px] font-medium text-steel mb-1">메모</label>
          <textarea
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-dark rounded-lg border-none cursor-pointer hover:bg-charcoal disabled:opacity-50"
          >
            {saving ? '저장 중...' : mode === 'lead' ? '리드 추가' : '문의 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 공통 컴포넌트
// =====================================================

function Field({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-steel mb-1">{label}</label>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
      />
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-pale p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-xl font-bold text-dark">{value}</div>
      <div className="text-[11px] text-steel">{label}</div>
    </div>
  );
}
