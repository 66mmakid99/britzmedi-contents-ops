/**
 * V3 콘텐츠 성격(Nature) 정의
 * - 8개 성격 (WHAT) × 7개 채널 (WHERE) 매트릭스
 * - 기존 PR_CATEGORIES(prompts.js)는 보도자료 하위 카테고리로 유지
 * - channelFit: 3=자동체크, 2=선택가능, 1=가능하지만 비추천, 0=숨김
 */

export const CONTENT_TYPES = {
  press_release: {
    label: '비즈니스/계약',
    icon: '🤝',
    description: '파트너십, 인허가, 수출, 투자, 인증 등 공식 비즈니스 소식',
    flow: 'full',  // 보도자료 채널 선택 시 기존 6단계 플로우
    persona: '공식 보도문체. 객관적 팩트 중심, ~했다/~밝혔다/~전망이다 체. 과장 없이 신뢰감 있는 톤.',
    channelFit: {
      pressrelease: 3, homepage: 2, newsletter: 3,
      'naver-blog': 3, linkedin: 3, instagram: 2, kakao: 2,
    },
    fields: null,  // PR_CATEGORIES에서 가져옴 (보도자료 채널 선택 시)
  },

  research: {
    label: '논문/연구 해설',
    icon: '📑',
    description: 'AI가 최신 논문을 자동으로 찾아 콘텐츠를 추천합니다',
    flow: 'research_explorer',
    persona: 'BRITZMEDI 리서치 팀. 학술적 근거 기반, 인용 문체, 객관적 톤. 논문 데이터를 정확히 전달하되 이해하기 쉽게 해설.',
    channelFit: {
      pressrelease: 0, homepage: 3, newsletter: 3,
      'naver-blog': 3, linkedin: 3, instagram: 2, kakao: 1,
    },
    fields: null,
  },

  installation: {
    label: '납품/도입 사례',
    icon: '🏥',
    description: '병원 장비 납품, 도입 축하 소식',
    flow: 'simple',
    persona: 'BRITZMEDI 영업팀. 축하+전문성 톤. 과장 없이 팩트 기반. 납품 병원과의 파트너십을 강조.',
    channelFit: {
      pressrelease: 2, homepage: 3, newsletter: 2,
      'naver-blog': 3, linkedin: 3, instagram: 3, kakao: 2,
    },
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
    flow: 'simple',
    persona: '20대 중후반 센스있는 PR담당자. 친근하되 가볍지 않음. ~했어요/~인데요 체. 기업 PR 딱딱함 없이 일상 공유 느낌. 이모지 적절히 사용. 금지: "성장하는 기업", "열정 가득한 팀", "글로벌 기업" 같은 클리셰.',
    channelFit: {
      pressrelease: 0, homepage: 2, newsletter: 1,
      'naver-blog': 2, linkedin: 2, instagram: 3, kakao: 2,
    },
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
    flow: 'simple',
    persona: '30대 초반 임상팀장. 신중하고 친절함. 기술을 잘 알지만 쉬운 말로 설명. ~해보세요/~하시면 돼요 체. 매뉴얼 딱딱함 없이 친절한 선배 느낌. 기술적 정확성 유지. 금지: 전문 용어 나열, "최고의", "혁신적인" 마케팅 용어.',
    channelFit: {
      pressrelease: 0, homepage: 3, newsletter: 2,
      'naver-blog': 3, linkedin: 2, instagram: 3, kakao: 2,
    },
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
    flow: 'simple',
    persona: '분석력 뛰어난 마케터. 데이터 기반이되 읽는 맛이 있는 글. ~입니다 체, 칼럼니스트 느낌. 수치와 인사이트의 배합. "왜 이게 중요한지"를 항상 설명. 약간의 긴장감.',
    channelFit: {
      pressrelease: 0, homepage: 3, newsletter: 3,
      'naver-blog': 2, linkedin: 3, instagram: 1, kakao: 1,
    },
    fields: [
      { key: 'refLinks', label: '참고 링크 (있으면)', type: 'textarea', placeholder: '뉴스 기사나 보고서 URL' },
    ],
  },

  success_story: {
    label: '고객 성공사례',
    icon: '👨\u200D⚕️',
    description: '원장님 인터뷰, 사용 후기, 병원 성장 사례',
    flow: 'simple',
    persona: '원장님의 실제 발언을 뼈대로, 근거 기반 보강. Before→After 구조. 금지: 원장님이 안 한 말 만들기, 수치 과장, 의료 효과 보장, 타 장비 비방.',
    channelFit: {
      pressrelease: 2, homepage: 3, newsletter: 3,
      'naver-blog': 3, linkedin: 3, instagram: 2, kakao: 2,
    },
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
    flow: 'simple',
    persona: '긴급성과 혜택을 강조하는 행동 유도 콘텐츠. 명확한 기한, 대상, 혜택, 참여 방법. 전 채널 동시 적용 가능.',
    channelFit: {
      pressrelease: 1, homepage: 3, newsletter: 2,
      'naver-blog': 2, linkedin: 1, instagram: 3, kakao: 3,
    },
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
