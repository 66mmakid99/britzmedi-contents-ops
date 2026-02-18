/**
 * 콘텐츠 유형 정의
 * - 기존 PR_CATEGORIES(prompts.js)는 보도자료 하위 카테고리로 유지
 * - CONTENT_TYPES는 상위 레벨 유형 분류
 */

export const CONTENT_TYPES = {
  press_release: {
    label: '보도자료',
    icon: '📰',
    description: '언론 배포용 공식 보도자료',
    track: 'A',
    flow: 'full',  // 6단계 (기존 플로우 유지)
    recommendedChannels: ['linkedin', 'newsletter', 'naver-blog', 'kakao', 'instagram'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 2, instagram: 2 },
    fields: null,  // PR_CATEGORIES에서 가져옴
  },

  research: {
    label: '논문/연구 해설',
    icon: '📑',
    description: '피부과/미용의료 논문을 해설하는 교육 콘텐츠',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['linkedin', 'naver-blog', 'newsletter'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 1, instagram: 2 },
    fields: [
      { key: 'paperTitle', label: '논문 제목', required: true, placeholder: '예: Radiofrequency for Skin Tightening: A Systematic Review' },
      { key: 'source', label: '저널/출처', placeholder: '예: Journal of Cosmetic Dermatology, 2026' },
      { key: 'doi', label: 'DOI 또는 링크', placeholder: '예: 10.1111/jocd.12345 또는 URL' },
      { key: 'keyFindings', label: '핵심 결론', required: true, type: 'textarea', placeholder: '논문의 핵심 발견/결론을 자유롭게 적어주세요' },
      { key: 'relatedProduct', label: '관련 제품', type: 'product_select' },
      { key: 'connectionPoint', label: '제품 연결 포인트', type: 'textarea', placeholder: '예: 논문의 고주파 원리가 TORR RF에 적용된 기술과 동일' },
    ],
  },

  installation: {
    label: '납품/도입 사례',
    icon: '🏥',
    description: '병원 장비 납품, 도입 소식',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['linkedin', 'naver-blog', 'instagram'],
    channelFit: { linkedin: 3, newsletter: 2, 'naver-blog': 3, kakao: 2, instagram: 3 },
    fields: [
      { key: 'hospitalName', label: '병원/기관명', required: true, placeholder: '예: 미라벨피부과' },
      { key: 'product', label: '도입 제품', required: true, type: 'product_select' },
      { key: 'region', label: '지역', placeholder: '예: 서울 강남' },
      { key: 'installDate', label: '도입 시기', placeholder: '예: 2026년 2월' },
      { key: 'doctorComment', label: '원장님 코멘트 (있으면)', type: 'textarea', placeholder: '도입 이유, 만족도 등' },
      { key: 'background', label: '도입 배경', type: 'textarea', placeholder: '예: 기존 1대 사용 후 만족해서 추가 구매' },
    ],
  },

  company_life: {
    label: '회사 소식/일상',
    icon: '🏢',
    description: '사무실 이전, 워크숍, 행사, 팀 소개 등',
    track: 'B',
    flow: 'simple',
    recommendedChannels: ['instagram', 'linkedin', 'kakao'],
    channelFit: { linkedin: 2, newsletter: 1, 'naver-blog': 2, kakao: 2, instagram: 3 },
    fields: [
      { key: 'subType', label: '소재 유형', type: 'select', required: true,
        options: [
          { value: 'office', label: '사무실/공간' },
          { value: 'team', label: '팀/사람' },
          { value: 'event', label: '사내 행사' },
          { value: 'hiring', label: '채용' },
          { value: 'culture', label: '업무 환경/문화' },
          { value: 'other', label: '기타' },
        ]
      },
      { key: 'tone', label: '톤', type: 'select',
        options: [
          { value: 'bright', label: '밝고 활기찬' },
          { value: 'calm', label: '차분하고 전문적' },
          { value: 'funny', label: '유머러스' },
          { value: 'emotional', label: '감성적' },
        ]
      },
    ],
  },

  product_tips: {
    label: '제품 팁/활용법',
    icon: '💡',
    description: '시술 테크닉, 장비 활용법, FAQ',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['naver-blog', 'instagram', 'linkedin'],
    channelFit: { linkedin: 2, newsletter: 2, 'naver-blog': 3, kakao: 2, instagram: 3 },
    fields: [
      { key: 'product', label: '제품', required: true, type: 'product_select' },
      { key: 'tipType', label: '팁 유형', type: 'select', required: true,
        options: [
          { value: 'technique', label: '시술 테크닉' },
          { value: 'consultation', label: '환자 상담 포인트' },
          { value: 'maintenance', label: '장비 관리/세팅' },
          { value: 'faq', label: 'FAQ 답변' },
          { value: 'before_after', label: 'Before/After' },
          { value: 'other', label: '기타' },
        ]
      },
    ],
  },

  industry_trend: {
    label: '업계 트렌드',
    icon: '📊',
    description: '시장 동향, 규제 변화, 전시회 후기',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['linkedin', 'newsletter', 'naver-blog'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 2, kakao: 1, instagram: 1 },
    fields: [
      { key: 'refLinks', label: '참고 링크 (있으면)', type: 'textarea', placeholder: '뉴스 기사나 보고서 URL' },
    ],
  },

  success_story: {
    label: '고객 성공사례',
    icon: '👨\u200D⚕️',
    description: '원장님 인터뷰, 사용 후기, 병원 성장 사례',
    track: 'A',
    flow: 'simple',
    recommendedChannels: ['naver-blog', 'linkedin', 'newsletter'],
    channelFit: { linkedin: 3, newsletter: 3, 'naver-blog': 3, kakao: 2, instagram: 2 },
    fields: [
      { key: 'hospitalName', label: '병원명', required: true },
      { key: 'doctorName', label: '원장님 성함', placeholder: '공개 동의 받은 경우만' },
      { key: 'product', label: '사용 제품', type: 'product_select' },
      { key: 'usagePeriod', label: '사용 기간', placeholder: '예: 6개월' },
    ],
  },

  event_promo: {
    label: '이벤트/프로모션',
    icon: '🎉',
    description: '특가, 체험 이벤트, 세미나 안내, 모집',
    track: 'B',
    flow: 'simple',
    recommendedChannels: ['kakao', 'instagram', 'naver-blog'],
    channelFit: { linkedin: 1, newsletter: 2, 'naver-blog': 2, kakao: 3, instagram: 3 },
    fields: [
      { key: 'eventTitle', label: '이벤트명', required: true, placeholder: '예: TORR RF 체험 이벤트' },
      { key: 'period', label: '기간', required: true, placeholder: '예: 2026.03.01 ~ 03.31' },
      { key: 'target', label: '대상', placeholder: '예: 피부과/에스테틱 원장님' },
      { key: 'benefit', label: '혜택/내용', required: true, type: 'textarea', placeholder: '무료 체험, 할인율, 프로그램 등' },
      { key: 'how', label: '참여 방법', type: 'textarea', placeholder: '신청 방법, 연락처 등' },
    ],
  },
};

/**
 * 제품 선택 옵션 (product_select 타입에서 사용)
 */
export const PRODUCT_OPTIONS = [
  { value: 'torr_rf', label: 'TORR RF' },
  { value: 'newchae', label: 'NEWCHAE (뉴채)' },
  { value: 'ulblanc', label: 'ULBLANC (울블랑)' },
  { value: 'lumino_wave', label: 'LUMINO WAVE (루미노웨이브)' },
  { value: 'other', label: '기타' },
];

/**
 * channelFit 값 의미:
 * 3 = 최적 (자동 체크)
 * 2 = 적합 (체크 가능)
 * 1 = 가능하지만 비추천 (체크 해제)
 * 0 또는 미정의 = 부적합 (숨김)
 */
export function getRecommendedChannels(contentType) {
  const type = CONTENT_TYPES[contentType];
  if (!type) return [];
  return Object.entries(type.channelFit)
    .filter(([, fit]) => fit >= 2)
    .sort(([, a], [, b]) => b - a)
    .map(([channelId]) => channelId);
}

export function getAutoCheckedChannels(contentType) {
  const type = CONTENT_TYPES[contentType];
  if (!type) return [];
  return Object.entries(type.channelFit)
    .filter(([, fit]) => fit >= 3)
    .map(([channelId]) => channelId);
}
