import { useState, useEffect } from 'react';
import { getWebsitePosts, saveWebsitePost, deleteWebsitePost, getWebsiteStats } from '../../lib/supabaseAdmin';

const POST_CATEGORIES = [
  { id: 'news', label: '뉴스', emoji: '📰' },
  { id: 'research', label: '연구/임상', emoji: '🔬' },
  { id: 'installation', label: '설치사례', emoji: '🏥' },
  { id: 'insights', label: '인사이트', emoji: '💡' },
  { id: 'case-studies', label: '케이스 스터디', emoji: '📋' },
  { id: 'events', label: '이벤트', emoji: '🎪' },
  { id: 'tips', label: '팁/가이드', emoji: '📝' },
  { id: 'company', label: '회사소식', emoji: '🏢' },
];

const STATUS_BADGES = {
  draft: { label: '초안', color: 'bg-warn/15 text-warn' },
  published: { label: '발행됨', color: 'bg-success/15 text-success' },
  archived: { label: '보관됨', color: 'bg-pale text-steel' },
};

export default function WebsiteManage({ showToast }) {
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: 'all', category: 'all' });
  const [editingPost, setEditingPost] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { loadData(); }, [filter]);

  async function loadData() {
    setLoading(true);
    const [p, s] = await Promise.all([
      getWebsitePosts(filter),
      getWebsiteStats(),
    ]);
    setPosts(p);
    setStats(s);
    setLoading(false);
  }

  function openEditor(post = null) {
    setEditingPost(post || {
      title: '', body: '', excerpt: '', category: 'news', status: 'draft',
      author: '브릿츠메디', seo_title: '', seo_description: '', seo_keywords: [],
    });
    setShowEditor(true);
  }

  async function handleSave(post) {
    const saved = await saveWebsitePost(post);
    if (saved) {
      showToast?.('저장되었습니다');
      setShowEditor(false);
      setEditingPost(null);
      loadData();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    const ok = await deleteWebsitePost(id);
    if (ok) {
      showToast?.('삭제되었습니다', 'info');
      loadData();
    }
  }

  async function handlePublish(post) {
    await saveWebsitePost({ ...post, status: 'published' });
    showToast?.('발행되었습니다');
    loadData();
  }

  const tabs = [
    { id: 'posts', label: '콘텐츠 목록' },
    { id: 'seo', label: 'SEO 현황' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">홈페이지 관리</h2>
        <button
          onClick={() => openEditor()}
          className="px-4 py-2 bg-dark text-white text-[13px] font-medium rounded-lg border-none cursor-pointer hover:bg-charcoal transition-colors"
        >
          + 새 콘텐츠
        </button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="전체" value={stats.total} icon="📄" />
          <StatCard label="발행됨" value={stats.published} icon="🟢" />
          <StatCard label="초안" value={stats.draft} icon="📝" />
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

      {tab === 'posts' && (
        <PostList
          posts={posts}
          loading={loading}
          filter={filter}
          setFilter={setFilter}
          onEdit={openEditor}
          onDelete={handleDelete}
          onPublish={handlePublish}
        />
      )}

      {tab === 'seo' && <SeoOverview posts={posts} />}

      {/* 에디터 모달 */}
      {showEditor && editingPost && (
        <PostEditor
          post={editingPost}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingPost(null); }}
        />
      )}
    </div>
  );
}

// =====================================================
// 포스트 목록
// =====================================================

function PostList({ posts, loading, filter, setFilter, onEdit, onDelete, onPublish }) {
  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="text-[12px] border border-silver rounded-lg px-3 py-1.5 bg-white text-slate outline-none"
        >
          <option value="all">전체 상태</option>
          <option value="draft">초안</option>
          <option value="published">발행됨</option>
          <option value="archived">보관됨</option>
        </select>
        <select
          value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="text-[12px] border border-silver rounded-lg px-3 py-1.5 bg-white text-slate outline-none"
        >
          <option value="all">전체 카테고리</option>
          {POST_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-pale overflow-x-auto">
        <table className="w-full text-[12px] md:text-[13px]">
          <thead>
            <tr className="border-b border-pale">
              <th className="text-left p-3 font-semibold text-steel">제목</th>
              <th className="text-center p-3 font-semibold text-steel w-24">카테고리</th>
              <th className="text-center p-3 font-semibold text-steel w-20">상태</th>
              <th className="text-center p-3 font-semibold text-steel w-28">날짜</th>
              <th className="text-center p-3 font-semibold text-steel w-28">작업</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-mist">로딩중...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-mist">콘텐츠가 없습니다</td></tr>
            ) : posts.map(p => {
              const cat = POST_CATEGORIES.find(c => c.id === p.category);
              const badge = STATUS_BADGES[p.status] || STATUS_BADGES.draft;
              return (
                <tr key={p.id} className="border-b border-pale hover:bg-snow/50">
                  <td className="p-3">
                    <div
                      className="font-medium truncate max-w-[400px] cursor-pointer hover:text-accent"
                      onClick={() => onEdit(p)}
                    >
                      {p.title}
                    </div>
                    {p.excerpt && <div className="text-[11px] text-mist mt-0.5 truncate max-w-[400px]">{p.excerpt}</div>}
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-[11px]">{cat?.emoji} {cat?.label || p.category}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-3 text-center text-steel text-[11px]">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString('ko') : new Date(p.created_at).toLocaleDateString('ko')}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {p.status === 'draft' && (
                        <button
                          onClick={() => onPublish(p)}
                          className="text-[11px] px-2 py-1 bg-success/15 text-success rounded border-none cursor-pointer hover:bg-success/25"
                        >
                          발행
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(p)}
                        className="text-[11px] px-2 py-1 bg-info/15 text-info rounded border-none cursor-pointer hover:bg-info/25"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="text-[11px] px-2 py-1 bg-danger/15 text-danger rounded border-none cursor-pointer hover:bg-danger/25"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// SEO 현황
// =====================================================

function SeoOverview({ posts }) {
  const published = posts.filter(p => p.status === 'published');
  const missing = {
    seoTitle: published.filter(p => !p.seo_title).length,
    seoDesc: published.filter(p => !p.seo_description).length,
    slug: published.filter(p => !p.slug).length,
    excerpt: published.filter(p => !p.excerpt).length,
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-pale p-4">
        <h3 className="text-[14px] font-bold mb-3">SEO 완성도 (발행된 콘텐츠)</h3>
        {published.length === 0 ? (
          <p className="text-mist text-[13px]">발행된 콘텐츠가 없습니다</p>
        ) : (
          <div className="space-y-2">
            <SeoBar label="SEO 제목" done={published.length - missing.seoTitle} total={published.length} />
            <SeoBar label="SEO 설명" done={published.length - missing.seoDesc} total={published.length} />
            <SeoBar label="URL 슬러그" done={published.length - missing.slug} total={published.length} />
            <SeoBar label="발췌문" done={published.length - missing.excerpt} total={published.length} />
          </div>
        )}
      </div>

      {/* 미완성 항목 */}
      {published.filter(p => !p.seo_title || !p.seo_description).length > 0 && (
        <div className="bg-white rounded-xl border border-pale p-4">
          <h3 className="text-[14px] font-bold mb-3">⚠️ SEO 미완성 콘텐츠</h3>
          <div className="space-y-1">
            {published.filter(p => !p.seo_title || !p.seo_description).map(p => (
              <div key={p.id} className="text-[12px] text-steel flex gap-2">
                <span className="text-danger">●</span>
                <span className="font-medium">{p.title}</span>
                <span className="text-mist">—</span>
                {!p.seo_title && <span className="text-warn">SEO제목 없음</span>}
                {!p.seo_description && <span className="text-warn">SEO설명 없음</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeoBar({ label, done, total }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-steel w-20">{label}</span>
      <div className="flex-1 bg-pale rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-success' : pct > 50 ? 'bg-info' : 'bg-warn'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-steel w-16 text-right">{done}/{total} ({pct}%)</span>
    </div>
  );
}

// =====================================================
// 포스트 에디터 모달
// =====================================================

function PostEditor({ post, onSave, onClose }) {
  const [form, setForm] = useState({ ...post });
  const [showSeo, setShowSeo] = useState(false);
  const [saving, setSaving] = useState(false);
  const isNew = !post.id;

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit() {
    if (!form.title?.trim()) { alert('제목을 입력하세요'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 md:pt-16 overflow-y-auto">
      <div className="bg-white rounded-xl border border-pale w-full max-w-[800px] mx-4 mb-8 shadow-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-pale">
          <h3 className="text-[15px] font-bold">{isNew ? '새 콘텐츠 작성' : '콘텐츠 편집'}</h3>
          <button onClick={onClose} className="text-steel text-lg border-none bg-transparent cursor-pointer hover:text-dark">✕</button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 제목 */}
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">제목 *</label>
            <input
              value={form.title || ''}
              onChange={e => set('title', e.target.value)}
              placeholder="콘텐츠 제목"
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
          </div>

          {/* 카테고리 + 상태 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">카테고리</label>
              <select
                value={form.category || 'news'}
                onChange={e => set('category', e.target.value)}
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
              >
                {POST_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">상태</label>
              <select
                value={form.status || 'draft'}
                onChange={e => set('status', e.target.value)}
                className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none bg-white"
              >
                <option value="draft">📝 초안</option>
                <option value="published">🟢 발행</option>
                <option value="archived">📦 보관</option>
              </select>
            </div>
          </div>

          {/* 발췌문 */}
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">발췌문 (목록 미리보기)</label>
            <textarea
              value={form.excerpt || ''}
              onChange={e => set('excerpt', e.target.value)}
              rows={2}
              placeholder="2~3문장 요약"
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
            />
          </div>

          {/* 본문 */}
          <div>
            <label className="block text-[12px] font-medium text-steel mb-1">본문</label>
            <textarea
              value={form.body || ''}
              onChange={e => set('body', e.target.value)}
              rows={12}
              placeholder="콘텐츠 본문을 입력하세요"
              className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y font-mono"
            />
            <div className="text-[11px] text-mist text-right mt-1">
              {(form.body || '').length}자
            </div>
          </div>

          {/* SEO 토글 */}
          <button
            onClick={() => setShowSeo(!showSeo)}
            className="text-[12px] text-info border-none bg-transparent cursor-pointer hover:underline"
          >
            {showSeo ? '▾ SEO 설정 접기' : '▸ SEO 설정 열기'}
          </button>

          {showSeo && (
            <div className="space-y-3 border border-pale rounded-lg p-3 bg-snow">
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">SEO 제목</label>
                <input
                  value={form.seo_title || ''}
                  onChange={e => set('seo_title', e.target.value)}
                  placeholder={form.title || 'SEO 제목'}
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
                <div className="text-[11px] text-mist mt-0.5">{(form.seo_title || form.title || '').length}/60자 권장</div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">SEO 설명</label>
                <textarea
                  value={form.seo_description || ''}
                  onChange={e => set('seo_description', e.target.value)}
                  rows={2}
                  placeholder="검색 결과에 표시될 설명"
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent resize-y"
                />
                <div className="text-[11px] text-mist mt-0.5">{(form.seo_description || '').length}/160자 권장</div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">키워드 (쉼표 구분)</label>
                <input
                  value={(form.seo_keywords || []).join(', ')}
                  onChange={e => set('seo_keywords', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="토르RF, RF의료기기, 에스테틱"
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-steel mb-1">URL 슬러그</label>
                <input
                  value={form.slug || ''}
                  onChange={e => set('slug', e.target.value)}
                  placeholder="자동 생성됩니다"
                  className="w-full border border-silver rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent"
                />
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-pale">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-steel bg-pale rounded-lg border-none cursor-pointer hover:bg-silver"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-medium text-white bg-dark rounded-lg border-none cursor-pointer hover:bg-charcoal disabled:opacity-50"
          >
            {saving ? '저장 중...' : isNew ? '작성 완료' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// 공통 카드
// =====================================================

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-pale p-3 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-xl font-bold text-dark">{value}</div>
      <div className="text-[11px] text-steel">{label}</div>
    </div>
  );
}
