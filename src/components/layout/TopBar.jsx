import { Menu } from 'lucide-react';

// activePage → 사람이 읽을 수 있는 breadcrumb
const PAGE_TITLES = {
  dashboard: '대시보드',
  create: 'Content Factory / 콘텐츠 제작',
  repurpose: 'Content Factory / 채널 재가공',
  pipeline: 'Content Factory / 파이프라인',
  publish: 'Content Factory / 발행관리',
  knowledge: 'Content Factory / 지식베이스',
  calendar: '캘린더',
  chatbot: '챗봇 관리 / 대화 내역',
  website: '홈페이지 관리 / 블로그·뉴스 발행',
  leads: '리드 관리 / 문의 목록',
};

export default function TopBar({ activePage, onMenuClick }) {
  const title = PAGE_TITLES[activePage] || activePage;
  const parts = title.split(' / ');

  return (
    <header className="h-14 bg-white border-b border-pale flex items-center px-4 md:px-6 sticky top-0 z-30">
      {/* 모바일 햄버거 */}
      <button
        onClick={onMenuClick}
        className="md:hidden mr-3 text-steel hover:text-dark border-none bg-transparent cursor-pointer"
      >
        <Menu size={22} />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        {parts.map((part, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-silver">/</span>}
            <span className={i === parts.length - 1 ? 'text-dark font-semibold' : 'text-steel'}>
              {part}
            </span>
          </span>
        ))}
      </div>
    </header>
  );
}
