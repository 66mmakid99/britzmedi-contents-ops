/**
 * RepurposeHub: 보도자료 선택 → 5채널 재가공 허브
 * Phase 2-B: 생성 → 검수 → 보정 파이프라인
 * Phase 2-C: 수정 포인트 재생성
 */

import { useState, useEffect, useRef } from 'react';
import { REPURPOSE_CHANNELS, REPURPOSE_STATUS } from '../../constants/channels';
import ChannelPreview from './ChannelPreview';
import { generateChannelContent, reviewChannelContent, autoFixChannelContent } from '../../lib/channelGenerate';
import { saveChannelContent, saveEditHistory } from '../../lib/supabaseData';
import { calculateEditMetrics, formatReviewReason, formatFixPattern } from '../../lib/editUtils';

export default function RepurposeHub({ pressRelease, apiKey, contents, onSelectPR }) {
  const [channelStates, setChannelStates] = useState({});
  const [activeChannel, setActiveChannel] = useState(null);
  const [generatedContents, setGeneratedContents] = useState({});

  // Phase 2-B: 채널별 검수 결과 + 초안 보관
  const [channelReviews, setChannelReviews] = useState({});
  const rawDraftsRef = useRef({});

  // Phase 2-C: 수정 포인트
  const [editPoints, setEditPoints] = useState({});

  // 상태 초기화
  useEffect(() => {
    if (pressRelease) {
      const initial = {};
      REPURPOSE_CHANNELS.forEach(ch => {
        initial[ch.id] = REPURPOSE_STATUS.IDLE;
      });
      setChannelStates(initial);
      if (!activeChannel) {
        setActiveChannel(REPURPOSE_CHANNELS[0]?.id);
      }
    }
  }, [pressRelease]);

  const handleGenerate = async (channelId) => {
    setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATING }));
    setActiveChannel(channelId);

    try {
      // STEP 1: 생성
      const result = await generateChannelContent(pressRelease, channelId, { apiKey });
      const rawText = result?.body || result?.caption || (typeof result === 'string' ? result : JSON.stringify(result));

      // 초안 캡처
      rawDraftsRef.current[channelId] = rawText;

      // STEP 2: 검수
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.REVIEWING }));
      const prBody = pressRelease.body || pressRelease.draft || '';
      const reviewResult = await reviewChannelContent(channelId, rawText, prBody, apiKey);
      setChannelReviews(prev => ({ ...prev, [channelId]: reviewResult }));

      let finalResult = result;
      let fixResult = null;

      // STEP 3: 이슈가 있으면 보정
      const hasIssues = reviewResult.issues?.some(i => i.severity === 'red' || i.severity === 'critical');
      if (hasIssues) {
        setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.FIXING }));
        fixResult = await autoFixChannelContent(channelId, rawText, reviewResult, prBody, apiKey);

        if (fixResult?.fixedContent && fixResult.fixedContent !== rawText) {
          // 보정된 텍스트로 결과 업데이트
          finalResult = { ...result, body: fixResult.fixedContent };
          if (result.caption !== undefined) {
            finalResult.caption = fixResult.fixedContent;
          }
          finalResult.charCount = fixResult.fixedContent.length;
        }
      }

      setGeneratedContents(prev => ({ ...prev, [channelId]: finalResult }));
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATED }));

      // Supabase 저장 (백그라운드)
      if (pressRelease.id && typeof pressRelease.id === 'string') {
        (async () => {
          try {
            // ai_draft로 초안 저장
            const savedRow = await saveChannelContent(pressRelease.id, channelId, rawText);

            // 보정이 있었으면 edit_history 저장
            const finalText = fixResult?.fixedContent || rawText;
            if (savedRow?.id && rawText !== finalText) {
              const { editDistance, editRatio } = calculateEditMetrics(rawText, finalText);

              await saveEditHistory({
                content_type: 'channel',
                content_id: savedRow.id,
                channel: channelId,
                before_text: rawText,
                after_text: finalText,
                edit_type: 'auto_channel_review',
                edit_pattern: formatFixPattern(fixResult?.fixes),
                edit_reason: formatReviewReason(reviewResult),
              });

              console.log(`[Phase2-B] edit_history 저장: ${channelId} (distance: ${editDistance}, ratio: ${editRatio})`);
            }
          } catch (e) {
            console.error(`[Phase2-B] DB 저장 실패: ${channelId}`, e.message);
          }
        })();
      }
    } catch (error) {
      console.error(`채널 생성 실패: ${channelId}`, error);
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.IDLE }));
      alert(`${channelId} 생성 실패: ${error.message}`);
    }
  };

  // Phase 2-C: 수정 포인트 재생성
  const handleRegenerate = async (channelId) => {
    console.log('[재생성] 클릭됨', channelId, 'state:', channelStates[channelId]);
    const beforeContent = generatedContents[channelId];
    const beforeText = beforeContent?.body || beforeContent?.caption || '';
    const editPoint = editPoints[channelId] || '';

    // 수정 포인트가 있으면 pressRelease에 주입
    const prBody = pressRelease.body || pressRelease.draft || '';
    console.log('[재생성] prBody 길이:', prBody.length, 'editPoint:', editPoint || '(없음)');
    const prWithEditPoint = editPoint
      ? { ...pressRelease, body: prBody + `\n\n[사용자 수정 포인트]\n${editPoint}\n위 포인트를 반드시 반영하여 수정하세요.` }
      : pressRelease;

    setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATING }));

    try {
      console.log('[재생성] API 호출 시작:', channelId);
      const result = await generateChannelContent(prWithEditPoint, channelId, { apiKey });
      const rawText = result?.body || result?.caption || '';

      rawDraftsRef.current[channelId] = rawText;

      // 검수 + 보정
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.REVIEWING }));
      const prBody = pressRelease.body || pressRelease.draft || '';
      const reviewResult = await reviewChannelContent(channelId, rawText, prBody, apiKey);
      setChannelReviews(prev => ({ ...prev, [channelId]: reviewResult }));

      let finalResult = result;
      let fixResult = null;

      const hasIssues = reviewResult.issues?.some(i => i.severity === 'red' || i.severity === 'critical');
      if (hasIssues) {
        setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.FIXING }));
        fixResult = await autoFixChannelContent(channelId, rawText, reviewResult, prBody, apiKey);
        if (fixResult?.fixedContent && fixResult.fixedContent !== rawText) {
          finalResult = { ...result, body: fixResult.fixedContent };
          if (result.caption !== undefined) finalResult.caption = fixResult.fixedContent;
          finalResult.charCount = fixResult.fixedContent.length;
        }
      }

      setGeneratedContents(prev => ({ ...prev, [channelId]: finalResult }));
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATED }));

      // Phase 2-C: 재생성 edit_history 저장
      const afterText = finalResult?.body || finalResult?.caption || '';
      if (pressRelease.id && typeof pressRelease.id === 'string' && beforeText !== afterText) {
        (async () => {
          try {
            const savedRow = await saveChannelContent(pressRelease.id, channelId, afterText);
            if (savedRow?.id) {
              await saveEditHistory({
                content_type: 'channel',
                content_id: savedRow.id,
                channel: channelId,
                before_text: beforeText,
                after_text: afterText,
                edit_type: 'manual_regenerate',
                edit_pattern: null,
                edit_reason: editPoint || '재생성 (수정 포인트 없음)',
              });
              console.log(`[Phase2-C] 재생성 edit_history 저장: ${channelId}`);
            }
          } catch (e) {
            console.error(`[Phase2-C] DB 저장 실패: ${channelId}`, e.message);
          }
        })();
      }

      setEditPoints(prev => ({ ...prev, [channelId]: '' }));
      console.log('[재생성] 완료:', channelId);
    } catch (error) {
      console.error(`[재생성] 실패:`, channelId, error);
      setChannelStates(prev => ({ ...prev, [channelId]: REPURPOSE_STATUS.GENERATED }));
      alert(`${channelId} 재생성 실패: ${error.message}`);
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

  // 상태별 표시 텍스트
  const getStatusText = (state) => {
    switch (state) {
      case REPURPOSE_STATUS.GENERATING: return '생성 중...';
      case REPURPOSE_STATUS.REVIEWING: return '검수 중...';
      case REPURPOSE_STATUS.FIXING: return '보정 중...';
      default: return '';
    }
  };

  const isProcessing = (state) =>
    state === REPURPOSE_STATUS.GENERATING ||
    state === REPURPOSE_STATUS.REVIEWING ||
    state === REPURPOSE_STATUS.FIXING;

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
          const processing = isProcessing(state);

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
              {processing && <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />}
            </button>
          );
        })}
      </div>

      {/* 생성 버튼 + 미리보기 */}
      {activeChannel && (
        <div>
          {/* 생성 전 또는 진행 중 */}
          {!generatedContents[activeChannel] && (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-xl">
              <p className="text-sm text-gray-400 mb-4">
                {isProcessing(channelStates[activeChannel])
                  ? getStatusText(channelStates[activeChannel])
                  : `${REPURPOSE_CHANNELS.find(c => c.id === activeChannel)?.name} 콘텐츠를 생성하세요`
                }
              </p>
              {!isProcessing(channelStates[activeChannel]) && (
                <button
                  onClick={() => handleGenerate(activeChannel)}
                  className="px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  생성하기
                </button>
              )}
              {isProcessing(channelStates[activeChannel]) && (
                <div className="flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* 생성 후: 미리보기 */}
          {generatedContents[activeChannel] && (
            <div className="space-y-3">
              {/* 검수 결과 요약 배지 */}
              {channelReviews[activeChannel] && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">검수:</span>
                  {channelReviews[activeChannel].summary.critical > 0 && (
                    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                      🔴 {channelReviews[activeChannel].summary.critical}
                    </span>
                  )}
                  {channelReviews[activeChannel].summary.warning > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full">
                      🟡 {channelReviews[activeChannel].summary.warning}
                    </span>
                  )}
                  {channelReviews[activeChannel].summary.critical === 0 && channelReviews[activeChannel].summary.warning === 0 && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                      ✅ 이슈 없음
                    </span>
                  )}
                  {rawDraftsRef.current[activeChannel] &&
                   generatedContents[activeChannel]?.body !== rawDraftsRef.current[activeChannel] && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                      자동 보정됨
                    </span>
                  )}
                </div>
              )}

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
                    setChannelReviews(prev => {
                      const copy = { ...prev };
                      delete copy[activeChannel];
                      return copy;
                    });
                  }}
                  className="px-3 py-1 text-xs border border-red-300 text-red-500 rounded-md hover:bg-red-50"
                >
                  삭제
                </button>
                <button
                  onClick={() => handleRegenerate(activeChannel)}
                  disabled={isProcessing(channelStates[activeChannel])}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  재생성
                </button>
              </div>

              {/* Phase 2-C: 수정 포인트 입력 */}
              <div>
                <textarea
                  placeholder="수정 포인트 (선택): 예) 태국 시장 부분을 더 강조해줘"
                  value={editPoints[activeChannel] || ''}
                  onChange={(e) => setEditPoints(prev => ({ ...prev, [activeChannel]: e.target.value }))}
                  rows={2}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
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
