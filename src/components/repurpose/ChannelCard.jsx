import { REPURPOSE_STATUS } from '../../constants/channels';

const STATUS_LABELS = {
  [REPURPOSE_STATUS.IDLE]: { text: '미생성', color: 'bg-gray-100 text-gray-500' },
  [REPURPOSE_STATUS.GENERATING]: { text: '생성 중...', color: 'bg-blue-100 text-blue-600' },
  [REPURPOSE_STATUS.GENERATED]: { text: '완료', color: 'bg-green-100 text-green-600' },
  [REPURPOSE_STATUS.EDITING]: { text: '수정 중', color: 'bg-yellow-100 text-yellow-600' },
  [REPURPOSE_STATUS.APPROVED]: { text: '승인됨', color: 'bg-purple-100 text-purple-600' },
  [REPURPOSE_STATUS.PUBLISHED]: { text: '발행됨', color: 'bg-indigo-100 text-indigo-600' },
};

export default function ChannelCard({ channel, status, isActive, onGenerate, onSelect, hasContent }) {
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS[REPURPOSE_STATUS.IDLE];

  return (
    <div
      className={`
        rounded-xl border-2 p-4 cursor-pointer transition-all
        ${isActive ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={hasContent ? onSelect : undefined}
    >
      <div className="text-3xl mb-2">{channel.icon}</div>
      <h3 className="font-bold text-sm">{channel.name}</h3>
      <p className="text-xs text-gray-500 mt-1">{channel.format}</p>
      <p className="text-xs text-gray-400">
        {channel.slideCount
          ? `${channel.slideCount.min}-${channel.slideCount.max}장`
          : `${channel.charRange.min.toLocaleString()}-${channel.charRange.max.toLocaleString()}자`
        }
      </p>

      {/* 상태 배지 */}
      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>

      {/* 생성 버튼 */}
      {(status === REPURPOSE_STATUS.IDLE || status === REPURPOSE_STATUS.GENERATED) && (
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          className="mt-3 w-full py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition"
        >
          {status === REPURPOSE_STATUS.GENERATED ? '재생성' : '생성하기'}
        </button>
      )}

      {status === REPURPOSE_STATUS.GENERATING && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          AI 생성 중...
        </div>
      )}
    </div>
  );
}
