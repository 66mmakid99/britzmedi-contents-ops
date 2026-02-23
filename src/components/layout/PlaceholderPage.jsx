import { Construction } from 'lucide-react';

const PLACEHOLDER_INFO = {
  'chatbot-stats': { title: '챗봇 통계', desc: '챗봇 이용 현황, 응답률, 만족도 등 통계를 확인합니다.' },
  'chatbot-escalation': { title: '미응답/에스컬레이션', desc: '챗봇이 응답하지 못한 질문과 에스컬레이션 내역을 관리합니다.' },
  'chatbot-faq': { title: 'FAQ 관리', desc: '챗봇이 학습할 FAQ를 추가·편집·삭제합니다.' },
  'chatbot-settings': { title: '챗봇 설정', desc: '챗봇 인사말, 톤, 응답 규칙 등을 설정합니다.' },
  'website-products': { title: '제품 정보 수정', desc: 'britzmedi.co.kr에 노출되는 제품 정보를 수정합니다.' },
  'website-inquiries': { title: '문의 접수 관리', desc: '홈페이지를 통해 접수된 문의를 확인하고 관리합니다.' },
  'leads-tracking': { title: '리드 상태 추적', desc: '리드의 단계별 진행 상황을 추적합니다.' },
  'leads-conversion': { title: '전환율', desc: '문의 → 리드 → 고객 전환 퍼널을 분석합니다.' },
  'settings-api': { title: 'API 키 관리', desc: 'Claude, Supabase 등 외부 API 키를 관리합니다.' },
  'settings-channel': { title: '채널 연동', desc: '이메일, 카카오톡, 네이버 블로그 등 채널 연동을 설정합니다.' },
  'settings-users': { title: '사용자/권한', desc: '관리자 계정과 접근 권한을 관리합니다.' },
};

export default function PlaceholderPage({ pageId }) {
  const info = PLACEHOLDER_INFO[pageId] || { title: pageId, desc: '' };

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-5">
        <Construction size={28} className="text-accent" />
      </div>
      <h2 className="text-lg font-bold text-dark mb-2">{info.title}</h2>
      <p className="text-[13px] text-steel mb-1 max-w-sm">{info.desc}</p>
      <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent/10 text-accent text-[12px] font-medium">
        <Construction size={14} />
        준비중입니다
      </div>
    </div>
  );
}
