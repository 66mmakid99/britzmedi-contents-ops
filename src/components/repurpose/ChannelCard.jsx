import { REPURPOSE_STATUS } from '../../constants/channels';

export default function ChannelCard({ channel, status, isActive, onGenerate, onSelect, hasContent }) {
  const isDone = status === REPURPOSE_STATUS.GENERATED || status === REPURPOSE_STATUS.EDITING ||
                 status === REPURPOSE_STATUS.APPROVED || status === REPURPOSE_STATUS.PUBLISHED;
  const isGenerating = status === REPURPOSE_STATUS.GENERATING;

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => hasContent ? onSelect() : undefined}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{channel.icon}</span>
        <span className="font-medium text-sm">{channel.name}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{channel.format}</p>
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded ${
          isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isDone ? '완료' : isGenerating ? '생성 중...' : '미생성'}
        </span>
        {isGenerating ? (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <button
            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          >
            {isDone ? '재생성' : '생성하기'}
          </button>
        )}
      </div>
    </div>
  );
}
