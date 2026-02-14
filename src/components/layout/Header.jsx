import { NAV_ITEMS } from '../../constants';

export default function Header({ activePage, setActivePage }) {
  return (
    <header className="bg-white border-b border-pale sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between">
        <div
          className="flex items-center gap-4 cursor-pointer"
          onClick={() => setActivePage('dashboard')}
        >
          <div className="font-display text-lg tracking-[5px] font-bold">
            BRITZMEDI
          </div>
          <div className="w-px h-[18px] bg-silver" />
          <div className="text-[11px] text-steel tracking-[1.5px] font-medium">
            CONTENT OPS
          </div>
        </div>
        <nav className="hidden md:flex gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`px-4 py-2 rounded-lg text-[13px] border-none cursor-pointer transition-colors ${
                activePage === item.id
                  ? 'bg-dark text-white font-bold'
                  : 'bg-transparent text-slate hover:bg-pale font-normal'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
