/**
 * V3 배포 채널 상수
 * 7개 채널: 보도자료, 홈페이지, 뉴스레터, 네이버블로그, 링크드인, 인스타그램, 카카오톡
 */

export const REPURPOSE_CHANNELS = [
  {
    id: 'pressrelease',
    name: '보도자료',
    icon: '📰',
    format: '뉴스와이어 정형',
    charRange: { min: 1500, max: 3000 },
    tone: '공식 3인칭 보도문',
    features: ['역피라미드 구조', '대표 인용문', 'Word/PDF 다운로드'],
    outputFormat: 'text',
    specialFlow: true,  // Create.jsx의 6단계 플로우로 처리 (RepurposeHub에서 생성하지 않음)
  },
  {
    id: 'homepage',
    name: '홈페이지',
    icon: '🌐',
    format: 'britzmedi.com 웹 콘텐츠',
    charRange: { min: 500, max: 1500 },
    tone: '글로벌 B2B 전문',
    features: ['SEO', '구조화된 레이아웃', 'Open Graph'],
    outputFormat: 'text',
  },
  {
    id: 'newsletter',
    name: '이메일 뉴스레터',
    icon: '📧',
    format: '뉴스레터',
    charRange: { min: 1500, max: 2500 },
    tone: '격식체, 전문적이되 친근한 톤',
    features: ['프리헤더', '핵심요약', 'CTA'],
    outputFormat: 'text',
  },
  {
    id: 'naver-blog',
    name: '네이버 블로그',
    icon: '📝',
    format: 'SEO 최적화 블로그',
    charRange: { min: 2000, max: 3500 },
    tone: '격식체, 정보 전달형',
    features: ['소제목 자동 생성', '이미지 위치 지정', 'SEO 키워드 삽입'],
    outputFormat: 'html',
  },
  {
    id: 'kakao',
    name: '카카오톡 채널',
    icon: '💬',
    format: '채널 포스트',
    charRange: { min: 150, max: 300 },
    tone: '격식체, 간결하고 핵심 강조',
    features: ['핵심 메시지', '이미지+링크', 'CTA 문구'],
    outputFormat: 'text',
  },
  {
    id: 'instagram',
    name: '인스타그램',
    icon: '📸',
    format: '피드 포스트',
    charRange: { min: 50, max: 150 },
    tone: '간결한 명사형, 비주얼 중심',
    features: ['캡션', '해시태그 세트', '이미지 가이드'],
    outputFormat: 'text',
  },
  {
    id: 'linkedin',
    name: '링크드인',
    icon: '💼',
    format: '전문가 포스트',
    charRange: { min: 800, max: 1200 },
    tone: '격식체, 비즈니스 전문가',
    features: ['영문 옵션', '전문가 코멘트', '산업 인사이트'],
    outputFormat: 'text',
    languageOptions: ['ko', 'en', 'ko+en'],
  },
];

export const REPURPOSE_STATUS = {
  IDLE: 'idle',
  GENERATING: 'generating',
  REVIEWING: 'reviewing',
  FIXING: 'fixing',
  GENERATED: 'generated',
  EDITING: 'editing',
  APPROVED: 'approved',
  PUBLISHED: 'published',
};
