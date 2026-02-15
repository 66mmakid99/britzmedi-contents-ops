// =====================================================
// Knowledge Base — Categories & Default Entries
// =====================================================

export const KB_CATEGORIES = {
  company: { label: '회사 정보', icon: '🏢' },
  product: { label: '제품 정보', icon: '📦' },
  technology: { label: '기술 정보', icon: '⚙️' },
  certification: { label: '인증/임상', icon: '📋' },
  market: { label: '시장 정보', icon: '📈' },
  guidelines: { label: '톤앤매너/규칙', icon: '📝' },
};

export const DEFAULT_KB_ENTRIES = [
  {
    id: 'kb-company-1',
    title: 'BRITZMEDI 회사 소개',
    category: 'company',
    content: `BRITZMEDI Co., Ltd. (브릿츠메디)
- 2017년 설립, 메디컬 에스테틱 디바이스 전문기업
- 대표이사: 이신재
- 본사: 경기도 성남시 둔촌대로 388, 크란츠테크노 1211호
- 홈페이지: www.britzmedi.co.kr (국내) / www.britzmedi.com (글로벌)
- 사업 영역: FDA 승인 TOROIDAL 고주파 기술 기반 EBD(Energy Based Device) 개발·제조·수출
- 타겟 시장: 국내 피부과/에스테틱 + 해외(동남아, 중동) 수출`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-product-torr',
    title: '토르RF (TORR RF)',
    category: 'product',
    content: `TORR RF — FDA 승인 TOROIDAL 고주파 기반 메디컬 에스테틱 디바이스
- 핵심 기술: TOROIDAL 고주파 (BRITZMEDI 독자 기술)
- 분류: EBD (Energy Based Device) — 에너지 기반 의료미용기기
- 인증: FDA 승인
- 기대 효과: 콜라겐 리모델링 촉진, 시술 후 다운타임 감소에 기여
- ※ "마이크로니들링" 제품이 아님. 정확한 분류: "TOROIDAL 고주파 기반 EBD"`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-product-luminowave',
    title: '루미노웨이브 (LuminoWave)',
    category: 'product',
    content: `(상세 미등록 — 사용자가 추후 입력)`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-tech-toroidal',
    title: 'TOROIDAL 고주파 기술',
    category: 'technology',
    content: `TOROIDAL 고주파 — BRITZMEDI 독자 기술
- 토로이달(Toroidal) 형태의 고주파 에너지 전달 방식
- 기존 RF 기술 대비 균일한 에너지 분포 특성
- BRITZMEDI가 자체 개발한 독점 기술`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-tech-ebd',
    title: 'EBD (Energy Based Device)',
    category: 'technology',
    content: `EBD — Energy Based Device
- 에너지 기반 의료미용기기를 지칭하는 업계 통칭
- BRITZMEDI 고유 기술이 아님 (업계 공통 용어)
- TOROIDAL 고주파는 EBD 카테고리에 속하는 BRITZMEDI 독자 기술`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-cert-fda',
    title: 'FDA 승인',
    category: 'certification',
    content: `토르RF(TORR RF) FDA 승인 완료
- 승인 대상: TORR RF 메디컬 에스테틱 디바이스
- 승인 기관: U.S. FDA (미국 식품의약국)`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'kb-guidelines-forbidden',
    title: '의료법 금지어 목록',
    category: 'guidelines',
    content: `의료기기 광고에서 절대 사용 금지하는 표현:

금지어:
- 극대화, 최소화
- 최고, 최초 (객관적 근거 없이)
- 완벽한, 획기적인, 혁명적인
- 완치, 100%, 확실한 효과
- 부작용 없음, 안전 보장
- 비교 광고 (타사 제품명 언급 비교)
- 환자 대상 직접 광고 언어
- 의학적 효능 단정 ("~를 치료합니다", "~가 사라집니다")
- "RF 마이크로니들링"이라는 제품 분류 → "TOROIDAL 고주파 기반 EBD" 사용

허용 대체 표현:
- 극대화 → 개선, 촉진, 향상에 도움
- 최소화 → 감소, 줄이는 데 기여
- 완벽한 → 우수한, 높은 수준의
- 최초 → (객관적 근거 있을 때만) 국내/세계 최초 + 출처 명시
- 효과 확실 → 효과가 기대되는, 임상에서 확인된
- 부작용 없음 → 부작용이 적은, 안전성이 확인된`,
    updatedAt: '2026-02-15T00:00:00.000Z',
  },
];

/**
 * Format KB entries for inclusion in AI prompts.
 * Groups by category and returns a formatted text block.
 */
export function formatKBForPrompt(entries) {
  if (!entries || entries.length === 0) return '';

  const grouped = {};
  for (const entry of entries) {
    const cat = KB_CATEGORIES[entry.category]?.label || entry.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }

  let text = '## 회사 지식 베이스 (검증된 참고 자료)\n';
  text += '아래는 BRITZMEDI의 검증된 정보입니다. 콘텐츠 작성 시 이 정보를 정확히 참조하세요.\n';
  text += '지식 베이스에 없는 정보는 [입력 필요]로 표시하세요.\n\n';

  for (const [catLabel, items] of Object.entries(grouped)) {
    text += `### ${catLabel}\n`;
    for (const item of items) {
      text += `[${item.title}]\n${item.content}\n`;
      if (item.extractedData?.keywords?.length) {
        text += `키워드: ${item.extractedData.keywords.join(', ')}\n`;
      }
      text += '\n';
    }
  }

  return text;
}
