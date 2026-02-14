import { NAV_ITEMS } from '../../constants';

export default function BottomNav({ activePage, setActivePage }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-pale flex z-50 pb-[env(safe-area-inset-bottom,0)] md:hidden">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePage(item.id)}
          className={`flex-1 py-2 pb-1.5 border-none bg-transparent cursor-pointer flex flex-col items-center gap-0.5 transition-colors ${
            activePage === item.id
              ? 'text-dark font-bold'
              : 'text-mist font-normal'
          }`}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span className="text-[9px] tracking-wide">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
