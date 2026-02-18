/**
 * Context Builder — 학습 데이터를 조합하여 프롬프트 보강 텍스트 생성
 * Phase 3: edit_history, brand_voice_rules, fact_database → 프롬프트 자동 주입
 */

import { supabase } from './supabase';

/**
 * @param {string|null} channel - DB 형식 채널명 ('email', 'naver_blog' 등) 또는 null(보도자료)
 * @param {string|null} category - 콘텐츠 카테고리 (계약, 학회, 신제품 등)
 * @param {string|null} product - 관련 제품 (토르RF, 루미노웨이브 등)
 * @returns {string} 프롬프트에 추가할 컨텍스트 텍스트 (빈 문자열이면 주입 없음)
 */
export async function buildContext(channel = null, category = null, product = null) {
  if (!supabase) return '';

  const sections = [];

  // 1. 브랜드 보이스 규칙
  const voiceRules = await getBrandVoiceContext(channel);
  if (voiceRules) sections.push(voiceRules);

  // 2. 최근 수정 패턴 (빈출 실수)
  const editPatterns = await getEditPatternContext(channel);
  if (editPatterns) sections.push(editPatterns);

  // 3. 팩트 데이터
  const facts = await getFactContext(category, product);
  if (facts) sections.push(facts);

  // 4. 좋은 예시 (승인된 콘텐츠)
  const examples = await getGoodExampleContext(channel, category);
  if (examples) sections.push(examples);

  if (sections.length === 0) return '';

  const result = '\n\n---\n[학습 데이터 — 아래 내용을 반드시 참고하여 생성하세요]\n\n' + sections.join('\n\n');

  console.log('[ContextBuilder] 주입 컨텍스트:', {
    channel,
    category,
    product,
    sectionsCount: sections.length,
    totalLength: result.length,
  });

  return result;
}

// =====================================================
// 3-1. 브랜드 보이스 규칙 조회
// =====================================================

async function getBrandVoiceContext(channel) {
  try {
    let query = supabase
      .from('brand_voice_rules')
      .select('rule_type, rule_text, bad_example, good_example')
      .eq('is_active', true);

    if (channel) {
      query = query.or(`channel.eq.${channel},channel.is.null`);
    } else {
      query = query.is('channel', null);
    }

    const { data, error } = await query.order('rule_type');
    if (error || !data?.length) return null;

    let text = '## 브랜드 보이스 규칙 (반드시 준수)\n';

    // 금지어
    const banned = data.filter(r => r.rule_type === 'banned_term');
    if (banned.length) {
      text += '\n### 금지 표현\n';
      banned.forEach(r => {
        text += `- ${r.rule_text}`;
        if (r.bad_example && r.good_example) {
          text += ` (X "${r.bad_example}" → O "${r.good_example}")`;
        }
        text += '\n';
      });
    }

    // 선호 용어
    const preferred = data.filter(r => r.rule_type === 'preferred_term');
    if (preferred.length) {
      text += '\n### 선호 표현\n';
      preferred.forEach(r => {
        text += `- ${r.rule_text}\n`;
      });
    }

    // 톤 규칙
    const tone = data.filter(r => r.rule_type === 'tone_rule');
    if (tone.length) {
      text += '\n### 톤/문체 규칙\n';
      tone.forEach(r => {
        text += `- ${r.rule_text}`;
        if (r.bad_example && r.good_example) {
          text += ` (X "${r.bad_example}" → O "${r.good_example}")`;
        }
        text += '\n';
      });
    }

    // 구조 규칙
    const structure = data.filter(r => r.rule_type === 'structure_rule');
    if (structure.length) {
      text += '\n### 구조 규칙\n';
      structure.forEach(r => {
        text += `- ${r.rule_text}`;
        if (r.bad_example && r.good_example) {
          text += ` (X "${r.bad_example}" → O "${r.good_example}")`;
        }
        text += '\n';
      });
    }

    // 채널 특수 규칙
    const channelSpecific = data.filter(r => r.rule_type === 'channel_specific');
    if (channelSpecific.length) {
      text += '\n### 채널 특수 규칙\n';
      channelSpecific.forEach(r => {
        text += `- ${r.rule_text}\n`;
      });
    }

    return text;
  } catch (err) {
    console.warn('[ContextBuilder] brand voice 조회 실패:', err);
    return null;
  }
}

// =====================================================
// 3-2. 최근 수정 패턴 조회
// =====================================================

async function getEditPatternContext(channel) {
  try {
    let query = supabase
      .from('edit_history')
      .select('edit_type, edit_pattern, edit_reason, channel')
      .not('edit_pattern', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (channel) {
      query = query.eq('channel', channel);
    }

    const { data, error } = await query;
    if (error || !data?.length) return null;

    // 빈출 패턴 집계
    const patternCounts = {};
    data.forEach(row => {
      if (row.edit_pattern) {
        row.edit_pattern.split(' | ').forEach(pattern => {
          const key = pattern.trim();
          if (key) {
            patternCounts[key] = (patternCounts[key] || 0) + 1;
          }
        });
      }
    });

    // 빈도순 정렬, 상위 10개
    const topPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!topPatterns.length) return null;

    let text = '## 최근 자주 발생하는 수정 사항 (같은 실수 반복 금지)\n';
    topPatterns.forEach(([pattern, count]) => {
      text += `- [${count}회 반복] ${pattern}\n`;
    });

    // edit_reason에서도 빈출 이슈 추출
    const reasonCounts = {};
    data.forEach(row => {
      if (row.edit_reason) {
        row.edit_reason.split(' | ').forEach(reason => {
          const key = reason.trim();
          if (key) {
            reasonCounts[key] = (reasonCounts[key] || 0) + 1;
          }
        });
      }
    });

    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topReasons.length) {
      text += '\n### 검수에서 자주 적발되는 이슈\n';
      topReasons.forEach(([reason, count]) => {
        text += `- [${count}회] ${reason}\n`;
      });
    }

    return text;
  } catch (err) {
    console.warn('[ContextBuilder] edit pattern 조회 실패:', err);
    return null;
  }
}

// =====================================================
// 3-3. 팩트 데이터 조회
// =====================================================

async function getFactContext(category, product) {
  try {
    const { data, error } = await supabase
      .from('fact_database')
      .select('category, subject, fact_text, fact_pairs')
      .eq('is_active', true)
      .order('category');

    if (error || !data?.length) return null;

    // valid_until 필터 (JS에서)
    const now = new Date().toISOString().split('T')[0];
    const validFacts = data.filter(f => !f.valid_until || f.valid_until >= now);

    if (!validFacts.length) return null;

    let text = '## 팩트 데이터 (반드시 정확하게 사용)\n';

    // 카테고리별 그룹핑
    const grouped = {};
    validFacts.forEach(f => {
      if (!grouped[f.category]) grouped[f.category] = [];
      grouped[f.category].push(f);
    });

    // 제품 관련 팩트 우선 표시
    if (product) {
      const productFacts = validFacts.filter(f =>
        f.subject?.includes(product) || f.fact_text?.includes(product)
      );
      if (productFacts.length) {
        text += `\n### ${product} 관련 팩트\n`;
        productFacts.forEach(f => {
          text += `- ${f.fact_text}`;
          if (f.fact_pairs?.length) {
            text += ` (반드시 함께 사용: ${f.fact_pairs.join(', ')})`;
          }
          text += '\n';
        });
      }
    }

    // 인물 정보 (항상 포함 — 이름 오류 방지)
    if (grouped['personnel']) {
      text += '\n### 인물 정보 (이름 정확히 표기)\n';
      grouped['personnel'].forEach(f => {
        text += `- ${f.fact_text}\n`;
      });
    }

    // 회사 정보
    if (grouped['company']) {
      text += '\n### 회사 정보\n';
      grouped['company'].forEach(f => {
        text += `- ${f.fact_text}\n`;
      });
    }

    // 인증 정보 (의료기기 필수)
    if (grouped['certification']) {
      text += '\n### 인증/승인 정보 (정확히 표기)\n';
      grouped['certification'].forEach(f => {
        text += `- ${f.fact_text}\n`;
      });
    }

    return text;
  } catch (err) {
    console.warn('[ContextBuilder] fact 조회 실패:', err);
    return null;
  }
}

// =====================================================
// 3-4. 좋은 예시 조회
// =====================================================

async function getGoodExampleContext(channel, category) {
  try {
    if (!channel) return null; // 보도자료는 예시 주입 안 함 (길이가 너무 김)

    const { data, error } = await supabase
      .from('channel_contents')
      .select('final_text, channel, quality_score, edit_ratio')
      .eq('channel', channel)
      .not('final_text', 'is', null)
      .order('quality_score', { ascending: false, nullsFirst: false })
      .limit(3);

    if (error || !data?.length) return null;

    // final_text가 있는 것 중 상위 1개만 예시로 사용 (토큰 절약)
    const best = data[0];
    if (!best?.final_text) return null;

    // 너무 길면 앞부분만 (500자)
    const exampleText = best.final_text.length > 500
      ? best.final_text.substring(0, 500) + '...(이하 생략)'
      : best.final_text;

    let text = '## 참고 예시 (이전 승인된 콘텐츠 — 톤과 구조를 참고)\n';
    text += '```\n' + exampleText + '\n```\n';
    if (best.quality_score) {
      text += `(품질 점수: ${best.quality_score}점)\n`;
    }

    return text;
  } catch (err) {
    console.warn('[ContextBuilder] good example 조회 실패:', err);
    return null;
  }
}
