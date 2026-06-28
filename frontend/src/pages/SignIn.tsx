import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { signIn } from '../services/api';

export function SignIn() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const { user } = await signIn(email.trim(), password);
      setUser(user);
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-ink-primary mb-1">Welcome back</h2>
        <p className="text-ink-secondary text-sm mb-6">Sign in to continue your research sessions</p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-ink-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full bg-surface-overlay border border-surface-border rounded-xl pl-10 pr-4 py-3 text-ink-primary placeholder-ink-muted text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-ink-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-surface-overlay border border-surface-border rounded-xl pl-10 pr-11 py-3 text-ink-primary placeholder-ink-muted text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 text-sm mt-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-secondary text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand hover:text-brand-glow font-medium transition-colors">
            Create one
          </Link>
        </p>
      </div>

      {/* Demo hint */}
      <p className="text-center text-ink-muted text-xs mt-4">
        Running in demo mode · No backend required
      </p>
    </AuthLayout>
  );
}
