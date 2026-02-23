import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  PenTool,
  RefreshCw,
  GitBranch,
  Send,
  BookOpen,
  Bot,
  MessageSquare,
  BarChart3,
  AlertCircle,
  HelpCircle,
  Settings as SettingsIcon,
  Globe,
  FileText,
  Package,
  Mail,
  Users,
  UserCheck,
  TrendingUp,
  Key,
  Link2,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';

// =====================================================
// 사이드바 메뉴 정의
// =====================================================

const SIDEBAR_MENU = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: LayoutDashboard,
    type: 'page',
  },
  {
    id: 'content-factory',
    label: 'Content Factory',
    icon: PenTool,
    type: 'group',
    children: [
      { id: 'create', label: '콘텐츠 제작', icon: PenTool, type: 'page' },
      { id: 'repurpose', label: '채널 재가공', icon: RefreshCw, type: 'page' },
      { id: 'pipeline', label: '파이프라인', icon: GitBranch, type: 'page' },
      { id: 'publish', label: '발행관리', icon: Send, type: 'page' },
      { id: 'knowledge', label: '지식베이스', icon: BookOpen, type: 'page' },
    ],
  },
  {
    id: 'chatbot-group',
    label: '챗봇 관리',
    icon: Bot,
    type: 'group',
    children: [
      { id: 'chatbot', label: '대화 내역', icon: MessageSquare, type: 'page' },
      { id: 'chatbot-stats', label: '통계', icon: BarChart3, type: 'placeholder' },
      { id: 'chatbot-escalation', label: '미응답/에스컬레이션', icon: AlertCircle, type: 'placeholder' },
      { id: 'chatbot-faq', label: 'FAQ 관리', icon: HelpCircle, type: 'placeholder' },
      { id: 'chatbot-settings', label: '설정', icon: SettingsIcon, type: 'placeholder' },
    ],
  },
  {
    id: 'website-group',
    label: '홈페이지 관리',
    icon: Globe,
    type: 'group',
    children: [
      { id: 'website', label: '블로그/뉴스 발행', icon: FileText, type: 'page' },
      { id: 'website-products', label: '제품 정보 수정', icon: Package, type: 'placeholder' },
      { id: 'website-inquiries', label: '문의 접수 관리', icon: Mail, type: 'placeholder' },
    ],
  },
  {
    id: 'leads-group',
    label: '리드 관리',
    icon: Users,
    type: 'group',
    children: [
      { id: 'leads', label: '문의 목록', icon: Mail, type: 'page' },
      { id: 'leads-tracking', label: '리드 상태 추적', icon: UserCheck, type: 'placeholder' },
      { id: 'leads-conversion', label: '전환율', icon: TrendingUp, type: 'placeholder' },
    ],
  },
  {
    id: 'settings-group',
    label: '설정',
    icon: SettingsIcon,
    type: 'group',
    children: [
      { id: 'settings-api', label: 'API 키 관리', icon: Key, type: 'placeholder' },
      { id: 'settings-channel', label: '채널 연동', icon: Link2, type: 'placeholder' },
      { id: 'settings-users', label: '사용자/권한', icon: Shield, type: 'placeholder' },
    ],
  },
];

// activePage → 어떤 그룹에 속하는지
function findGroupForPage(pageId) {
  for (const item of SIDEBAR_MENU) {
    if (item.type === 'group' && item.children) {
      if (item.children.some((c) => c.id === pageId)) return item.id;
    }
  }
  return null;
}

// =====================================================
// Sidebar 컴포넌트
// =====================================================

export default function Sidebar({ activePage, setActivePage, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, signOut, isBypass } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const g = findGroupForPage(activePage);
    return g ? { [g]: true } : { 'content-factory': true };
  });

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleNav = (item) => {
    if (item.type === 'placeholder') {
      setActivePage(item.id);
    } else {
      setActivePage(item.id);
    }
    setMobileOpen(false);
  };

  // activePage가 바뀌면 해당 그룹을 자동 확장
  const activeGroup = findGroupForPage(activePage);
  if (activeGroup && !expandedGroups[activeGroup]) {
    setExpandedGroups((prev) => ({ ...prev, [activeGroup]: true }));
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* 로고 */}
      <div className="h-14 flex items-center px-4 border-b border-white/10 shrink-0">
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} className="w-full flex justify-center text-white/70 hover:text-white border-none bg-transparent cursor-pointer">
            <Menu size={20} />
          </button>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-[15px] tracking-[3px]">BRITZMEDI</span>
              <span className="text-[10px] text-white/40 tracking-[1px]">OPS</span>
            </div>
            <button onClick={() => setCollapsed(true)} className="text-white/40 hover:text-white/70 border-none bg-transparent cursor-pointer hidden md:block">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {SIDEBAR_MENU.map((item) => {
          if (item.type === 'page') {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] border-none cursor-pointer transition-all mb-0.5 ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'bg-transparent text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {isActive && !collapsed && <div className="absolute left-0 w-[3px] h-6 bg-accent rounded-r-full" />}
              </button>
            );
          }

          // Group
          const Icon = item.icon;
          const isExpanded = expandedGroups[item.id];
          const hasActivePage = item.children?.some((c) => c.id === activePage);

          return (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => (collapsed ? setCollapsed(false) : toggleGroup(item.id))}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] border-none cursor-pointer transition-all ${
                  hasActivePage
                    ? 'bg-white/10 text-white font-semibold'
                    : 'bg-transparent text-white/60 hover:bg-white/8 hover:text-white/90'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {isExpanded ? <ChevronDown size={14} className="shrink-0 text-white/40" /> : <ChevronRight size={14} className="shrink-0 text-white/40" />}
                  </>
                )}
              </button>

              {/* 하위 메뉴 */}
              {!collapsed && isExpanded && item.children && (
                <div className="ml-4 pl-3 border-l border-white/10 mt-0.5 mb-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = activePage === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleNav(child)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] border-none cursor-pointer transition-all ${
                          isChildActive
                            ? 'bg-white/15 text-white font-semibold'
                            : 'bg-transparent text-white/50 hover:bg-white/8 hover:text-white/80'
                        }`}
                      >
                        <ChildIcon size={15} className="shrink-0" />
                        <span className="truncate">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 하단: 사용자 + 로그아웃 */}
      {!collapsed && !isBypass && user && (
        <div className="border-t border-white/10 p-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 text-[11px] font-bold shrink-0">
              {(user.email?.[0] || 'A').toUpperCase()}
            </div>
            <span className="text-[11px] text-white/50 truncate flex-1">{user.email}</span>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-white/50 hover:text-white/80 hover:bg-white/8 border-none bg-transparent cursor-pointer transition-all"
          >
            <LogOut size={15} />
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-[250px]'
        }`}
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {sidebarContent}
      </aside>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 left-0 h-full w-[280px] flex flex-col" style={{ backgroundColor: '#1a1a2e' }}>
            <div className="absolute top-3 right-3">
              <button onClick={() => setMobileOpen(false)} className="text-white/50 hover:text-white border-none bg-transparent cursor-pointer">
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

// placeholder 메뉴인지 확인하는 유틸
export function isPlaceholderPage(pageId) {
  for (const item of SIDEBAR_MENU) {
    if (item.type === 'group' && item.children) {
      const child = item.children.find((c) => c.id === pageId);
      if (child && child.type === 'placeholder') return true;
    }
  }
  return false;
}
