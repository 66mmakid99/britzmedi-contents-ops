export const NAV_ITEMS = [
  { id: 'dashboard', label: '대시보드', icon: '◈' },
  { id: 'calendar', label: '캘린더', icon: '◫' },
  { id: 'pipeline', label: '파이프라인', icon: '⇄' },
  { id: 'publish', label: '발행관리', icon: '▤' },
  { id: 'create', label: '콘텐츠제작', icon: '＋' },
  { id: 'repurpose', label: '채널재가공', icon: '↹' },
  { id: 'knowledge', label: '지식베이스', icon: '◉' },
];

export const PIPELINE_STAGES = [
  { id: 'idea', label: '아이디어', emoji: '💭' },
  { id: 'draft', label: '초안작성', emoji: '✍️' },
  { id: 'review', label: '검토/편집', emoji: '👀' },
  { id: 'ready', label: '발행준비', emoji: '✅' },
  { id: 'published', label: '발행완료', emoji: '🚀' },
];

export const CHANNELS = [
  { id: 'blog', label: 'britzmedi.com', track: 'A' },
  { id: 'linkedin', label: 'LinkedIn', track: 'A' },
  { id: 'instagram', label: 'Instagram', track: 'A' },
  { id: 'newsletter', label: '뉴스레터', track: 'B' },
  { id: 'naver', label: '네이버 블로그', track: 'B' },
  { id: 'kakao', label: '카카오톡', track: 'B' },
  { id: 'pressrelease', label: '보도자료', track: '-' },
];

export const CONTENT_PILLARS = {
  A: [
    { id: 'A1', label: 'Science', desc: '임상/논문 기반' },
    { id: 'A2', label: 'Product', desc: 'TORR RF 중심' },
    { id: 'A3', label: 'Market', desc: '시장 분석' },
    { id: 'A4', label: 'Visual', desc: '비주얼 콘텐츠' },
  ],
  B: [
    { id: 'B1', label: '설문 뉴스레터', desc: '113명 설문 기반' },
    { id: 'B2', label: '시장 트렌드', desc: '국내 시장' },
    { id: 'B3', label: '규제/심의', desc: 'MADMEDCHECK 연계' },
    { id: 'B4', label: '실전 팁', desc: '원장님 대상' },
    { id: 'B5', label: 'MADMEDCHECK', desc: '심의 가이드' },
    { id: 'B6', label: '성공사례', desc: '케이스 스터디' },
  ],
};

// Demo data for initial display
export const DEMO_CONTENTS = [
  { id: 1, title: 'TOROIDAL 고주파 vs 기존 고주파 기술: 임상 비교', track: 'A', pillar: 'A1', stage: 'published', channels: { blog: true, linkedin: true, instagram: true }, date: '2026-02-03' },
  { id: 2, title: 'TORR RF: TOROIDAL 고주파 기술의 과학적 근거', track: 'A', pillar: 'A2', stage: 'ready', channels: { blog: true, linkedin: false, instagram: true }, date: '2026-02-10' },
  { id: 3, title: '피부과 선택 기준 설문 리포트 ① - 충격 데이터 5선', track: 'B', pillar: 'B1', stage: 'review', channels: { newsletter: true, naver: true, kakao: true }, date: '2026-02-12' },
  { id: 4, title: '2026 메디컬 에스테틱 EBD 시장 트렌드 분석', track: 'A', pillar: 'A3', stage: 'draft', channels: {}, date: '2026-02-17' },
  { id: 5, title: '의료기기 광고 심의 체크리스트 - 원장님 필독', track: 'B', pillar: 'B3', stage: 'idea', channels: {}, date: '2026-02-19' },
  { id: 6, title: '효과 없는 시술 vs 확실한 시술: 환자 이탈 데이터', track: 'B', pillar: 'B1', stage: 'draft', channels: { newsletter: false, naver: true, kakao: false }, date: '2026-02-14' },
  { id: 7, title: 'TOROIDAL 고주파 에너지 전달과 콜라겐 리모델링 메커니즘', track: 'A', pillar: 'A1', stage: 'idea', channels: {}, date: '2026-02-24' },
  { id: 8, title: '피부과 장비 ROI 분석: 가성비 24.8%의 의미', track: 'B', pillar: 'B4', stage: 'idea', channels: {}, date: '2026-02-26' },
];
