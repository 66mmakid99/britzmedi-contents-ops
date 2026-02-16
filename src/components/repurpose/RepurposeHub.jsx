/**
 * RepurposeHub: 보도자료 선택 → 5채널 재가공 허브
 * UI: 탭 기반 — 채널 탭 선택 → 생성 → 미리보기 → 복사
 */

import { useState, useEffect } from 'react';
import { REPURPOSE_CHANNELS, REPURPOSE_STATUS } from '../../constants/channels';
import ChannelPreview from './ChannelPreview';
import { generateChannelContent } from '../../lib/channelGenerate';

export default function RepurposeHub({ pressRelease, apiKey, contents, onSelectPR }) {
  const [channelStates, setChannelStates] = useState({});
  const [activeChannel, setActiveChannel] = useState(null);
  const [generatedContents, setGeneratedContents] = useState({});

  // 상태 초기화
  useEffect(() => {
    if (pressRelease) {
      const initial = {};
      REPURPOSE_CHANNELS.forEach(ch => {
        initial[ch.id] = REPURPOSE_STATUS.IDLE;
      });
      setChannelStates(initial);
      // 첫 번째 채널 자동 선택
      if (!activeChannel) {
        setActiveChannel(REPURPOSE_CHANNELS[0]?.id);
      }
    }
  }, [pressRelease]);

  const handleGenerate = async (channelId) => {
    setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATING }));
    setActiveChannel(channelId);

    try {
      const result = await generateChannelContent(pressRelease, channelId, { apiKey });
      setGeneratedContents(prev => ({ ...prev, [channelId]: result }));
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATED }));
    } catch (error) {
      console.error(`채널 생성 실패: ${channelId}`, error);
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.IDLE }));
      alert(`${channelId} 생성 실패: ${error.message}`);
    }
  };

  const handleGenerateAll = async () => {
    for (const channel of REPURPOSE_CHANNELS) {
      if (channelStates[channel.id] !== REPURPOSE_STATUS.GENERATED) {
        await handleGenerate(channel.id);
      }
    }
  };

  // 보도자료 선택 화면
  const prList = (contents || []).filter(c =>
    c.channels?.pressrelease || c.track === '-'
  );

  if (!pressRelease) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-bold">채널 재가공</h2>
        <p className="text-sm text-gray-500">보도자료를 선택하면 5개 채널로 재가공할 수 있습니다.</p>
        {prList.length > 0 ? (
          <div className="space-y-2">
            {prList.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectPR?.(item)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition"
              >
                <span className="text-sm font-medium">{item.title}</span>
                <span className="text-xs text-gray-400 ml-2">{item.date}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            보도자료를 먼저 생성해주세요.
          </div>
        )}
      </div>
    );
  }

  const doneCount = Object.values(channelStates).filter(s => s === REPURPOSE_STATUS.GENERATED || s === REPURPOSE_STATUS.EDITING).length;

  return (
    <div className="space-y-4">
      {/* 상단: 원본 보도자료 + 전체 생성 */}
      <div className="flex items-center justify-between">
        <details className="flex-1">
          <summary className="text-sm font-medium cursor-pointer text-gray-700">
            ▶ 원본 보도자료: {pressRelease.title}
          </summary>
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
            {(pressRelease.body || pressRelease.draft || '').substring(0, 800)}
            {(pressRelease.body || '').length > 800 ? '...' : ''}
          </div>
        </details>
        <button
          onClick={handleGenerateAll}
          className="ml-4 px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
        >
          전체 생성 ({doneCount}/{REPURPOSE_CHANNELS.length})
        </button>
      </div>

      {/* 채널 탭 */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {REPURPOSE_CHANNELS.map(channel => {
          const state = channelStates[channel.id];
          const isActive = activeChannel === channel.id;
          const isDone = state === REPURPOSE_STATUS.GENERATED || state === REPURPOSE_STATUS.EDITING;
          const isGenerating = state === REPURPOSE_STATUS.GENERATING;

          return (
            <button
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{channel.icon}</span>
              <span>{channel.name}</span>
              {isDone && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
              {isGenerating && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* 생성 버튼 + 미리보기 */}
      {activeChannel && (
        <div>
          {/* 생성 전: 생성 버튼 */}
          {!generatedContents[activeChannel] && (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
              <p className="text-sm text-gray-400 mb-4">
                {channelStates[activeChannel] === REPURPOSE_STATUS.GENERATING
                  ? '생성 중...'
                  : `${REPURPOSE_CHANNELS.find(c => c.id === activeChannel)?.name} 콘텐츠를 생성하세요`
                }
              </p>
              {channelStates[activeChannel] !== REPURPOSE_STATUS.GENERATING && (
                <button
                  onClick={() => handleGenerate(activeChannel)}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  생성하기
                </button>
              )}
              {channelStates[activeChannel] === REPURPOSE_STATUS.GENERATING && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* 생성 후: 미리보기 */}
          {generatedContents[activeChannel] && (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (!confirm('이 채널의 생성된 콘텐츠를 삭제하시겠습니까?')) return;
                    setGeneratedContents(prev => {
                      const copy = { ...prev };
                      delete copy[activeChannel];
                      return copy;
                    });
                    setChannelStates(prev => ({ ...prev, [activeChannel]: REPURPOSE_STATUS.IDLE }));
                  }}
                  className="px-3 py-1 text-xs border border-red-300 text-red-500 rounded-md hover:bg-red-50"
                >
                  삭제
                </button>
                <button
                  onClick={() => handleGenerate(activeChannel)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  재생성
                </button>
              </div>
              <ChannelPreview
                channel={REPURPOSE_CHANNELS.find(c => c.id === activeChannel)}
                content={generatedContents[activeChannel]}
                onEdit={(updated) => {
                  setGeneratedContents(prev => ({ ...prev, [activeChannel]: updated }));
                  setChannelStates(prev => ({ ...prev, [activeChannel]: REPURPOSE_STATUS.EDITING }));
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
