/**
 * RepurposeHub: 보도자료 선택 → 4채널 재가공 허브
 */

import { useState, useEffect } from 'react';
import { REPURPOSE_CHANNELS, REPURPOSE_STATUS } from '../../constants/channels';
import ChannelCard from './ChannelCard';
import ChannelPreview from './ChannelPreview';
import { generateChannelContent } from '../../lib/channelGenerate';

export default function RepurposeHub({ pressRelease, apiKey, contents, onSelectPR }) {
  const [channelStates, setChannelStates] = useState({});
  const [activeChannel, setActiveChannel] = useState(null);
  const [generatedContents, setGeneratedContents] = useState({});

  // 각 채널의 상태 초기화
  useEffect(() => {
    if (pressRelease) {
      const initial = {};
      REPURPOSE_CHANNELS.forEach(ch => {
        initial[ch.id] = REPURPOSE_STATUS.IDLE;
      });
      setChannelStates(initial);
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
    }
  };

  // Press release selection from contents list
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">채널 재가공</h2>

      {/* 원본 보도자료 요약 */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="font-semibold cursor-pointer">
          원본 보도자료: {pressRelease.title}
        </summary>
        <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
          {(pressRelease.body || pressRelease.draft || '').substring(0, 500)}...
        </div>
      </details>

      {/* 5채널 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {REPURPOSE_CHANNELS.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            status={channelStates[channel.id]}
            isActive={activeChannel === channel.id}
            onGenerate={() => handleGenerate(channel.id)}
            onSelect={() => setActiveChannel(channel.id)}
            hasContent={!!generatedContents[channel.id]}
          />
        ))}
      </div>

      {/* 선택된 채널 미리보기 */}
      {activeChannel && generatedContents[activeChannel] && (
        <ChannelPreview
          channel={REPURPOSE_CHANNELS.find(c => c.id === activeChannel)}
          content={generatedContents[activeChannel]}
          onEdit={(updated) => {
            setGeneratedContents(prev => ({ ...prev, [activeChannel]: updated }));
            setChannelStates(prev => ({ ...prev, [activeChannel]: REPURPOSE_STATUS.EDITING }));
          }}
        />
      )}
    </div>
  );
}
