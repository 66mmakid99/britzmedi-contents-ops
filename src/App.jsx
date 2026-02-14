import { useState } from "react";
import INITIAL_CONTENTS from "./data/initialContents";
import { getDaysUntil } from "./lib/utils";
import { D_DAY_DATE } from "./data/constants";
import Dashboard from "./components/Dashboard";
import Calendar from "./components/Calendar";
import Pipeline from "./components/Pipeline";
import Publishing from "./components/Publishing";
import ContentFactory from "./components/ContentFactory";

const tabs = [
  { id: "dashboard", label: "📊 대시보드" },
  { id: "calendar", label: "📅 캘린더" },
  { id: "pipeline", label: "🔄 파이프라인" },
  { id: "publishing", label: "📢 발행관리" },
  { id: "factory", label: "✨ 콘텐츠 팩토리" },
];

export default function App() {
  const [contents, setContents] = useState(INITIAL_CONTENTS);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">BRITZMEDI Content Ops</h1>
              <p className="text-xs text-gray-500">2트랙 콘텐츠 운영 시스템</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">콘텐츠 {contents.length}건</p>
              <p className="text-xs font-bold text-indigo-600">
                D-{Math.max(0, getDaysUntil(D_DAY_DATE))}
              </p>
            </div>
          </div>
          <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-gray-50 text-gray-900 border border-gray-200 border-b-gray-50 -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "dashboard" && <Dashboard contents={contents} setActiveTab={setActiveTab} />}
        {activeTab === "calendar" && <Calendar contents={contents} />}
        {activeTab === "pipeline" && <Pipeline contents={contents} setContents={setContents} />}
        {activeTab === "publishing" && <Publishing contents={contents} setContents={setContents} />}
        {activeTab === "factory" && <ContentFactory contents={contents} setContents={setContents} />}
      </main>
    </div>
  );
}
