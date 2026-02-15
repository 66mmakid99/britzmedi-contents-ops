export const PIPELINE_STAGES = [
  { id: 'draft', name: '초안', icon: '📝', color: 'bg-gray-100 text-gray-600' },
  { id: 'review', name: '검토', icon: '🔍', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'approved', name: '승인', icon: '✅', color: 'bg-green-100 text-green-700' },
  { id: 'published', name: '발행', icon: '🚀', color: 'bg-blue-100 text-blue-700' },
];

export const PRIORITY_LEVELS = [
  { id: 'low', name: '낮음', color: 'text-gray-400' },
  { id: 'normal', name: '보통', color: 'text-blue-500' },
  { id: 'high', name: '높음', color: 'text-orange-500' },
  { id: 'urgent', name: '긴급', color: 'text-red-600' },
];
