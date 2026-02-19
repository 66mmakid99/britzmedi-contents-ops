import { useState, useCallback, useEffect, useRef } from 'react';
import GoRedirect from './components/GoRedirect';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/layout/Toast';
import ContentModal from './components/layout/ContentModal';
import TokenUsageBadge from './components/layout/TokenUsageBadge';
import { SessionTracker } from './lib/tokenTracker';
import Dashboard from './components/dashboard/Dashboard';
import Calendar from './components/calendar/Calendar';
import Pipeline from './components/pipeline/Pipeline';
import Publish from './components/publish/Publish';
import Create from './components/create/Create';
import KnowledgeBase from './components/knowledge/KnowledgeBase';
import RepurposeHub from './components/repurpose/RepurposeHub';
import WebsiteManage from './components/website/WebsiteManage';
import ChatbotManage from './components/chatbot/ChatbotManage';
import LeadManage from './components/lead/LeadManage';
import useLocalStorage from './hooks/useLocalStorage';
import { DEMO_CONTENTS } from './constants';
import { DEFAULT_KB_ENTRIES } from './constants/knowledgeBase';
import {
  savePressRelease, deletePressRelease as dbDeletePR,
  getAllPressReleases, savePipelineItem, migrateLocalToSupabase,
  updatePressRelease, saveEditHistory, getPressReleaseById,
  saveChannelContent, updateChannelFinalText,
} from './lib/supabaseData';
import { formatReviewReason, formatFixPattern } from './lib/editUtils';

export default function App() {
  // /go 경로: CTA 추적 리다이렉트 전용 페이지
  if (window.location.pathname === '/go') {
    return <GoRedirect />;
  }

  const [activePage, setActivePage] = useState('dashboard');
  const [contents, setContents] = useLocalStorage('bm-contents', DEMO_CONTENTS);
  const [toast, setToast] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [apiKey, setApiKey] = useLocalStorage('bm-apikey', '');

  // Knowledge Base
  const [kbEntries, setKbEntries] = useLocalStorage('bm-knowledge-base', DEFAULT_KB_ENTRIES);

  // PR → Channel content creation source
  const [prSourceData, setPrSourceData] = useState(null);

  // Repurpose: selected content source for channel repurposing
  const [repurposeSource, setRepurposeSource] = useState(null);

  // Token usage tracking
  const trackerRef = useRef(new SessionTracker());
  const [tokenSummary, setTokenSummary] = useState(null);
  const handleTokenUpdate = useCallback(() => {
    setTokenSummary(trackerRef.current.getSummary());
  }, []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  // 초기 로딩: Supabase에서 데이터 가져오기 (실패 시 localStorage 폴백)
  useEffect(() => {
    (async () => {
      // 1. localStorage → Supabase 마이그레이션 (최초 1회)
      await migrateLocalToSupabase();

      // 2. Supabase에서 전체 목록 로드
      const rows = await getAllPressReleases();
      if (rows && rows.length > 0) {
        // Supabase 데이터를 기존 contents 포맷으로 변환
        const mapped = rows.map((r) => ({
          id: r.id,
          title: r.title,
          track: 'B',
          pillar: r.category || 'PR',
          stage: r.status || 'draft',
          channels: r.channels || {},
          date: r.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          draft: r.press_release || '',
          _supabaseId: r.id,
        }));
        setContents(mapped);
      }
      // rows가 null(Supabase 미연결) 또는 빈 배열이면 localStorage 유지
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddContent = async (newContent) => {
    // 1. Supabase에 저장
    const prText = typeof newContent.draft === 'string' ? newContent.draft : null;

    // Phase 2-A: ai_draft vs final_text 분리
    const aiRawDraft = newContent._aiRawDraft || null;

    const saved = await savePressRelease({
      title: newContent.title,
      source: null,
      ai_draft: aiRawDraft || prText,
      press_release: prText,
      category: newContent.pillar || null,
      status: newContent.stage === 'ready' ? 'approved' : (newContent.stage || 'draft'),
    });

    // 2. 파이프라인에도 추가 + 검수 메트릭 저장
    if (saved) {
      await savePipelineItem({
        press_release_id: saved.id,
        stage: saved.status,
      });

      // Phase 2-A: 검수 메트릭 업데이트 (edit_distance, quality_score 등)
      const meta = newContent._reviewMeta || {};
      const metrics = newContent._editMetrics || {};
      if (meta.quality_score != null || metrics.editDistance) {
        await updatePressRelease(saved.id, {
          ...meta,
          edit_distance: metrics.editDistance || null,
          edit_ratio: metrics.editRatio || null,
        });
      }

      // Phase 2-A: edit_history 저장 (saved.id 확보 후)
      const fixReport = newContent._fixReport;
      const reviewData = newContent._reviewData;
      const rawDraft = newContent._aiRawDraft;
      if (rawDraft && fixReport?.fixedContent && rawDraft !== fixReport.fixedContent) {
        saveEditHistory({
          content_type: 'press_release',
          content_id: saved.id,
          channel: null,
          before_text: rawDraft,
          after_text: fixReport.fixedContent,
          edit_type: 'auto_review',
          edit_pattern: formatFixPattern(fixReport.fixes),
          edit_reason: formatReviewReason(reviewData),
        }).catch(e => console.error('[Phase2-A] edit_history 저장 실패:', e.message));
      }

      // Phase 2-B: 채널 콘텐츠 edit_distance 학습 루프
      const channelDrafts = newContent._channelDrafts || {};
      const channelRawDrafts = newContent._channelRawDrafts || {};
      for (const [ch, finalText] of Object.entries(channelDrafts)) {
        if (ch === 'pressrelease') continue; // PR은 위에서 처리
        try {
          const savedRow = await saveChannelContent(saved.id, ch, finalText);
          if (savedRow) {
            const aiDraft = channelRawDrafts[ch];
            if (aiDraft && aiDraft !== finalText) {
              await updateChannelFinalText(savedRow.id, finalText);
              await saveEditHistory({
                content_type: 'channel',
                content_id: savedRow.id,
                channel: ch,
                before_text: aiDraft,
                after_text: finalText,
                edit_type: 'user_edit_create',
                edit_pattern: null,
                edit_reason: '사용자 직접 수정 (콘텐츠 팩토리)',
              });
            }
          }
        } catch (e) {
          console.error(`[Phase2-B] ${ch} 채널 저장 실패:`, e.message);
        }
      }

      // Supabase ID로 교체
      newContent = { ...newContent, id: saved.id, _supabaseId: saved.id };
    }

    // 3. localStorage 백업 (항상)
    setContents((prev) => [newContent, ...prev]);
    if (!prSourceData) {
      setActivePage('pipeline');
    }
    showToast('콘텐츠가 추가되었습니다');
  };

  const handleSaveContent = (updated) => {
    setContents(contents.map((c) => (c.id === updated.id ? updated : c)));
    showToast('저장되었습니다');
  };

  const handleDeleteContent = async (id) => {
    // Supabase에서 삭제 (cascade로 pipeline도 삭제)
    await dbDeletePR(id);
    // localStorage에서도 삭제
    setContents(contents.filter((c) => c.id !== id));
    showToast('삭제되었습니다', 'info');
  };

  const handleCreateFromPR = (prItem) => {
    setRepurposeSource({
      type: 'press_release',
      id: prItem.id,
      title: prItem.title,
      date: prItem.date,
      body: typeof prItem.draft === 'string' ? prItem.draft : JSON.stringify(prItem.draft),
      draft: typeof prItem.draft === 'string' ? prItem.draft : JSON.stringify(prItem.draft),
    });
    setActivePage('repurpose');
  };

  const handleGoToRepurpose = (prData) => {
    setRepurposeSource({
      type: 'press_release',
      id: prData.id || Date.now(),
      title: prData.title,
      date: prData.date,
      body: prData.draft || prData.body || '',
      draft: prData.draft || prData.body || '',
      channels: prData.channels || [],
    });
    setActivePage('repurpose');
  };

  const handleGoToRepurposeGeneral = (sourceData) => {
    setRepurposeSource({
      type: sourceData.type,
      id: sourceData.id || `${sourceData.type}-${Date.now()}`,
      title: sourceData.title || '',
      body: sourceData.body || '',
      date: sourceData.date || new Date().toISOString().slice(0, 10),
      metadata: sourceData.metadata || {},
      channels: sourceData.channels || [],
    });
    setActivePage('repurpose');
  };

  return (
    <div className="min-h-screen bg-snow font-sans pb-[72px] md:pb-0">
      <Header activePage={activePage} setActivePage={setActivePage} />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {modalContent && (
        <ContentModal
          content={modalContent}
          onClose={() => setModalContent(null)}
          onSave={handleSaveContent}
          onDelete={handleDeleteContent}
        />
      )}

      <main className="max-w-[1200px] mx-auto p-3 md:p-6">
        {activePage === 'dashboard' && (
          <Dashboard contents={contents} onOpenContent={setModalContent} setActivePage={setActivePage} />
        )}
        {activePage === 'calendar' && (
          <Calendar contents={contents} onOpenContent={setModalContent} />
        )}
        {activePage === 'pipeline' && (
          <Pipeline
            contents={contents}
            setContents={setContents}
            onOpenContent={setModalContent}
            onCreateFromPR={handleCreateFromPR}
          />
        )}
        {activePage === 'publish' && (
          <Publish contents={contents} setContents={setContents} onOpenContent={setModalContent} />
        )}
        {activePage === 'create' && (
          <Create
            onAdd={handleAddContent}
            apiKey={apiKey}
            setApiKey={setApiKey}
            prSourceData={prSourceData}
            onClearPRSource={() => { setPrSourceData(null); setActivePage('pipeline'); }}
            knowledgeBase={kbEntries}
            onGoToRepurpose={handleGoToRepurpose}
            onGoToRepurposeGeneral={handleGoToRepurposeGeneral}
            tracker={trackerRef.current}
            onTokenUpdate={handleTokenUpdate}
          />
        )}
        {activePage === 'repurpose' && (
          <RepurposeHub
            contentSource={repurposeSource}
            apiKey={apiKey}
            contents={contents}
            onSelectPR={async (item) => {
              let body = item.draft || item.body || '';
              // 본문이 비어있으면 Supabase에서 직접 조회
              if (!body && item.id) {
                const fresh = await getPressReleaseById(item.id);
                if (fresh) {
                  body = fresh.press_release || fresh.final_text || fresh.ai_draft || '';
                }
              }
              setRepurposeSource({
                type: 'press_release',
                ...item,
                body,
                draft: body,
              });
            }}
            tracker={trackerRef.current}
            onTokenUpdate={handleTokenUpdate}
          />
        )}
        {activePage === 'knowledge' && (
          <KnowledgeBase entries={kbEntries} setEntries={setKbEntries} apiKey={apiKey} setApiKey={setApiKey} showToast={showToast} tracker={trackerRef.current} onTokenUpdate={handleTokenUpdate} />
        )}
        {activePage === 'website' && (
          <WebsiteManage showToast={showToast} />
        )}
        {activePage === 'chatbot' && (
          <ChatbotManage showToast={showToast} />
        )}
        {activePage === 'leads' && (
          <LeadManage showToast={showToast} />
        )}
        <TokenUsageBadge summary={tokenSummary} />
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}
