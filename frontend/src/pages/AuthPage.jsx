import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

function LeilaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 900, fontSize: '3rem', color: '#111', letterSpacing: '-1px' }}>
          Leila
        </span>
        <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#e00', display: 'inline-block', marginTop: '6px' }} />
      </div>
      <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.75rem', color: '#444', letterSpacing: '0.5px', marginTop: '-4px' }}>
        la rete degli oggetti
      </span>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await authAPI.resetPassword(resetForm.email, resetForm.newPassword);
      alert('\u2705 Password reimpostata con successo!');
      setShowReset(false);
      setResetForm({ email: '', newPassword: '' });
    } catch (err) {
      alert(err.response?.data?.error || 'Errore nel reset della password');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await authAPI.login(formData.email, formData.password);
      } else {
        response = await authAPI.register(formData.email, formData.password, formData.name);
      }
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Qualcosa \u00e8 andato storto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <LeilaLogo />
        </div>
        <h2 className="text-lg font-semibold text-center text-gray-700 mb-6">
          {isLogin ? 'Accedi al tuo account' : 'Crea un account'}
        </h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input type="text" name="name" placeholder="Nome completo" value={formData.name} onChange={handleChange} required={!isLogin}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-10" />
          )}
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-10" />
          <div className="relative">
            <input type={showPwd ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm pr-10" />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPwd ? "\uD83D\uDE48" : "\uD83D\uDC41"}</button>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
          </button>
        </form>
        <div className="mt-6 text-center">
          {isLogin ? 'Non hai un account? ' : 'Hai gi\u00e0 un account? '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-semibold hover:underline">
            {isLogin ? 'Registrati' : 'Accedi'}
          </button>
          {isLogin && (
            <button type="button" onClick={() => setShowReset(true)}
              style={{ marginTop: '12px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline', display: 'block', width: '100%' }}>
              \uD83D\uDD11 Reimposta password
            </button>
          )}
        </div>
      </div>
      {showReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '24px', width: '320px' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '4px' }}>\uD83D\uDD11 Reimposta password</h3>
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <input type="email" placeholder="Email" value={resetForm.email}
                onChange={e => setResetForm(p => ({ ...p, email: e.target.value }))}
                required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              <input type="password" placeholder="Nuova password (min 6 caratteri)" value={resetForm.newPassword}
                onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))}
                required minLength={6} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              <button type="submit" style={{ padding: '8px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Reimposta
              </button>
              <button type="button" onClick={() => setShowReset(false)} style={{ padding: '6px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
                Annulla
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
