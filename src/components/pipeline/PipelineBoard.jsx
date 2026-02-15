/**
 * PipelineBoard: 칸반 스타일 파이프라인 보드
 * Phase C enhanced version using pipeline.js constants
 */

import { useState, useEffect } from 'react';
import { PIPELINE_STAGES, PRIORITY_LEVELS } from '../../constants/pipeline';

export default function PipelineBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPipelineItems();
  }, []);

  const loadPipelineItems = async () => {
    setLoading(true);
    try {
      // TODO: Supabase에서 pipeline_items 로드
      setItems([]);
    } catch (error) {
      console.error('파이프라인 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const moveToStage = async (itemId, newStage) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const history = [...(item.stage_history || []), {
          from: item.stage,
          to: newStage,
          at: new Date().toISOString(),
        }];
        return { ...item, stage: newStage, stage_history: history };
      }
      return item;
    }));
  };

  const getItemsByStage = (stageId) => items.filter(item => item.stage === stageId);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">파이프라인 로딩 중...</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map(stage => (
        <div key={stage.id} className="flex-shrink-0 w-72">
          {/* 컬럼 헤더 */}
          <div className={`rounded-t-lg px-3 py-2 font-bold text-sm flex items-center gap-2 ${stage.color}`}>
            <span>{stage.icon}</span>
            <span>{stage.name}</span>
            <span className="ml-auto bg-white/50 rounded-full px-2 text-xs">
              {getItemsByStage(stage.id).length}
            </span>
          </div>

          {/* 카드 목록 */}
          <div className="bg-gray-50 rounded-b-lg p-2 min-h-[200px] space-y-2">
            {getItemsByStage(stage.id).map(item => (
              <PipelineCard
                key={item.id}
                item={item}
                stage={stage}
                onMove={(newStage) => moveToStage(item.id, newStage)}
              />
            ))}

            {getItemsByStage(stage.id).length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400">
                아직 항목이 없습니다
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineCard({ item, stage, onMove }) {
  const nextStageIndex = PIPELINE_STAGES.findIndex(s => s.id === stage.id) + 1;
  const nextStage = PIPELINE_STAGES[nextStageIndex];
  const priority = PRIORITY_LEVELS.find(p => p.id === item.priority);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm line-clamp-2">{item.title || '제목 없음'}</h4>
        {priority && (
          <span className={`text-xs ${priority.color}`}>{priority.name}</span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <span>{item.content_type === 'press_release' ? '📰' : '📢'}</span>
        {item.channel && <span>{item.channel}</span>}
        {item.scheduled_date && <span>{item.scheduled_date}</span>}
      </div>

      {nextStage && (
        <button
          onClick={() => onMove(nextStage.id)}
          className="mt-2 w-full py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
        >
          {nextStage.name}(으)로 이동
        </button>
      )}
    </div>
  );
}
