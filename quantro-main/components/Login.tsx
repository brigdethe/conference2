import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminAuth', 'true');
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ backgroundColor: '#f8efe6' }}>
      <div className="w-full max-w-sm">
        <div className="rounded-2xl shadow-warm p-8" style={{ backgroundColor: '#f4ece4' }}>
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#3d2b27' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="font-heading text-2xl font-normal tracking-tight" style={{ color: '#3d2b27' }}>Admin Login</h1>
            <p className="text-sm mt-1" style={{ color: '#8f6248' }}>Conference Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: '#5a413b' }}>
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3d2b27] focus:border-transparent transition-all"
                style={{ borderColor: '#ddd4cc', color: '#3d2b27', backgroundColor: '#fff' }}
                placeholder="Enter username"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#5a413b' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3d2b27] focus:border-transparent transition-all"
                style={{ borderColor: '#ddd4cc', color: '#3d2b27', backgroundColor: '#fff' }}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#3d2b27] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#3d2b27' }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 font-medium" style={{ color: '#8f6248' }}>
          Ghana Competition Law Seminar
        </p>
      </div>
    </div>
  );
}
