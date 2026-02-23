# Content Ops 인증 시스템 구축

아래 작업을 Phase별로 순서대로 실행해. 매 Phase 끝에 빌드 확인.

---

## 배경

Content Ops(admin.britzmedi.co.kr)가 현재 **인증 없이** 운영 중이야.
내부 관리 시스템이라 외부 노출되면 안 되는 데이터(콘텐츠, 리드, 챗봇 로그 등)가 있어서 인증이 필수야.

**방식: Supabase Auth (이메일/비밀번호)**
- 이미 Supabase 연동되어 있으니 추가 비용 ₩0
- 회원가입 불필요 — 관리자가 Supabase Dashboard에서 사용자 직접 생성
- 세션 자동 관리 (JWT + Refresh Token)

---

## Phase 0: 현재 상태 확인

```bash
# 1. Supabase 클라이언트 설정 확인
cat src/lib/supabase.* 2>/dev/null || cat src/utils/supabase.* 2>/dev/null
grep -rn "createClient\|supabase" src/lib/ src/utils/ 2>/dev/null | head -10

# 2. 현재 라우팅 구조 확인
cat src/App.* 2>/dev/null | head -80
grep -rn "Route\|Router\|BrowserRouter" src/ 2>/dev/null | head -15

# 3. 기존 인증 관련 코드 확인
grep -rn "auth\|login\|session\|useAuth\|AuthContext" src/ 2>/dev/null | head -20

# 4. 환경변수 확인
cat .env 2>/dev/null | grep -i supabase

# 5. package.json 의존성
cat package.json | grep -E "supabase|react-router"
```

결과 먼저 보여줘.

---

## Phase 1: Supabase Auth 클라이언트 확인/설정

### 1-1. 기존 Supabase 클라이언트에 Auth가 이미 포함되어 있어

`@supabase/supabase-js`의 `createClient`는 자동으로 Auth 기능을 포함해.
별도 설치 불필요. 기존 클라이언트 그대로 사용.

```javascript
// 이미 있는 supabase 클라이언트에서 바로 사용 가능:
// supabase.auth.signInWithPassword(...)
// supabase.auth.signOut()
// supabase.auth.getSession()
// supabase.auth.onAuthStateChange(...)
```

---

## Phase 2: Auth Context + Hook 구현

### 2-1. AuthContext 생성

파일: `src/contexts/AuthContext.jsx`

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // 경로는 Phase 0 결과에 맞춰 조정

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 세션 변화 감지 (로그인/로그아웃/토큰 갱신)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!session,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Phase 3: 로그인 페이지 구현

파일: `src/pages/Login.jsx`

```jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // react-router 쓰고 있으면

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate(); // 라우터 없으면 window.location 사용

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      navigate('/'); // 로그인 성공 → 대시보드로
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            BRITZMEDI
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Content Operations</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="admin@britzmedi.co.kr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-lg
                         hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          BRITZMEDI Content Ops v1.0
        </p>
      </div>
    </div>
  );
}
```

> 로그인 페이지 디자인은 co.kr과 맞춰서 **teal 포인트 컬러** 사용. 최대한 깔끔하게.

---

## Phase 4: Route 보호 (ProtectedRoute)

파일: `src/components/ProtectedRoute.jsx`

```jsx
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom'; // 라우터 구조에 맞춰 조정

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

---

## Phase 5: App 라우팅에 인증 적용

### 5-1. App 수정

기존 App 구조를 감싸는 방식으로 수정. **기존 라우팅 구조를 깨지 않게 주의.**

핵심 변경점:
1. `AuthProvider`로 전체 앱 감싸기
2. `/login` 라우트 추가
3. 기존 모든 라우트를 `ProtectedRoute`로 감싸기

```jsx
// App.jsx 변경 패턴 (기존 구조에 맞춰 적용)
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter> {/* 또는 기존 라우터 */}
        <Routes>
          {/* 로그인은 공개 */}
          <Route path="/login" element={<Login />} />
          
          {/* 나머지 전부 보호 */}
          <Route path="/*" element={
            <ProtectedRoute>
              {/* 기존 라우팅/레이아웃 그대로 */}
              <ExistingLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

> ⚠️ 기존 App 구조가 다를 수 있어. Phase 0에서 확인한 라우팅 구조에 맞춰서 적용해. 핵심은:
> 1. AuthProvider가 최상위
> 2. /login은 공개
> 3. 나머지는 ProtectedRoute로 감싸기

### 5-2. 로그아웃 버튼 추가

기존 사이드바나 헤더에 로그아웃 버튼 추가:

```jsx
import { useAuth } from '../contexts/AuthContext';

function Header() { // 또는 Sidebar
  const { user, signOut } = useAuth();
  
  return (
    // 기존 헤더 내용...
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-500">{user?.email}</span>
      <button
        onClick={signOut}
        className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
```

> 기존 헤더/사이드바 컴포넌트를 찾아서 적절한 위치에 넣어.

---

## Phase 6: 빌드 검증 + 커밋

```bash
npm run build
```

빌드 에러 없으면:

```bash
git add -A
git commit -m "[Auth] Supabase Auth 인증 시스템 구축 — 로그인/로그아웃/라우트보호"
git push origin main
```

---

## Phase 7: 초기 사용자 생성 안내

빌드 + 배포 완료 후 사용자에게 안내:

```
=== 인증 시스템 구축 완료 ===

[사용자가 해야 할 것]

1. Supabase Dashboard에서 관리자 계정 생성:
   - Supabase Dashboard → Authentication → Users
   - "Add user" → "Create new user"
   - Email: sh.lee@britzmedi.co.kr (또는 원하는 이메일)
   - Password: 원하는 비밀번호 설정
   - "Auto confirm user" 체크 ✅
   - "Create user" 클릭

2. 배포된 사이트에서 로그인 테스트:
   - admin.britzmedi.co.kr 접속
   - 로그인 화면이 뜨는지 확인
   - 위에서 만든 계정으로 로그인
   - 기존 기능들이 정상 작동하는지 확인

3. (선택) 추가 사용자 생성:
   - 같은 방식으로 필요한 팀원 계정 추가

[작동 방식]
- 로그인하지 않으면 모든 페이지가 /login으로 리다이렉트
- 로그인 후 세션은 자동 유지 (브라우저 닫아도 유지)
- 로그아웃은 헤더/사이드바의 로그아웃 버튼 클릭
```

---

## 주의사항

- **기존 라우팅 구조를 깨지 마.** AuthProvider와 ProtectedRoute를 감싸는 것만 하고, 기존 컴포넌트/페이지는 건드리지 마.
- 회원가입 기능은 만들지 마. 사용자 생성은 Supabase Dashboard에서만.
- 비밀번호 찾기/재설정은 지금 안 만들어도 돼. Supabase Dashboard에서 리셋 가능.
- 로그인 페이지 디자인은 teal 포인트 컬러 유지.
- 빌드 반드시 확인하고 커밋해.
