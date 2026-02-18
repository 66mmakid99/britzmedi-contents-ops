/**
 * 보도자료 외 콘텐츠 유형의 입력 폼
 * CONTENT_TYPES[type].fields를 기반으로 동적 폼 생성
 */
import { useState } from 'react';
import { CONTENT_TYPES, PRODUCT_OPTIONS, getAutoCheckedChannels } from '../../constants/contentTypes';
import { REPURPOSE_CHANNELS } from '../../constants/channels';

export default function GeneralContentForm({ contentType, onBack, onSubmit }) {
  const typeConfig = CONTENT_TYPES[contentType];
  const [metadata, setMetadata] = useState({});
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [selectedChannels, setSelectedChannels] = useState(
    getAutoCheckedChannels(contentType)
  );

  const handleFieldChange = (key, value) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    onSubmit({
      type: contentType,
      title: title || `${typeConfig.label} - ${new Date().toLocaleDateString('ko-KR')}`,
      body,
      metadata,
      channels: selectedChannels,
      date: new Date().toISOString().slice(0, 10),
    });
  };

  const canSubmit = () => {
    const requiredFields = (typeConfig.fields || []).filter(f => f.required);
    const allFilled = requiredFields.every(f => metadata[f.key]?.trim());
    return (body.trim() || allFilled) && selectedChannels.length > 0;
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-steel text-sm border-none bg-transparent cursor-pointer hover:text-dark">← 유형 다시 선택</button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{typeConfig.icon}</span>
        <h2 className="text-lg font-bold">{typeConfig.label}</h2>
      </div>
      <p className="text-[12px] text-mist">{typeConfig.description}</p>

      {/* 제목 (공통) */}
      <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
        <div>
          <label className="text-[13px] font-bold">제목 (선택)</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="비워두면 자동 생성됩니다"
            className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] outline-none focus:border-accent bg-snow"
          />
        </div>

        {/* 유형별 필드 (동적 렌더링) */}
        {typeConfig.fields?.map(field => (
          <div key={field.key}>
            <label className="text-[13px] font-bold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </label>
            {renderField(field, metadata[field.key] || '', (val) => handleFieldChange(field.key, val))}
          </div>
        ))}

        {/* 자유 텍스트 (공통) */}
        <div>
          <label className="text-[13px] font-bold">내용 (자유 입력)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="핵심 내용을 자유롭게 적어주세요. AI가 채널별로 정리합니다."
            className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y"
          />
          <div className="text-[11px] text-mist text-right mt-1">{body.length}자</div>
        </div>
      </div>

      {/* 채널 선택 (자동 추천 + 수동 변경) */}
      <div className="bg-white rounded-xl p-5 border border-pale space-y-3">
        <label className="text-[13px] font-bold">발행 채널</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {REPURPOSE_CHANNELS.map(ch => {
            const fit = typeConfig.channelFit[ch.id] || 0;
            if (fit === 0) return null;
            const isSelected = selectedChannels.includes(ch.id);
            return (
              <button
                key={ch.id}
                onClick={() => setSelectedChannels(prev =>
                  isSelected ? prev.filter(id => id !== ch.id) : [...prev, ch.id]
                )}
                className={`px-3 py-1.5 rounded-full text-[12px] border cursor-pointer transition-colors ${
                  isSelected ? 'bg-dark text-white border-dark' : 'bg-white text-steel border-pale hover:bg-snow'
                }`}
              >
                {ch.icon} {ch.name} {fit === 3 ? '★' : ''}
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-mist">★ = 이 유형에 최적인 채널 (자동 선택됨)</div>
      </div>

      {/* 생성 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit()}
        className={`w-full py-3.5 rounded-lg text-[14px] font-bold border-none transition-colors cursor-pointer ${
          canSubmit() ? 'bg-accent text-white hover:bg-accent/90' : 'bg-pale text-mist cursor-not-allowed'
        }`}
      >
        {selectedChannels.length}개 채널 콘텐츠 생성하기
      </button>
    </div>
  );
}

// 필드 타입별 렌더링 헬퍼
function renderField(field, value, onChange) {
  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder || ''}
          className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] leading-[1.7] outline-none focus:border-accent bg-snow resize-y"
        />
      );

    case 'select':
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] outline-none focus:border-accent bg-snow"
        >
          <option value="">선택하세요</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'product_select':
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] outline-none focus:border-accent bg-snow"
        >
          <option value="">제품 선택</option>
          {PRODUCT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder || ''}
          className="w-full mt-1 px-3 py-2 border border-pale rounded-lg text-[13px] outline-none focus:border-accent bg-snow"
        />
      );
  }
}
