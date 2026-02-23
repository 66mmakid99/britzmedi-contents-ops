import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signIn(email, password);
      // onAuthStateChange가 세션 업데이트 → App이 자동으로 대시보드 렌더링
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
    <div className="min-h-screen flex items-center justify-center bg-snow">
      <div className="w-full max-w-sm px-4">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-dark tracking-[5px]">
            BRITZMEDI
          </h1>
          <p className="text-[12px] text-steel mt-1 tracking-[1.5px]">
            CONTENT OPERATIONS
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-xl border border-pale p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-[13px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-silver rounded-lg text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="admin@britzmedi.co.kr"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-steel mb-1">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-silver rounded-lg text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-dark text-white text-[13px] font-medium rounded-lg border-none cursor-pointer hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-mist mt-6">
          BRITZMEDI Content Ops v1.0
        </p>
      </div>
    </div>
  );
}
