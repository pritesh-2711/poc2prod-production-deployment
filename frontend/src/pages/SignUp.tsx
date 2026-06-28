import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { signUp } from '../services/api';

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-danger', 'bg-warning', 'bg-success'];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-surface-border'}`} />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map(c => (
          <span key={c.label} className={`flex items-center gap-1 text-xs transition-colors ${c.pass ? 'text-success' : 'text-ink-muted'}`}>
            <CheckCircle2 size={10} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await signUp(name.trim(), email.trim(), password);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl text-center">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-success" />
          <h2 className="text-xl font-semibold text-ink-primary mb-2">Request submitted</h2>
          <p className="text-ink-secondary text-sm mb-6">
            Your account is awaiting admin approval. You will be able to sign in once your access is granted.
          </p>
          <Link to="/signin" className="text-brand hover:text-brand-glow font-medium text-sm transition-colors">
            Back to Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-semibold text-ink-primary mb-1">Create your account</h2>
        <p className="text-ink-secondary text-sm mb-6">Start your AI-assisted research journey</p>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-ink-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
                className="w-full bg-surface-overlay border border-surface-border rounded-xl pl-10 pr-4 py-3 text-ink-primary placeholder-ink-muted text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 transition-all"
              />
            </div>
          </div>

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
            {password && <PasswordStrength password={password} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-ink-secondary text-xs font-medium mb-1.5 uppercase tracking-wide">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full bg-surface-overlay border rounded-xl pl-10 pr-4 py-3 text-ink-primary placeholder-ink-muted text-sm outline-none focus:ring-1 transition-all ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-danger focus:border-danger focus:ring-danger/30'
                    : 'border-surface-border focus:border-brand focus:ring-brand/30'
                }`}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !name || !email || !password || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all duration-200 text-sm mt-2"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-ink-secondary text-sm">
          Already have an account?{' '}
          <Link to="/signin" className="text-brand hover:text-brand-glow font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-ink-muted text-xs mt-4">
        Running in demo mode · No backend required
      </p>
    </AuthLayout>
  );
}
