import { useState, useEffect } from 'react';
import {
  getChatbotConversations, getChatbotConversation, updateConversationStatus,
  getChatbotStats, getChatbotFaq, saveFaq, deleteFaq,
  getChatbotSettings, updateChatbotSetting,
} from '../../lib/supabaseAdmin';

const STATUS_BADGES = {
  active: { label: '진행중', color: 'bg-info/15 text-info' },
  resolved: { label: '해결됨', color: 'bg-success/15 text-success' },
  escalated: { label: '에스컬레이션', color: 'bg-danger/15 text-danger' },
};

export default function ChatbotManage({ showToast }) {
  const [tab, setTab] = useState('conversations');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const s = await getChatbotStats();
    setStats(s);
    setLoading(false);
  }

  const tabs = [
    { id: 'conversations', label: '대화 내역' },
    { id: 'faq', label: 'FAQ 관리' },
    { id: 'settings', label: '챗봇 설정' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">챗봇 관리</h2>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="전체 대화" value={stats.total} icon="💬" />
          <StatCard label="진행중" value={stats.active} icon="🔵" />
          <StatCard label="해결됨" value={stats.resolved} icon="✅" />
          <StatCard label="에스컬레이션" value={stats.escalated} icon="🔴" />
          <StatCard label="평균 만족도" value={stats.avgSatisfaction} icon="⭐" />
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

      {tab === 'conversations' && <ConversationList showToast={showToast} onStatsUpdate={loadStats} />}
      {tab === 'faq' && <FaqManager showToast={showToast} />}
      {tab === 'settings' && <SettingsPanel showToast={showToast} />}
    </div>
  );
}

// =====================================================
// 대화 내역
// =====================================================

function ConversationList({ showToast, onStatsUpdate }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConv, setSelectedConv] = useState(null);

  useEffect(() => { load(); }, [statusFilter]);

  async function load() {
    setLoading(true);
    const data = await getChatbotConversations({ status: statusFilter });
    setConversations(data);
    setLoading(false);
  }

  async function openConversation(conv) {
    const detail = await getChatbotConversation(conv.id);
    setSelectedConv(detail);
  }

  async function handleStatusChange(id, newStatus) {
    await updateConversationStatus(id, newStatus);
    showToast?.(`상태가 변경되었습니다`);
    load();
    onStatsUpdate?.();
    if (selectedConv?.id === id) {
      setSelectedConv(prev => ({ ...prev, status: newStatus }));
    }
  }

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex gap-2">
        {['all', 'active', 'resolved', 'escalated'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-[12px] px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
              statusFilter === s
                ? 'bg-dark text-white border-dark'
                : 'bg-white text-steel border-silver hover:border-slate'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_BADGES[s]?.label || s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-4">
        {/* 대화 목록 */}
        <div className="bg-white rounded-xl border border-pale overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-mist py-12 text-[13px]">로딩중...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-mist py-12 text-[13px]">대화가 없습니다</div>
            ) : conversations.map(c => (
              <div
                key={c.id}
                onClick={() => openConversation(c)}
                className={`p-3 border-b border-pale cursor-pointer hover:bg-snow transition-colors ${
                  selectedConv?.id === c.id ? 'bg-snow border-l-2 border-l-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium truncate max-w-[180px]">
                    {c.visitor_name || c.visitor_email || '익명 방문자'}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="text-[11px] text-mist truncate">{c.first_message || '(메시지 없음)'}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-mist">
                    {c.visitor_country && `${c.visitor_country} · `}
                    {c.message_count || 0}개 메시지
                  </span>
                  <span className="text-[10px] text-mist">
                    {new Date(c.created_at).toLocaleDateString('ko')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 대화 상세 */}
        <div className="bg-white rounded-xl border border-pale overflow-hidden">
          {selectedConv ? (
            <div className="flex flex-col h-[500px]">
              {/* 헤더 */}
              <div className="p-3 border-b border-pale bg-snow flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold">
                    {selectedConv.visitor_name || selectedConv.visitor_email || '익명 방문자'}
                  </div>
                  <div className="text-[11px] text-mist">
                    {selectedConv.visitor_country && `${selectedConv.visitor_country} · `}
                    {selectedConv.channel} · {new Date(selectedConv.created_at).toLocaleString('ko')}
                  </div>
                </div>
                <div className="flex gap-1">
                  {selectedConv.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(selectedConv.id, 'resolved')}
                      className="text-[11px] px-2 py-1 bg-success/15 text-success rounded border-none cursor-pointer"
                    >
                      해결 완료
                    </button>
                  )}
                  {selectedConv.status !== 'escalated' && (
                    <button
                      onClick={() => handleStatusChange(selectedConv.id, 'escalated')}
                      className="text-[11px] px-2 py-1 bg-danger/15 text-danger rounded border-none cursor-pointer"
                    >
                      에스컬레이션
                    </button>
                  )}
                </div>
              </div>

              {/* 메시지 */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {(selectedConv.messages || []).length === 0 ? (
                  <div className="text-center text-mist text-[13px] pt-8">메시지가 없습니다</div>
                ) : selectedConv.messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] ${
                      m.role === 'user'
                        ? 'bg-dark text-white rounded-br-sm'
                        : 'bg-pale text-slate rounded-bl-sm'
                    }`}>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${m.role === 'user' ? 'text-white/50' : 'text-mist'}`}>
                        {new Date(m.created_at).toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 만족도 */}
              {selectedConv.satisfaction_score && (
                <div className="p-2 border-t border-pale bg-snow text-center text-[11px] text-steel">
                  만족도: {'⭐'.repeat(selectedConv.satisfaction_score)} ({selectedConv.satisfaction_score}/5)
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-mist text-[13px]">
              대화를 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// FAQ 관리
// =====================================================

function FaqManager({ showToast }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getChatbotFaq();
    setFaqs(data);
    setLoading(false);
  }

  async function handleSave() {
    if (!editingFaq?.question?.trim() || !editingFaq?.answer?.trim()) {
      alert('질문과 답변을 모두 입력하세요');
      return;
    }
    const saved = await saveFaq(editingFaq);
    if (saved) {
      showToast?.('FAQ가 저장되었습니다');
      setEditingFaq(null);
      load();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('삭제하시겠습니까?')) return;
    await deleteFaq(id);
    showToast?.('삭제되었습니다', 'info');
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setEditingFaq({ question: '', answer: '', category: '일반', is_active: true })}
          className="px-3 py-1.5 bg-dark text-white text-[12px] font-medium rounded-lg border-none cursor-pointer hover:bg-charcoal"
        >
          + FAQ 추가
        </button>
      </div>

      {/* 에디터 */}
      {editingFaq && (
        <div className="bg-snow rounded-xl border border-accent-light p-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">질문</label>
            <input
              value={editingFaq.question}
              onChange={e => setEditingFaq(f => ({ ...f, question: e.target.value }))}
              placeholder="자주 묻는 질문"
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">답변</label>
            <textarea
              value={editingFaq.answer}
              onChange={e => setEditingFaq(f => ({ ...f, answer: e.target.value }))}
              rows={4}
              placeholder="답변 내용"
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">카테고리</label>
              <input
                value={editingFaq.category}
                onChange={e => setEditingFaq(f => ({ ...f, category: e.target.value }))}
                placeholder="일반"
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-[13px] text-steel cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingFaq.is_active}
                  onChange={e => setEditingFaq(f => ({ ...f, is_active: e.target.checked }))}
                  className="accent-accent"
                />
                활성화
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingFaq(null)} className="px-3 py-1.5 text-[12px] text-steel bg-pale rounded-lg border-none cursor-pointer">취소</button>
            <button onClick={handleSave} className="px-3 py-1.5 text-[12px] text-white bg-dark rounded-lg border-none cursor-pointer">저장</button>
          </div>
        </div>
      )}

      {/* FAQ 목록 */}
      <div className="bg-white rounded-xl border border-pale overflow-hidden">
        {loading ? (
          <div className="text-center text-mist py-8 text-[13px]">로딩중...</div>
        ) : faqs.length === 0 ? (
          <div className="text-center text-mist py-8 text-[13px]">등록된 FAQ가 없습니다</div>
        ) : faqs.map(faq => (
          <div key={faq.id} className="border-b border-pale p-3 hover:bg-snow/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${faq.is_active ? 'bg-success/15 text-success' : 'bg-pale text-mist'}`}>
                    {faq.is_active ? '활성' : '비활성'}
                  </span>
                  <span className="text-[10px] text-mist">{faq.category}</span>
                  <span className="text-[10px] text-mist">사용 {faq.usage_count}회</span>
                </div>
                <div className="text-[13px] font-medium mt-1">Q. {faq.question}</div>
                <div className="text-[12px] text-steel mt-1 whitespace-pre-wrap">A. {faq.answer}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditingFaq({ ...faq })}
                  className="text-[11px] px-2 py-1 bg-info/15 text-info rounded border-none cursor-pointer"
                >
                  편집
                </button>
                <button
                  onClick={() => handleDelete(faq.id)}
                  className="text-[11px] px-2 py-1 bg-danger/15 text-danger rounded border-none cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================
// 챗봇 설정
// =====================================================

function SettingsPanel({ showToast }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await getChatbotSettings();
    setSettings(data);
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await updateChatbotSetting(key, value);
    }
    setSaving(false);
    showToast?.('설정이 저장되었습니다');
  }

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  if (loading) return <div className="text-center text-mist py-8 text-[13px]">로딩중...</div>;

  const fields = [
    { key: 'greeting', label: '인사말', type: 'textarea', desc: '첫 방문자에게 보이는 인사 메시지' },
    { key: 'tone', label: '톤앤매너 가이드', type: 'textarea', desc: '챗봇의 응답 스타일 가이드' },
    { key: 'offline_message', label: '오프라인 메시지', type: 'textarea', desc: '운영시간 외 메시지' },
    { key: 'operating_hours', label: '운영 시간', type: 'input', desc: '예: 평일 09:00~18:00 (KST)' },
    { key: 'escalation_threshold', label: '에스컬레이션 임계값', type: 'input', desc: 'N회 미응답 시 에스컬레이션' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-pale p-4 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[12px] font-medium text-steel mb-1">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                value={settings[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                rows={3}
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
              />
            ) : (
              <input
                value={settings[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            )}
            <div className="text-[11px] text-mist mt-0.5">{f.desc}</div>
          </div>
        ))}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-dark rounded-lg border-none cursor-pointer hover:bg-charcoal disabled:opacity-50"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 공통
// =====================================================

function StatusBadge({ status }) {
  const badge = STATUS_BADGES[status] || { label: status, color: 'bg-pale text-steel' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
      {badge.label}
    </span>
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
