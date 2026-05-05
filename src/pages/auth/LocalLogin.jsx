import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
    Shield, Eye, EyeOff, Loader2, Mail, Lock, ArrowLeft, Clock, AlertCircle 
} from 'lucide-react';
import { useNavigate, Link, useLocation } from "react-router-dom";
import { 
    Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter
} from '@/components/ui/dialog';
import { sileo } from "sileo";
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function LocalLogin() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check if we just came from a successful registration
    const [showPendingModal, setShowPendingModal] = useState(location.state?.registrationPending || false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check Firestore to verify account approval status
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (!userDoc.exists()) {
                // Auth account exists but no Firestore record — sign out and show error
                await auth.signOut();
                sileo.error({ title: 'Account Not Found', description: 'Your account record is missing. Please contact the admin.' });
                return;
            }

            const userData = userDoc.data();

            if (userData.is_approved === false && userData.role !== 'admin') {
                // Account is pending — sign out and show pending modal
                await auth.signOut();
                setShowPendingModal(true);
                return;
            }

            // Account is approved — proceed to dashboard
            sileo.success({
                title: 'Login Successful',
                description: `Welcome back, ${userData.full_name || user.email}!`
            });
            navigate('/');

        } catch (error) {
            let errorMsg = 'Invalid credentials. Please check your email and password.';
            if (error.code === 'auth/user-not-found') errorMsg = 'No account found with this email.';
            else if (error.code === 'auth/wrong-password') errorMsg = 'Incorrect password.';
            else if (error.code === 'auth/invalid-credential') errorMsg = 'Invalid email or password.';
            else if (error.code === 'auth/too-many-requests') errorMsg = 'Too many failed attempts. Please try again later.';

            sileo.error({ title: 'Login Failed', description: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                sileo.success({
                    title: 'Login Successful',
                    description: `Welcome back, ${userData.full_name || user.displayName}!`
                });
                navigate('/');
            } else {
                sileo.info({
                    title: 'Account Not Found',
                    description: 'Please complete your registration to continue.'
                });
                
                navigate('/register', { 
                    state: { 
                        email: user.email,
                        firstName: user.displayName?.split(' ')[0] || '',
                        lastName: user.displayName?.split(' ').slice(1).join(' ') || ''
                    } 
                });
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            sileo.error({
                title: 'Google Login Failed',
                description: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans selection:bg-emerald-100">
            
            {/* REGISTRATION PENDING MODAL */}
            <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Account Pending
                        </DialogTitle>
                        <DialogDescription>
                            Your registration was successful, but your account requires verification.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex bg-amber-50 border border-amber-200 p-4 rounded-md items-start gap-3 mt-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900 leading-none">
                                Pending Approval
                            </p>
                            <p className="text-sm text-amber-700 leading-relaxed mt-1">
                                For security purposes, your registration needs to be verified by the Principal or System Admin before you can log in.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="mt-4">
                        <Button type="button" onClick={() => setShowPendingModal(false)} className="w-full sm:w-auto">
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BACK BUTTON */}
            <div className="absolute top-8 left-8 z-10">
                <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group">
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-300">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">Back to Home</span>
                </Link>
            </div>

            {/* LEFT SIDE: LOGIN FORM */}
            <div className="w-full md:w-[45%] flex items-center justify-center px-8 lg:px-20 py-20 relative">
                <div className="w-full max-w-[420px] space-y-10">
                    
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome back</h1>
                        <p className="text-slate-400 font-medium">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-5">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#028a0f] transition-colors">
                                        <Mail className="w-6 h-6" />
                                    </div>
                                    <Input 
                                        type="email" 
                                        placeholder="name@example.com"
                                        className="h-18 pl-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-[#028a0f]/10 focus:border-[#028a0f] rounded-2xl transition-all text-lg font-medium"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                                    <button type="button" className="text-[11px] font-bold text-[#028a0f] hover:underline">Forgot password?</button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#028a0f] transition-colors">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="••••••••"
                                        className="h-18 pl-14 pr-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-[#028a0f]/10 focus:border-[#028a0f] rounded-2xl transition-all text-lg font-medium"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember Me */}
                            <div className="flex items-center space-x-2 px-1">
                                <Checkbox id="remember" className="border-slate-300 data-[state=checked]:bg-[#028a0f] data-[state=checked]:border-[#028a0f]" />
                                <label htmlFor="remember" className="text-sm font-semibold text-slate-500 cursor-pointer">Remember me for 7 days</label>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 pt-2">
                            <Button 
                                type="submit"
                                className="w-full h-13 bg-[#028a0f] hover:bg-[#016d0c] text-white text-base font-bold rounded-xl shadow-lg shadow-green-900/10 transition-all active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                            </Button>
                            
                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <Separator className="w-full" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-black">
                                    <span className="bg-white px-4 text-slate-300 tracking-widest">Or continue with</span>
                                </div>
                            </div>

                            <Button 
                                type="button"
                                variant="outline"
                                className="w-full h-13 bg-white border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] gap-3"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Google
                            </Button>
                        </div>

                        <p className="text-center text-sm font-semibold text-slate-500">
                            Don't have an account? <Link to="/register" className="text-[#028a0f] font-bold hover:underline">Sign up for free</Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: ILLUSTRATION & DECORATION */}
            <div className="hidden md:flex w-[55%] bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
                {/* Decoration Circles */}
                <div className="absolute top-20 right-20 w-64 h-64 bg-[#028a0f]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                
                <div className="relative z-10 w-full max-w-[650px] space-y-12">
                    {/* SVG Illustration - High Quality Custom Style */}
                    <div className="w-full drop-shadow-2xl">
                        <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                            {/* Background Hills */}
                            <path d="M0 550C200 550 300 400 400 400C500 400 600 500 800 500V600H0V550Z" fill="#F1F5F9" />
                            <path d="M200 550C400 550 500 350 600 350C700 350 750 450 800 450V600H200V550Z" fill="#E2E8F0" />
                            
                            {/* Sun/Circle */}
                            <circle cx="500" cy="200" r="80" fill="#028a0f" />
                            
                            {/* Abstract Paths */}
                            <path d="M100 550C150 450 250 450 300 550" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 12" />
                            <path d="M400 450C450 350 550 350 600 450" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeDasharray="12 12" />

                            {/* Minimalist Human Characters (Simplified style from reference) */}
                            {/* Character 1 */}
                            <g transform="translate(150, 350)">
                                <circle cx="40" cy="30" r="15" fill="#334155" />
                                <path d="M40 45C25 45 15 65 15 100H65C65 65 55 45 40 45Z" fill="#334155" />
                                <rect x="35" y="55" width="25" height="35" rx="5" fill="#028a0f" /> {/* Backpack */}
                            </g>
                            {/* Character 2 */}
                            <g transform="translate(550, 380)">
                                <circle cx="40" cy="30" r="15" fill="#334155" />
                                <path d="M40 45C25 45 15 65 15 100H65C65 65 55 45 40 45Z" fill="#334155" />
                                <rect x="20" y="55" width="25" height="35" rx="5" fill="#028a0f" /> {/* Backpack */}
                            </g>

                            {/* Plants */}
                            <g transform="translate(450, 430)">
                                <rect x="10" y="40" width="15" height="20" fill="#475569" />
                                <circle cx="10" cy="30" r="10" fill="#10B981" />
                                <circle cx="25" cy="35" r="8" fill="#059669" />
                            </g>
                            <g transform="translate(510, 420)">
                                <rect x="10" y="40" width="15" height="20" fill="#475569" />
                                <circle cx="10" cy="30" r="10" fill="#10B981" />
                                <circle cx="25" cy="35" r="8" fill="#059669" />
                            </g>
                        </svg>
                    </div>

                    {/* Mission Text */}
                    <div className="space-y-3 px-4">
                        <h3 className="text-3xl font-black text-slate-800 leading-tight">Empowering Schools</h3>
                        <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                            Join thousands of users making a real difference in asset management, one scan at a time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
