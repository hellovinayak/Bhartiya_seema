import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, UserPlus, AlertCircle, MapPin, ShieldCheck } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';

const AuthPage: React.FC = () => {
  const { isAuthenticated, login, signup, loading, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [animating, setAnimating] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    name: '', email: '', password: '', confirmPassword: '', rank: '', unit: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const switchMode = () => {
    setAnimating(true);
    setTimeout(() => {
      setIsLogin(prev => !prev);
      setAnimating(false);
    }, 300);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(loginEmail, loginPassword);
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    if (signupErrors[name]) setSignupErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!signupData.name.trim()) errors.name = 'Name is required';
    if (!signupData.email.trim()) errors.email = 'Email is required';
    if (!signupData.password) errors.password = 'Password is required';
    if (signupData.password !== signupData.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (!signupData.rank.trim()) errors.rank = 'Rank is required';
    if (!signupData.unit.trim()) errors.unit = 'Unit is required';
    if (Object.keys(errors).length > 0) { setSignupErrors(errors); return; }
    await signup({ name: signupData.name, email: signupData.email, rank: signupData.rank, unit: signupData.unit, location: { lat: 32.7177, lng: 74.8573 } }, signupData.password);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main
        className="flex-grow bg-cover bg-center relative flex items-center justify-center py-10 px-4"
        style={{ backgroundImage: "url('/custom-army.jpg')" }}
      >
        <div className="absolute inset-0 bg-army-green-900 bg-opacity-70" />

        {/* Animated Card */}
        <div
          className="relative z-10 w-full max-w-md"
          style={{
            animation: animating
              ? 'formExit 0.3s ease forwards'
              : 'formEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <style>{`
            @keyframes formEnter {
              0% { opacity: 0; transform: scale(0.85) translateY(20px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes formExit {
              0% { opacity: 1; transform: scale(1) translateY(0); }
              100% { opacity: 0; transform: scale(0.85) translateY(-20px); }
            }
          `}</style>

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-army-khaki-200">
            {/* Top tricolour stripe */}
            <div className="h-1.5 bg-gradient-to-r from-saffron via-white to-green-600" />

            {/* Header */}
            <div className="bg-army-green-800 p-6 flex flex-col items-center">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-army-green-900 border-2 border-army-gold/60 mb-3">
                <Shield className="h-7 w-7 text-army-gold" />
              </div>
              <h2 className="text-white text-xl font-bold font-headline tracking-tight">BHARTIYA SEEMA</h2>
              <p className="text-army-khaki-200 text-xs mt-1 uppercase tracking-wider">
                {isLogin ? 'Secure Authentication' : 'Officer Registration Portal'}
              </p>

              {/* Toggle tabs */}
              <div className="flex mt-5 bg-army-green-900 rounded-full p-1 w-full max-w-xs">
                <button
                  onClick={() => !isLogin && switchMode()}
                  className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${isLogin ? 'bg-army-gold text-army-green-900 shadow' : 'text-army-khaki-300 hover:text-white'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => isLogin && switchMode()}
                  className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-300 ${!isLogin ? 'bg-army-gold text-army-green-900 shadow' : 'text-army-khaki-300 hover:text-white'}`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Form body */}
            <div className="p-6">
              {error && (
                <div className="flex items-start bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 text-sm">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {isLogin ? (
                /* ── LOGIN FORM ── */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="form-label flex items-center"><Mail className="h-4 w-4 mr-1" /> Email</label>
                    <input type="email" className="form-input" placeholder=" " value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="form-label flex items-center"><Lock className="h-4 w-4 mr-1" /> Password</label>
                    <div className="relative">
                      <input type={showLoginPassword ? 'text' : 'password'} className="form-input pr-10" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                      <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500" onClick={() => setShowLoginPassword(p => !p)}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showLoginPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-gray-600"><input type="checkbox" className="rounded" /> Remember me</label>
                    <a href="#" className="text-army-green-600 hover:underline">Forgot password?</a>
                  </div>
                  <button type="submit" className="btn w-full bg-saffron hover:bg-orange-600 text-white font-semibold rounded-lg" disabled={loading}>
                    {loading ? 'Signing in...' : 'Login'}
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Demo: <span className="font-mono">vinayak.rathod@example.com</span> / any password
                  </p>
                </form>
              ) : (
                /* ── SIGNUP FORM ── */
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="form-label flex items-center"><User className="h-4 w-4 mr-1" /> Full Name</label>
                    <input type="text" name="name" className="form-input" placeholder="Maj. Vikram Singh" value={signupData.name} onChange={handleSignupChange} />
                    {signupErrors.name && <p className="text-red-500 text-xs mt-1">{signupErrors.name}</p>}
                  </div>
                  <div>
                    <label className="form-label flex items-center"><Mail className="h-4 w-4 mr-1" /> Email</label>
                    <input type="email" name="email" className="form-input" placeholder="your.email@example.com" value={signupData.email} onChange={handleSignupChange} />
                    {signupErrors.email && <p className="text-red-500 text-xs mt-1">{signupErrors.email}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Rank</label>
                      <select name="rank" className="form-input" value={signupData.rank} onChange={handleSignupChange}>
                        <option value="">Select Rank</option>
                        {['Lieutenant','Captain','Major','Lieutenant Colonel','Colonel','Brigadier','Major General','Lieutenant General'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {signupErrors.rank && <p className="text-red-500 text-xs mt-1">{signupErrors.rank}</p>}
                    </div>
                    <div>
                      <label className="form-label">Unit</label>
                      <input type="text" name="unit" className="form-input" placeholder="7th Infantry" value={signupData.unit} onChange={handleSignupChange} />
                      {signupErrors.unit && <p className="text-red-500 text-xs mt-1">{signupErrors.unit}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="form-label flex items-center"><Lock className="h-4 w-4 mr-1" /> Password</label>
                    <input type="password" name="password" className="form-input" placeholder="••••••••" value={signupData.password} onChange={handleSignupChange} />
                    {signupErrors.password && <p className="text-red-500 text-xs mt-1">{signupErrors.password}</p>}
                  </div>
                  <div>
                    <label className="form-label flex items-center"><Lock className="h-4 w-4 mr-1" /> Confirm Password</label>
                    <input type="password" name="confirmPassword" className="form-input" placeholder="••••••••" value={signupData.confirmPassword} onChange={handleSignupChange} />
                    {signupErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{signupErrors.confirmPassword}</p>}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center"><MapPin className="h-3 w-3 mr-1" /> Your current location will be used as your initial position.</p>
                  <button type="submit" className="btn w-full flex items-center justify-center bg-saffron hover:bg-orange-600 text-white font-semibold rounded-lg" disabled={loading}>
                    {loading ? 'Creating Account...' : <><UserPlus className="h-4 w-4 mr-1" /> Sign Up</>}
                  </button>
                </form>
              )}

              {/* Footer switch link */}
              <p className="text-sm text-center text-gray-600 mt-4">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button onClick={switchMode} className="text-army-green-600 hover:text-army-green-500 font-medium underline">
                  {isLogin ? 'Sign up' : 'Login'}
                </button>
              </p>

              {/* Admin Login divider */}
              <div className="flex items-center my-3">
                <div className="flex-grow border-t border-gray-200" />
                <span className="mx-3 text-xs text-gray-400 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-gray-200" />
              </div>
              <a
                href="/admin/login"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-army-gold/60 text-army-gold text-sm font-bold hover:bg-army-gold/10 transition-all duration-200"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Login
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;