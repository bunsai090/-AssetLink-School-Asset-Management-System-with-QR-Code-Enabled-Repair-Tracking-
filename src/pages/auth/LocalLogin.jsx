import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";
import { sileo } from "sileo";
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LocalLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            sileo.success({
                title: 'Login Successful',
                description: `Welcome back!`
            });
        } catch (error) {
            let errorMsg = 'Invalid credentials.';
            if (error.code === 'auth/user-not-found') errorMsg = 'Email not found.';
            else if (error.code === 'auth/wrong-password') errorMsg = 'Incorrect password.';

            sileo.error({
                title: 'Login Failed',
                description: errorMsg
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center font-sans">
            <div className="w-full max-w-[1100px] flex flex-col md:flex-row items-center px-6 md:px-12 py-12">
                
                {/* Left Side: Form */}
                <div className="w-full md:w-1/2 max-w-[400px] space-y-8">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Login</h1>
                        <p className="text-slate-500 text-sm">Enter your email below to login to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Email</label>
                                <Input 
                                    type="email" 
                                    placeholder="Email"
                                    className="h-11 border-slate-200 focus:ring-[#22c55e] focus:border-[#22c55e] rounded-md"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <label className="text-sm font-bold text-slate-700">Password</label>
                                    <button type="button" className="text-xs text-slate-500 hover:underline">Forgot your password?</button>
                                </div>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Password"
                                        className="h-11 border-slate-200 focus:ring-[#22c55e] focus:border-[#22c55e] rounded-md"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button 
                                type="submit"
                                className="w-full h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-md"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                            </Button>
                            
                            <Button 
                                type="button"
                                variant="outline"
                                className="w-full h-11 border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                            >
                                Login with Google
                            </Button>
                        </div>

                        <p className="text-center text-sm text-slate-600">
                            Don't have an account? <Link to="/register" className="text-[#22c55e] font-bold hover:underline">Sign up</Link>
                        </p>
                    </form>
                </div>

                {/* Right Side: Illustration Placeholder */}
                <div className="hidden md:flex w-full md:w-1/2 items-center justify-center pl-12">
                    <div className="relative w-full aspect-square max-w-[500px]">
                        {/* Simple Minimalist SVG Illustration */}
                        <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#22c55e]">
                            <circle cx="250" cy="250" r="150" fill="currentColor" fillOpacity="0.1" />
                            <circle cx="200" cy="150" r="40" fill="currentColor" />
                            <path d="M100 400C100 300 200 250 250 250C300 250 400 300 400 400" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            <rect x="300" y="200" width="80" height="120" rx="10" stroke="currentColor" strokeWidth="4" />
                            <path d="M340 180V200" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            {/* Minimalist landscape lines */}
                            <path d="M50 450H450" stroke="#e2e8f0" strokeWidth="2" />
                            <path d="M150 450L250 300L350 450" stroke="#e2e8f0" strokeWidth="2" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
