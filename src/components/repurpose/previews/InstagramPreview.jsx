/**
 * 인스타그램 캐러셀 미리보기
 * - 슬라이드 카드 형태
 * - 좌우 스크롤 (실제 인스타 느낌)
 */
import { useState } from 'react';

export default function InstagramCarouselPreview({ content, isEditing, onEdit }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = content.slides || [];

  if (isEditing) {
    return (
      <div className="space-y-3">
        {slides.map((slide, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-xs font-bold text-purple-600 pt-2 w-12">#{i + 1}</span>
            <textarea
              className="flex-1 border rounded-lg p-2 text-sm h-20"
              value={slide}
              onChange={(e) => {
                const newSlides = [...slides];
                newSlides[i] = e.target.value;
                onEdit({ ...content, slides: newSlides });
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* 캐러셀 뷰 */}
      <div className="relative bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl aspect-square max-w-sm mx-auto flex items-center justify-center p-8">
        <div className="text-center text-white">
          <p className="text-xs font-bold opacity-70 mb-2">슬라이드 {currentSlide + 1}/{slides.length}</p>
          <p className="text-lg font-bold leading-relaxed">{slides[currentSlide]}</p>
        </div>

        {/* 좌우 버튼 */}
        {currentSlide > 0 && (
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/30 rounded-full w-8 h-8 text-white"
            onClick={() => setCurrentSlide(prev => prev - 1)}
          >&larr;</button>
        )}
        {currentSlide < slides.length - 1 && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/30 rounded-full w-8 h-8 text-white"
            onClick={() => setCurrentSlide(prev => prev + 1)}
          >&rarr;</button>
        )}
      </div>

      {/* 슬라이드 인디케이터 */}
      <div className="flex justify-center gap-1.5 mt-3">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full transition ${i === currentSlide ? 'bg-purple-600' : 'bg-gray-300'}`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      {/* 해시태그 */}
      {content.hashtags?.length > 0 && (
        <div className="mt-4 text-sm text-blue-600 leading-relaxed">
          {content.hashtags.map(tag => `#${tag}`).join(' ')}
        </div>
      )}
    </div>
  );
}
