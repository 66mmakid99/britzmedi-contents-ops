/**
 * publishToCokr.js — Content Ops → co.kr 발행 연결
 *
 * Content Ops의 website_posts 콘텐츠를 co.kr Supabase 테이블
 * (blog_posts / news_items)에 upsert하고 Deploy Hook을 호출합니다.
 *
 * 같은 Supabase 인스턴스를 공유하므로 별도 클라이언트 불필요.
 */

import { supabase } from './supabase';

// =====================================================
// Deploy Hook
// =====================================================

export async function triggerCokrDeploy(triggeredBy = 'content-ops') {
  const hookUrl = import.meta.env.VITE_COKR_DEPLOY_HOOK_URL;

  if (!hookUrl) {
    console.warn('[Publish] VITE_COKR_DEPLOY_HOOK_URL not set — skipping deploy trigger');
    return { success: false, reason: 'no_hook_url' };
  }

  try {
    const response = await fetch(hookUrl, { method: 'POST' });

    if (response.ok) {
      console.log(`[Publish] Deploy triggered by: ${triggeredBy}`);

      // 배포 로그 저장 (deploy_logs 테이블이 있으면)
      if (supabase) {
        supabase
          .from('deploy_logs')
          .insert({ site: 'co.kr', triggered_by: triggeredBy, status: 'triggered' })
          .then(() => {})
          .catch(() => {}); // 실패해도 무시
      }

      return { success: true };
    } else {
      console.error('[Publish] Deploy hook failed:', response.status);
      return { success: false, reason: response.statusText };
    }
  } catch (error) {
    console.error('[Publish] Deploy hook error:', error);
    return { success: false, reason: error.message };
  }
}

// =====================================================
// Slug 생성
// =====================================================

function generateSlug(title) {
  if (!title) return `post-${Date.now().toString(36)}`;

  // 한글 → 간략 로마자 변환 (완벽하지 않지만 읽기 가능)
  const romanized = title
    .replace(/[^\w가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();

  // 50자 제한 + 타임스탬프
  return romanized.slice(0, 50).replace(/-+$/, '') + '-' + Date.now().toString(36);
}

// =====================================================
// 블로그 발행 (website_posts → blog_posts)
// =====================================================

/**
 * website_posts 데이터를 blog_posts 테이블에 upsert합니다.
 * @param {Object} post - website_posts 로우 또는 동일 형태 객체
 * @param {Object} options - { triggerDeploy: boolean, blogCategory, categoryLabel }
 */
export async function publishToBlog(post, options = {}) {
  if (!supabase) return { success: false, reason: 'no_supabase' };

  const {
    triggerDeploy = true,
    blogCategory = mapCategoryToBlog(post.category),
    categoryLabel = mapCategoryLabel(post.category),
  } = options;

  try {
    const slug = post.slug || generateSlug(post.title);

    const row = {
      slug,
      title: post.title,
      category: blogCategory,
      category_label: categoryLabel,
      excerpt: post.excerpt || post.seo_description || '',
      content: post.body || '',
      author: post.author || '브릿츠메디',
      cover_image: post.featured_image || null,
      faqs: post.faqs || [],
      related_products: post.related_products || [],
      related_slugs: post.related_slugs || [],
      status: 'published',
      published_at: post.published_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(row, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('[Publish] blog_posts upsert error:', error);
      return { success: false, reason: error.message };
    }

    // website_posts 상태 업데이트
    if (post.id) {
      await supabase
        .from('website_posts')
        .update({
          status: 'published',
          published_at: row.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);
    }

    // Deploy Hook
    if (triggerDeploy) {
      await triggerCokrDeploy(`blog:${slug}`);
    }

    return { success: true, data, slug };
  } catch (e) {
    console.error('[Publish] publishToBlog error:', e);
    return { success: false, reason: e.message };
  }
}

// =====================================================
// 뉴스 발행 (website_posts → news_items)
// =====================================================

export async function publishToNews(post, options = {}) {
  if (!supabase) return { success: false, reason: 'no_supabase' };

  const { triggerDeploy = true } = options;

  try {
    const slug = post.slug || generateSlug(post.title);

    const row = {
      slug,
      title: post.title,
      excerpt: post.excerpt || post.seo_description || '',
      content: post.body || '',
      category: mapNewsCategoryLabel(post.category),
      status: 'published',
      published_at: post.published_at || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('news_items')
      .upsert(row, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('[Publish] news_items upsert error:', error);
      return { success: false, reason: error.message };
    }

    // website_posts 상태 업데이트
    if (post.id) {
      await supabase
        .from('website_posts')
        .update({
          status: 'published',
          published_at: row.published_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);
    }

    if (triggerDeploy) {
      await triggerCokrDeploy(`news:${slug}`);
    }

    return { success: true, data, slug };
  } catch (e) {
    console.error('[Publish] publishToNews error:', e);
    return { success: false, reason: e.message };
  }
}

// =====================================================
// 보도자료를 뉴스로 직접 발행
// =====================================================

export async function publishPressReleaseAsNews(pressRelease, options = {}) {
  if (!supabase) return { success: false, reason: 'no_supabase' };

  const { triggerDeploy = true } = options;

  try {
    const slug = generateSlug(pressRelease.title);

    const row = {
      slug,
      title: pressRelease.title,
      excerpt: (pressRelease.press_release || pressRelease.ai_draft || '').slice(0, 200).replace(/<[^>]+>/g, ''),
      content: pressRelease.press_release || pressRelease.final_text || pressRelease.ai_draft || '',
      category: '보도자료',
      status: 'published',
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('news_items')
      .upsert(row, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('[Publish] press_release → news_items error:', error);
      return { success: false, reason: error.message };
    }

    if (triggerDeploy) {
      await triggerCokrDeploy(`pr-news:${slug}`);
    }

    return { success: true, data, slug };
  } catch (e) {
    console.error('[Publish] publishPressReleaseAsNews error:', e);
    return { success: false, reason: e.message };
  }
}

// =====================================================
// 카테고리 매핑 헬퍼
// =====================================================

function mapCategoryToBlog(wpCategory) {
  const map = {
    news: 'news',
    research: 'clinical',
    installation: 'treatment',
    insights: 'rf-guide',
    'case-studies': 'clinical',
    events: 'news',
    tips: 'treatment',
    company: 'news',
  };
  return map[wpCategory] || 'rf-guide';
}

function mapCategoryLabel(wpCategory) {
  const map = {
    news: '회사 소식',
    research: '임상 데이터',
    installation: '시술 정보',
    insights: 'RF 기술 가이드',
    'case-studies': '임상 데이터',
    events: '회사 소식',
    tips: '시술 정보',
    company: '회사 소식',
  };
  return map[wpCategory] || 'RF 기술 가이드';
}

function mapNewsCategoryLabel(wpCategory) {
  const map = {
    news: '회사 소식',
    research: '연구/임상',
    installation: '설치 사례',
    insights: '인사이트',
    'case-studies': '케이스 스터디',
    events: '이벤트',
    tips: '가이드',
    company: '회사 소식',
  };
  return map[wpCategory] || '회사 소식';
}
