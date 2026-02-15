/**
 * 채널 재가공 상수
 * Phase B: 보도자료 → 4개 채널 재가공
 */

export const REPURPOSE_CHANNELS = [
  {
    id: 'naver-blog',
    name: '네이버 블로그',
    icon: '📝',
    format: 'SEO 최적화 블로그 포스트',
    charRange: { min: 1500, max: 2500 },
    tone: '정보 전달형, 친근하되 전문적',
    features: ['소제목 자동 생성', '이미지 위치 지정', 'SEO 키워드 삽입'],
    outputFormat: 'html',
  },
  {
    id: 'kakao',
    name: '카카오톡 채널',
    icon: '💬',
    format: '카드뉴스형 요약',
    charRange: { min: 300, max: 500 },
    tone: '간결하고 핵심 강조',
    features: ['핵심 문장 3-5개', '이모지 활용', 'CTA 문구'],
    outputFormat: 'text',
  },
  {
    id: 'instagram',
    name: '인스타그램',
    icon: '📸',
    format: '캐러셀 슬라이드 텍스트',
    charRange: { min: 50, max: 150 },
    slideCount: { min: 5, max: 7 },
    tone: '임팩트, 비주얼 중심',
    features: ['슬라이드별 텍스트', '해시태그 세트', '첫 슬라이드 훅'],
    outputFormat: 'slides',
  },
  {
    id: 'linkedin',
    name: '링크드인',
    icon: '💼',
    format: '전문가 포스트',
    charRange: { min: 800, max: 1200 },
    tone: '비즈니스 전문가, 인사이트 중심',
    features: ['영문 옵션', '전문가 코멘트', '산업 인사이트'],
    outputFormat: 'text',
    languageOptions: ['ko', 'en', 'ko+en'],
  },
];

export const REPURPOSE_STATUS = {
  IDLE: 'idle',
  GENERATING: 'generating',
  GENERATED: 'generated',
  EDITING: 'editing',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};
