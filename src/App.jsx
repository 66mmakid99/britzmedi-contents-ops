import { useState } from 'react';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import Dashboard from './components/dashboard/Dashboard';
import Calendar from './components/calendar/Calendar';
import Pipeline from './components/pipeline/Pipeline';
import Publish from './components/publish/Publish';
import Create from './components/create/Create';
import { DEMO_CONTENTS } from './constants';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [contents, setContents] = useState(DEMO_CONTENTS);

  const handleAddContent = (newContent) => {
    setContents([newContent, ...contents]);
    setActivePage('pipeline');
  };

  return (
    <div className="min-h-screen bg-snow font-sans pb-[72px] md:pb-0">
      <Header activePage={activePage} setActivePage={setActivePage} />

      <main className="max-w-[1200px] mx-auto p-3 md:p-6">
        {activePage === 'dashboard' && <Dashboard contents={contents} />}
        {activePage === 'calendar' && <Calendar contents={contents} />}
        {activePage === 'pipeline' && (
          <Pipeline contents={contents} setContents={setContents} />
        )}
        {activePage === 'publish' && (
          <Publish contents={contents} setContents={setContents} />
        )}
        {activePage === 'create' && <Create onAdd={handleAddContent} />}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}
