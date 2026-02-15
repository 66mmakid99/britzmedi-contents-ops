/**
 * 네이버 블로그 미리보기
 * - HTML 렌더링 (소제목, 이미지 위치 표시)
 */

export default function NaverBlogPreview({ content, isEditing, onEdit }) {
  if (isEditing) {
    return (
      <textarea
        className="w-full h-96 border rounded-lg p-4 text-sm font-mono"
        value={content.body || ''}
        onChange={(e) => onEdit({ ...content, body: e.target.value })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* SEO 키워드 배지 */}
      {content.seoKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-500 mr-1">SEO:</span>
          {content.seoKeywords.map((kw, i) => (
            <span key={i} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 블로그 본문 렌더링 */}
      <div className="prose max-w-none">
        {content.body?.split('\n').map((line, i) => {
          if (line.startsWith('## ')) {
            return <h2 key={i} className="text-lg font-bold mt-6 mb-2">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={i} className="text-base font-bold mt-4 mb-2">{line.replace('### ', '')}</h3>;
          }
          if (line.match(/\[IMAGE:.*\]/)) {
            return (
              <div key={i} className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-4 my-3 text-center text-sm text-gray-500">
                {line.match(/\[IMAGE:\s*(.+?)\]/)?.[1]}
              </div>
            );
          }
          if (line.trim()) {
            return <p key={i} className="text-sm leading-relaxed">{line}</p>;
          }
          return <br key={i} />;
        })}
      </div>
    </div>
  );
}
