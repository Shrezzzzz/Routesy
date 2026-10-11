import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { SESSION_ID_KEY } from '../utils/api';

const TOKEN_KEY = 'routesy-token';
const EMAIL_KEY = 'routesy-user-email';

interface AuthResponse {
  token: string;
  user: { id: string; email: string; createdAt: string };
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await api.post<AuthResponse>('/api/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(EMAIL_KEY, data.user.email);
      // Guest trips are migrated server-side via X-Session-Id header (auto-sent by api.post)
      // Clear session ID so future requests use authenticated identity
      localStorage.removeItem(SESSION_ID_KEY);
      navigate('/trips');
    } catch (err) {
      setError((err as Error).message ?? 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
          Sign in
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
          Welcome back to Routesy
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            id="login-email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />

          <Input
            id="login-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
