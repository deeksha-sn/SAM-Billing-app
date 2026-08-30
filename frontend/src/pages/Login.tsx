import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api';
import { Lock, User } from 'lucide-react';

export const Login: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      login(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto shadow-lg shadow-emerald-900/50 mb-3">
            SAM
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Agro Machinerys</h1>
          <p className="text-sm text-slate-400 mt-1">Business Management System</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin / office / ravi"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition transform active:scale-[0.98]"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials Quick Fill */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">Demo Accounts (Click to Fill):</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => { setUsername('admin'); setPassword('admin123'); }}
              className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs rounded-lg font-mono font-medium border border-slate-700"
            >
              Admin
            </button>
            <button
              onClick={() => { setUsername('office'); setPassword('office123'); }}
              className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs rounded-lg font-mono font-medium border border-slate-700"
            >
              Office
            </button>
            <button
              onClick={() => { setUsername('ravi'); setPassword('tech123'); }}
              className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs rounded-lg font-mono font-medium border border-slate-700"
            >
              Technician
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
