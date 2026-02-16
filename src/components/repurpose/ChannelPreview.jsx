import { useState } from 'react';
import { stripMarkdown } from '../../lib/channelGenerate';

export default function ChannelPreview({ channel, content, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [copied, setCopied] = useState(false);

  const handleEdit = (updated) => {
    setEditedContent(updated);
    onEdit(updated);
  };

  // 복사용 텍스트 생성 — 채널에 바로 붙여넣기 가능한 형태
  const getCopyText = () => {
    const c = isEditing ? editedContent : content;
    let text = '';

    switch (channel.id) {
      case 'kakao':
        text = c.body || '';
        break;

      case 'instagram':
        text = (c.caption || c.body || '');
        if (c.hashtags?.length > 0) {
          text += '\n\n' + c.hashtags.map(t => `#${t}`).join(' ');
        }
        break;

      case 'linkedin':
        text = c.body || '';
        if (c.hashtags?.length > 0) {
          text += '\n\n' + c.hashtags.map(t => `#${t}`).join(' ');
        }
        if (c.bodyEn) {
          text += '\n\n---\n\n' + c.bodyEn;
          if (c.hashtags?.length > 0) {
            text += '\n\n' + c.hashtags.map(t => `#${t}`).join(' ');
          }
        }
        break;

      case 'naver-blog':
        text = '';
        if (c.title) text += c.title + '\n\n';
        text += c.body || '';
        if (c.tags?.length > 0) {
          text += '\n\n' + c.tags.join(', ');
        }
        break;

      case 'newsletter':
        text = '';
        if (c.title) text += c.title + '\n';
        if (c.preheader) text += c.preheader + '\n\n';
        text += c.body || '';
        break;

      default:
        text = c.body || '';
    }

    // 최종 마크다운 정리 (이중 방어)
    return stripMarkdown(text);
  };

  const handleCopy = async () => {
    const text = getCopyText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 표시용 본문 (마크다운 이중 방어)
  const displayBody = stripMarkdown(content.body || '');
  const displayCaption = stripMarkdown(content.caption || content.body || '');

  const renderPreview = () => {
    if (isEditing) {
      return (
        <textarea
          className="w-full h-64 border rounded-lg p-3 text-sm font-mono"
          value={editedContent.body || editedContent.caption || ''}
          onChange={(e) => handleEdit({
            ...editedContent,
            body: e.target.value,
            caption: channel.id === 'instagram' ? e.target.value : editedContent.caption,
          })}
        />
      );
    }

    switch (channel.id) {
      case 'kakao':
        return (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayBody}
          </div>
        );

      case 'instagram':
        return (
          <div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {displayCaption}
            </div>
            {content.imageGuide && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-500">
                <span className="font-medium">📌 이미지 가이드:</span> {content.imageGuide}
              </div>
            )}
            {content.hashtags?.length > 0 && (
              <div className="mt-3 text-sm text-blue-600 leading-relaxed">
                {content.hashtags.map(tag => `#${tag}`).join(' ')}
              </div>
            )}
          </div>
        );

      case 'linkedin':
        return (
          <div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </div>
            {/* 해시태그는 본문에서 분리되어 여기서만 표시 */}
            {content.hashtags?.length > 0 && (
              <div className="mt-3 text-sm text-blue-600">
                {content.hashtags.map(tag => `#${tag}`).join(' ')}
              </div>
            )}
            {content.bodyEn && (
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-500 cursor-pointer">
                  English Version
                </summary>
                <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                  {stripMarkdown(content.bodyEn)}
                </div>
              </details>
            )}
          </div>
        );

      case 'naver-blog':
        return (
          <div>
            {content.title && (
              <h4 className="font-bold text-base mb-3">{content.title}</h4>
            )}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </div>
            {content.seoKeywords?.length > 0 && (
              <div className="mt-3 text-xs text-gray-400">
                SEO: {content.seoKeywords.join(', ')}
              </div>
            )}
            {content.tags?.length > 0 && (
              <div className="mt-2 text-sm text-blue-600">
                {content.tags.join(', ')}
              </div>
            )}
          </div>
        );

      case 'newsletter':
        return (
          <div>
            {content.title && (
              <h4 className="font-bold text-base mb-1">{content.title}</h4>
            )}
            {content.preheader && (
              <p className="text-xs text-gray-400 mb-3">{content.preheader}</p>
            )}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {displayBody}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayBody}
          </div>
        );
    }
  };

  // 글자수 계산
  const charCount = (content.body || content.caption || '').length;
  const minChar = channel.charRange?.min || 0;
  const maxChar = channel.charRange?.max || 9999;
  const isInRange = charCount >= minChar && charCount <= maxChar;

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="font-bold text-sm">
          {channel.icon} {channel.name} 미리보기
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {isEditing ? '미리보기' : '편집'}
          </button>
          <button
            onClick={handleCopy}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 text-white hover:bg-gray-900'
            }`}
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-5 py-4">
        {renderPreview()}
      </div>

      {/* 글자수 */}
      <div className="px-5 py-2 border-t border-gray-50 flex justify-end">
        <span className={`text-xs ${isInRange ? 'text-gray-400' : 'text-red-500 font-medium'}`}>
          {charCount}자 ({minChar}~{maxChar}자 권장)
        </span>
      </div>
    </div>
  );
}
