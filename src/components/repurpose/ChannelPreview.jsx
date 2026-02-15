import { useState } from 'react';
import NaverBlogPreview from './previews/NaverBlogPreview';
import InstagramCarouselPreview from './previews/InstagramPreview';

export default function ChannelPreview({ channel, content, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const handleEdit = (updated) => {
    setEditedContent(updated);
    onEdit(updated);
  };

  const handleCopy = async () => {
    let textToCopy = '';

    switch (channel.id) {
      case 'naver-blog':
        textToCopy = content.body || '';
        break;
      case 'kakao':
        textToCopy = content.body || '';
        break;
      case 'instagram':
        textToCopy = [
          ...(content.slides || []).map((s, i) => `[슬라이드 ${i + 1}]\n${s}`),
          '',
          '---해시태그---',
          (content.hashtags || []).map(t => `#${t}`).join(' ')
        ].join('\n\n');
        break;
      case 'linkedin':
        textToCopy = content.body || '';
        if (content.bodyEn) {
          textToCopy += '\n\n---English---\n\n' + content.bodyEn;
        }
        break;
      default:
        textToCopy = content.body || '';
    }

    await navigator.clipboard.writeText(textToCopy);
  };

  const renderPreview = () => {
    switch (channel.id) {
      case 'naver-blog':
        return <NaverBlogPreview content={content} isEditing={isEditing} onEdit={handleEdit} />;
      case 'instagram':
        return <InstagramCarouselPreview content={content} isEditing={isEditing} onEdit={handleEdit} />;
      case 'kakao':
      case 'linkedin':
      default:
        return (
          <div>
            {content.title && <h4 className="font-bold mb-2">{content.title}</h4>}
            {isEditing ? (
              <textarea
                className="w-full h-64 border rounded-lg p-3 text-sm"
                value={editedContent.body || ''}
                onChange={(e) => handleEdit({ ...editedContent, body: e.target.value })}
              />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{content.body}</div>
            )}
            {content.hashtags?.length > 0 && (
              <div className="mt-3 text-sm text-blue-600">
                {content.hashtags.map(tag => `#${tag}`).join(' ')}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {channel.icon} {channel.name} 미리보기
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
          >
            {isEditing ? '미리보기' : '편집'}
          </button>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            복사
          </button>
        </div>
      </div>

      <div className="prose max-w-none">
        {renderPreview()}
      </div>

      {/* 글자수 카운터 */}
      <div className="mt-3 text-xs text-gray-400 text-right">
        {(content.body || '').length}자
        ({channel.charRange.min}~{channel.charRange.max}자 권장)
      </div>
    </div>
  );
}
