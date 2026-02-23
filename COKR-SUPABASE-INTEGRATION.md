# britzmedi.co.kr ↔ Supabase 연동 + Content Ops Publish 연결

아래 작업을 Phase별로 순서대로 실행해. 매 Phase 끝에 빌드 확인하고, 에러 있으면 고친 뒤 다음으로 넘어가.

---

## 배경

현재 co.kr 프론트엔드는 **완전 정적(SSG)**이고, 블로그/뉴스 데이터가 `src/data/blog.ts`, `src/data/news.ts`에 하드코딩되어 있어.

Content Ops(admin.britzmedi.co.kr)에서 콘텐츠를 만들고 "발행" 누르면 co.kr에 자동 반영되는 구조를 만들 거야.

**아키텍처: 방식 C (하이브리드 SSG)**
```
Content Ops에서 콘텐츠 작성
  → Supabase DB에 저장 (status: 'published')
  → Cloudflare Pages Deploy Hook 호출
  → co.kr이 빌드 시 Supabase에서 데이터 fetch
  → 정적 페이지 생성 + 배포
```

**핵심 원칙:**
- 정적 페이지(제품, 회사소개 등)는 SSG 그대로 유지
- 블로그/뉴스만 Supabase에서 빌드 시 fetch
- SEO/AEO 최적화 유지 (정적 HTML 출력)

---

## Phase 0: 현재 상태 확인

```bash
# 1. 현재 블로그/뉴스 데이터 구조 확인
cat src/data/blog.ts | head -50
cat src/data/news.ts | head -50

# 2. 블로그/뉴스 페이지 구조 확인
ls -la src/pages/blog/
ls -la src/pages/news/
cat src/pages/blog/index.astro | head -30
cat src/pages/blog/[slug].astro | head -30

# 3. 기존 Supabase 연동 여부 확인
grep -rn "supabase\|SUPABASE" src/ .env* astro.config* package.json 2>/dev/null | head -20

# 4. 현재 환경변수 확인
cat .env 2>/dev/null || cat .env.example 2>/dev/null || echo "No .env found"

# 5. package.json 의존성 확인
cat package.json | grep -A5 "dependencies"
```

결과 먼저 보여줘.

---

## Phase 1: Supabase 클라이언트 세팅

### 1-1. @supabase/supabase-js 설치

```bash
npm install @supabase/supabase-js
```

### 1-2. 환경변수 추가

`.env` 파일에 추가 (이미 있으면 확인만):

```
PUBLIC_SUPABASE_URL=https://vwixiqkoxxroalywfnlz.supabase.co
PUBLIC_SUPABASE_ANON_KEY=(기존 Content Ops와 동일한 anon key)
SUPABASE_SERVICE_ROLE_KEY=(서비스 롤 키 — 빌드 시에만 사용)
```

> ⚠️ ANON_KEY가 뭔지 모르면 멈추고 사용자에게 물어봐. Content Ops 프로젝트의 .env에서 VITE_SUPABASE_ANON_KEY 값을 가져오면 돼.

### 1-3. Supabase 클라이언트 생성

파일: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## Phase 2: Supabase 테이블 확인 및 생성

### 2-1. 기존 테이블 확인

Content Ops가 이미 Supabase를 쓰고 있으니, blog_posts/news 관련 테이블이 있을 수 있어.

```bash
# Content Ops 프로젝트의 DB 스키마 확인 (같은 Supabase 인스턴스)
# Supabase Dashboard에서 확인하거나, Content Ops 코드에서 테이블 구조 파악
grep -rn "blog_posts\|news\|content_items\|press_releases" ../britzmedi-content-ops/src/ 2>/dev/null | head -30
```

### 2-2. 테이블이 없으면 생성

Supabase SQL Editor에서 실행할 SQL을 생성해. **이미 있는 테이블은 건드리지 마.**

필요한 테이블 (없는 것만 생성):

```sql
-- 블로그 포스트 (Content Ops에서 작성 → co.kr에서 표시)
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'insights',
  tags TEXT[] DEFAULT '{}',
  author TEXT DEFAULT 'BRITZMEDI',
  featured_image TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- 상태 관리
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  
  -- 타겟 사이트 (co.kr, com, both)
  target_site TEXT DEFAULT 'co.kr' CHECK (target_site IN ('co.kr', 'com', 'both')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_target ON blog_posts(target_site);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);

-- 뉴스 (Content Ops에서 작성 → co.kr에서 표시)
CREATE TABLE IF NOT EXISTS news_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'company',
  featured_image TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- 상태 관리
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  
  target_site TEXT DEFAULT 'co.kr' CHECK (target_site IN ('co.kr', 'com', 'both')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news_posts(status);
CREATE INDEX IF NOT EXISTS idx_news_slug ON news_posts(slug);

-- Deploy Hook 로그 (선택)
CREATE TABLE IF NOT EXISTS deploy_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site TEXT NOT NULL,
  triggered_by TEXT,
  status TEXT DEFAULT 'triggered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ Content Ops에 이미 비슷한 테이블(content_items, press_releases 등)이 있으면, 그 테이블을 그대로 활용하는 방향으로 가. 새 테이블을 만들지 말고 기존 테이블에 target_site 컬럼만 추가하는 게 나을 수 있어. **기존 스키마를 먼저 확인하고 판단해.**

---

## Phase 3: 블로그/뉴스 데이터 fetcher 구현

### 3-1. 데이터 fetcher

파일: `src/lib/content-fetcher.ts`

```typescript
import { supabase } from './supabase';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  featured_image?: string;
  meta_title?: string;
  meta_description?: string;
  published_at: string;
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  featured_image?: string;
  meta_title?: string;
  meta_description?: string;
  published_at: string;
}

// 빌드 시 호출 — published 상태 + co.kr 타겟만
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .in('target_site', ['co.kr', 'both'])
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Blog fetch error:', error);
    return [];
  }
  return data || [];
}

export async function getPublishedNewsPosts(): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('status', 'published')
    .in('target_site', ['co.kr', 'both'])
    .order('published_at', { ascending: false });

  if (error) {
    console.error('News fetch error:', error);
    return [];
  }
  return data || [];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) return null;
  return data;
}

export async function getNewsPostBySlug(slug: string): Promise<NewsPost | null> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) return null;
  return data;
}
```

> ⚠️ 테이블명이 Content Ops 기존 테이블과 다르면, 여기서 맞춰야 해. Phase 2에서 확인한 결과에 따라 테이블명과 컬럼명을 조정해.

---

## Phase 4: 블로그/뉴스 페이지 수정

### 4-1. 폴백 전략

DB에 데이터가 아직 없을 수 있으니, **기존 하드코딩 데이터를 폴백으로 유지**해.

```
데이터 우선순위:
1. Supabase에서 fetch한 데이터 (published 상태)
2. 데이터가 0건이면 → 기존 src/data/blog.ts, src/data/news.ts 사용
```

### 4-2. 블로그 인덱스 페이지 수정

`src/pages/blog/index.astro` 수정:

- 기존: `import { blogPosts } from '../../data/blog';`
- 변경: Supabase에서 fetch → 없으면 기존 데이터 폴백

```astro
---
import { getPublishedBlogPosts } from '../../lib/content-fetcher';
import { blogPosts as fallbackPosts } from '../../data/blog';

// Supabase에서 fetch (빌드 시 실행)
let posts = await getPublishedBlogPosts();

// DB에 데이터 없으면 기존 하드코딩 데이터 사용
if (posts.length === 0) {
  posts = fallbackPosts;
}
---
```

나머지 템플릿은 기존 구조 유지. posts 변수를 그대로 사용하되, 필드명이 다르면 매핑해.

### 4-3. 블로그 상세 페이지 수정

`src/pages/blog/[slug].astro` 수정:

```astro
---
import { getPublishedBlogPosts, getBlogPostBySlug } from '../../lib/content-fetcher';
import { blogPosts as fallbackPosts } from '../../data/blog';

export async function getStaticPaths() {
  // Supabase에서 published 글 목록
  let posts = await getPublishedBlogPosts();
  
  // DB에 없으면 기존 데이터 사용
  if (posts.length === 0) {
    posts = fallbackPosts;
  }
  
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
---
```

### 4-4. 뉴스 페이지도 동일하게 수정

`src/pages/news/index.astro`, `src/pages/news/[slug].astro`도 같은 패턴으로 수정.

> 뉴스 페이지가 없으면 만들어. 기존 blog 페이지 구조를 복사해서 news용으로 바꾸면 돼.

---

## Phase 5: Deploy Hook 설정

### 5-1. Cloudflare Pages Deploy Hook 생성

이건 사용자가 Cloudflare 대시보드에서 수동으로 해야 하는 부분이야. 사용자에게 안내해:

```
안내: Cloudflare Pages Deploy Hook 설정 필요

1. Cloudflare Dashboard → Pages → britzmedicokr 프로젝트
2. Settings → Builds & deployments → Deploy hooks
3. "Add deploy hook" 클릭
4. Name: "content-publish"
5. Branch: "main"
6. 생성된 URL 복사 (https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxxxx)
7. 이 URL을 환경변수에 추가:
   - Content Ops 프로젝트: COKR_DEPLOY_HOOK_URL=<복사한 URL>
   - (선택) co.kr 프로젝트 .env에도: DEPLOY_HOOK_URL=<복사한 URL>
```

### 5-2. Deploy Hook 호출 유틸리티

Content Ops에서 사용할 함수 (Content Ops 프로젝트에 추가):

파일: `src/utils/deploy-trigger.js` (Content Ops 프로젝트)

```javascript
export async function triggerCokrDeploy(triggeredBy = 'content-ops') {
  const hookUrl = import.meta.env.VITE_COKR_DEPLOY_HOOK_URL;
  
  if (!hookUrl) {
    console.warn('COKR_DEPLOY_HOOK_URL not set — skipping deploy trigger');
    return { success: false, reason: 'no_hook_url' };
  }
  
  try {
    const response = await fetch(hookUrl, { method: 'POST' });
    
    if (response.ok) {
      console.log(`Deploy triggered by: ${triggeredBy}`);
      return { success: true };
    } else {
      console.error('Deploy hook failed:', response.status);
      return { success: false, reason: response.statusText };
    }
  } catch (error) {
    console.error('Deploy hook error:', error);
    return { success: false, reason: error.message };
  }
}
```

---

## Phase 6: 빌드 검증

```bash
# 1. 빌드 확인
npm run build

# 2. 빌드 출력에서 블로그/뉴스 페이지 생성 확인
ls -la dist/blog/ 2>/dev/null
ls -la dist/news/ 2>/dev/null

# 3. 빌드 로그에서 Supabase fetch 확인
# (에러 없이 빌드되면 OK — DB에 데이터 없으면 폴백으로 빌드됨)
```

빌드 에러 없으면:

```bash
git add -A
git commit -m "[Integration] co.kr ↔ Supabase 연동 — 블로그/뉴스 DB fetch + 폴백"
git push origin main
```

---

## Phase 7: 시드 데이터 마이그레이션

기존 하드코딩 데이터를 Supabase에 INSERT해서 DB 기반으로 전환.

### 7-1. 마이그레이션 스크립트

파일: `scripts/migrate-content.ts` (일회성 스크립트)

```typescript
import { createClient } from '@supabase/supabase-js';
import { blogPosts } from '../src/data/blog';
import { newsPosts } from '../src/data/news';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrate() {
  console.log('Migrating blog posts...');
  for (const post of blogPosts) {
    const { error } = await supabase.from('blog_posts').upsert({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content || '',
      category: post.category || 'insights',
      tags: post.tags || [],
      author: post.author || 'BRITZMEDI',
      featured_image: post.image || null,
      status: 'published',
      published_at: post.date || new Date().toISOString(),
      target_site: 'co.kr',
    }, { onConflict: 'slug' });
    
    if (error) console.error(`Blog error (${post.slug}):`, error.message);
    else console.log(`✓ Blog: ${post.slug}`);
  }

  console.log('Migrating news posts...');
  // news도 동일하게 처리

  console.log('Migration complete!');
}

migrate();
```

> 이 스크립트는 한 번만 실행하면 됨. 실행 방법을 사용자에게 안내해.

---

## Phase 8: 최종 확인 + 사용자 안내

빌드 + 푸시 완료 후, 사용자에게 다음을 안내해:

```
=== 완료 ===

co.kr ↔ Supabase 연동 완료.

[사용자가 해야 할 것]
1. Cloudflare Pages에서 Deploy Hook 생성 (Phase 5-1 참고)
2. Content Ops 프로젝트 .env에 VITE_COKR_DEPLOY_HOOK_URL 추가
3. (선택) 마이그레이션 스크립트 실행해서 기존 데이터 DB로 이전

[작동 방식]
- DB에 published 콘텐츠가 있으면 → DB 데이터로 페이지 생성
- DB에 데이터 없으면 → 기존 하드코딩 데이터로 폴백
- Content Ops에서 "발행" → DB INSERT + Deploy Hook → 자동 재빌드

[다음 작업]
- Content Ops Publish 버튼에 triggerCokrDeploy() 연결
- 인증 시스템 추가
```

---

## 주의사항

- **기존 Content Ops의 Supabase 테이블을 먼저 확인해.** 이미 비슷한 테이블이 있으면 새로 만들지 말고 기존 것을 활용해.
- 필드명이 다르면 fetcher에서 매핑해.
- 기존 정적 페이지(제품, 회사소개, CEO, R&D 등)는 절대 건드리지 마. 블로그/뉴스만 수정.
- 빌드 반드시 확인하고 커밋해.
- PUBLIC_ 접두사 없는 환경변수는 서버 사이드(빌드 시)에서만 사용됨. 클라이언트에 노출되지 않아.
