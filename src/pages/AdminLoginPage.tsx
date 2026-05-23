import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { useAuth } from '../contexts/AuthContext';

const AdminLoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.status === 'success') {
                localStorage.setItem('adminToken', data.token);
                await login(username, password);
                navigate('/admin/dashboard');
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Connection to security server failed');
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main 
                className="flex-grow bg-cover bg-center relative py-12 px-4 flex items-center justify-center"
                style={{ backgroundImage: "url('/custom-army.jpg')" }}
            >
                <div className="absolute inset-0 bg-army-green-900 bg-opacity-70"></div>
                <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-army-khaki-200/40 bg-army-green-900/60 px-4 py-2 text-xs font-bold uppercase tracking-widest text-army-khaki-100 transition-colors hover:bg-army-green-900 hover:text-army-gold focus:outline-none focus:ring-2 focus:ring-army-gold"
                    aria-label="Back to login page"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                </button>
                <div className="relative z-10 max-w-md w-full bg-white rounded-xl shadow-army border-b-8 border-army-green-700 overflow-hidden">
                    <div className="bg-army-green-800 p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Shield className="h-24 w-24 text-white" />
                        </div>
                            <div className="inline-flex items-center justify-center p-3 bg-army-gold rounded-full mb-4 shadow-lg">
                                <Lock className="h-8 w-8 text-army-green-900" />
                            </div>
                            <h2 className="text-2xl font-headline font-bold text-army-gold uppercase tracking-widest">Battalion Command</h2>
                            <p className="text-army-khaki-200 text-sm mt-2 font-medium">Bhartiya Seema Security Portal</p>
                        </div>

                        <form onSubmit={handleLogin} className="p-8 space-y-6">
                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 text-xs font-bold uppercase animate-pulse">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-army-green-800 uppercase tracking-widest mb-2">Service ID / Username</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-5 w-5 text-army-green-600" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border-2 border-army-khaki-200 rounded-lg bg-army-khaki-50 text-army-green-900 placeholder-army-khaki-300 focus:outline-none focus:border-army-gold transition-colors font-bold"
                                        placeholder="admin"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-army-green-800 uppercase tracking-widest mb-2">Access Key / Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Shield className="h-5 w-5 text-army-green-600" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border-2 border-army-khaki-200 rounded-lg bg-army-khaki-50 text-army-green-900 placeholder-army-khaki-300 focus:outline-none focus:border-army-gold transition-colors font-bold"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-army-green-700 hover:bg-army-green-800 text-army-gold font-headline font-bold py-4 rounded-lg shadow-lg flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest"
                            >
                                <span>Authenticate Access</span>
                                <ArrowRight className="h-5 w-5" />
                            </button>

                            <p className="text-center text-[10px] text-army-khaki-400 font-mono">
                                SECURE 256-BIT ENCRYPTED CHANNEL
                            </p>
                        </form>
                    </div>
            </main>
            <Footer />
        </div>
    );
};

export default AdminLoginPage;
