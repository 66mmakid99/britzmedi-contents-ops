import { useState, useCallback } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Toast from './components/layout/Toast';
import ContentModal from './components/layout/ContentModal';
import Dashboard from './components/dashboard/Dashboard';
import Calendar from './components/calendar/Calendar';
import Pipeline from './components/pipeline/Pipeline';
import Publish from './components/publish/Publish';
import Create from './components/create/Create';
import KnowledgeBase from './components/knowledge/KnowledgeBase';
import useLocalStorage from './hooks/useLocalStorage';
import { DEMO_CONTENTS } from './constants';
import { DEFAULT_KB_ENTRIES } from './constants/knowledgeBase';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [contents, setContents] = useLocalStorage('bm-contents', DEMO_CONTENTS);
  const [toast, setToast] = useState(null);
  const [modalContent, setModalContent] = useState(null);
  const [apiKey, setApiKey] = useLocalStorage('bm-apikey', '');

  // Knowledge Base
  const [kbEntries, setKbEntries] = useLocalStorage('bm-knowledge-base', DEFAULT_KB_ENTRIES);

  // PR → Channel content creation source
  const [prSourceData, setPrSourceData] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  const handleAddContent = (newContent) => {
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

  const handleDeleteContent = (id) => {
    setContents(contents.filter((c) => c.id !== id));
    showToast('삭제되었습니다', 'info');
  };

  const handleCreateFromPR = (prItem) => {
    setPrSourceData({
      id: prItem.id,
      title: prItem.title,
      date: prItem.date,
      draft: typeof prItem.draft === 'string' ? prItem.draft : JSON.stringify(prItem.draft),
    });
    setActivePage('create');
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
          />
        )}
        {activePage === 'knowledge' && (
          <KnowledgeBase entries={kbEntries} setEntries={setKbEntries} />
        )}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}
