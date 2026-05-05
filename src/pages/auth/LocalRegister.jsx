import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
    Shield, Eye, EyeOff, Loader2, ChevronRight,
    CheckCircle2, Mail, Lock, Phone,
    GraduationCap, HardHat, ArrowLeft
} from 'lucide-react';
import { sileo } from "sileo";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import gsap from 'gsap';

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export default function LocalRegister() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const prefilledData = location.state || {};

    const [formData, setFormData] = useState({
        firstName: prefilledData.firstName || '',
        lastName: prefilledData.lastName || '',
        email: prefilledData.email || '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        role: ''
    });

    // Handle step transitions with GSAP
    useEffect(() => {
        gsap.fromTo(".step-content", 
            { x: 20, opacity: 0 }, 
            { x: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
        );
    }, [currentStep]);

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const handleStep2Continue = () => {
        if (formData.password !== formData.confirmPassword) {
            sileo.error({ title: 'Mismatch', description: 'Passwords do not match.' });
            return;
        }

        if (formData.phoneNumber.length < 11) {
            sileo.error({ title: 'Invalid Phone Number', description: 'Please enter a valid 11-digit phone number (e.g. 09123456789).' });
            return;
        }

        // Password Validation
        if (formData.password.length < 8) {
            sileo.error({ title: 'Weak Password', description: 'Password must be at least 8 characters long.' });
            return;
        }
        if (!/[A-Z]/.test(formData.password)) {
            sileo.error({ title: 'Weak Password', description: 'Password must contain at least one uppercase letter.' });
            return;
        }
        if (!/[0-9]/.test(formData.password)) {
            sileo.error({ title: 'Weak Password', description: 'Password must contain at least one number.' });
            return;
        }

        nextStep();
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        try {
            let uid, idToken;

            // ── STEP 1: Resolve Auth User ────────────────────────────────────────
            // Two paths:
            //  A) Google Sign In flow: user is already authenticated (auth.currentUser
            //     exists with the same email). We reuse their uid + get a fresh idToken.
            //  B) New email/password user: create via REST API (doesn't fire
            //     onAuthStateChanged, so AuthContext never interferes).

            const currentUser = auth.currentUser;

            if (currentUser && currentUser.email === formData.email) {
                // Path A — Google user already exists in Auth
                uid = currentUser.uid;
                idToken = await currentUser.getIdToken(true);
            } else {
                // Path B — Brand new email/password registration
                const signUpRes = await fetch(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: formData.email,
                            password: formData.password,
                            returnSecureToken: true
                        })
                    }
                );

                const signUpData = await signUpRes.json();

                if (!signUpRes.ok) {
                    const code = signUpData?.error?.message || '';
                    let msg = 'An error occurred during registration.';
                    if (code.includes('EMAIL_EXISTS')) msg = 'This email is already registered. Please log in instead.';
                    else if (code.includes('INVALID_EMAIL')) msg = 'The email address is not valid.';
                    else if (code.includes('WEAK_PASSWORD')) msg = 'Password must be at least 6 characters.';
                    else if (code.includes('OPERATION_NOT_ALLOWED')) msg = 'Email/password sign-up is not enabled. Contact the admin.';
                    throw new Error(msg);
                }

                uid = signUpData.localId;
                idToken = signUpData.idToken;
            }

            // ── STEP 2: Write Firestore document via REST API ────────────────────
            // Pure HTTP — completely bypasses the Firestore SDK auth-state machinery.
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
            const firestoreRes = await fetch(firestoreUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    fields: {
                        full_name:   { stringValue: `${formData.firstName} ${formData.lastName}` },
                        email:       { stringValue: formData.email },
                        phone:       { stringValue: formData.phoneNumber },
                        role:        { stringValue: formData.role },
                        status:      { stringValue: 'Pending' },
                        is_approved: { booleanValue: false },
                        created_at:  { timestampValue: new Date().toISOString() }
                    }
                })
            });

            if (!firestoreRes.ok) {
                const fsErr = await firestoreRes.json().catch(() => ({}));
                throw new Error(fsErr?.error?.message || 'Failed to save your profile. Please try again.');
            }

            // ── STEP 3: Sign out (account needs admin approval) ──────────────────
            // For Google users (Path A) who are currently signed in, we must sign
            // them out because their account is pending approval.
            await signOut(auth).catch(() => {});

            // ── STEP 4: Navigate to login with pending modal ─────────────────────
            sileo.success({
                title: 'Account Created!',
                description: 'Your registration is awaiting approval by the admin.'
            });

            navigate('/login', { state: { registrationPending: true }, replace: true });

        } catch (error) {
            console.error('[Register] Error:', error);
            sileo.error({
                title: 'Registration Failed',
                description: error.message || 'An unexpected error occurred.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const roles = [
        { id: 'teacher', title: 'Teacher', icon: <GraduationCap className="w-6 h-6" />, desc: 'Report damages and track classroom repairs.' },
        { id: 'maintenance', title: 'Maintenance', icon: <HardHat className="w-6 h-6" />, desc: 'Manage repair tasks and update asset status.' },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans selection:bg-emerald-100">
            
            {/* BACK BUTTON */}
            <div className="absolute top-8 left-8 z-10">
                <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group">
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-300">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold">Back to Home</span>
                </Link>
            </div>

            {/* LEFT SIDE: MULTI-STEP FORM */}
            <div className="w-full md:w-[45%] flex flex-col items-center justify-center px-8 lg:px-20 py-20 relative">
                <div className="w-full max-w-[480px] space-y-8">
                    
                    {/* Stepper Header */}
                    <div className="flex items-center justify-between px-2 mb-10">
                        {[1, 2, 3].map((step) => (
                            <React.Fragment key={step}>
                                <div className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm transition-all duration-300 ${
                                    currentStep >= step 
                                    ? 'bg-[#028a0f] text-white shadow-lg shadow-green-900/20 scale-110' 
                                    : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
                                </div>
                                {step < 3 && (
                                    <div className={`flex-1 h-[2px] mx-2 rounded-full transition-colors duration-500 ${
                                        currentStep > step ? 'bg-[#028a0f]' : 'bg-slate-100'
                                    }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="step-content">
                        {/* STEP 1: ROLE SELECTION */}
                        {currentStep === 1 && (
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Step 1: Choose Your Role</h1>
                                    <p className="text-slate-400 font-medium">How will you be using AssetLink?</p>
                                </div>
                                <div className="grid gap-4">
                                    {roles.map((r) => (
                                        <button 
                                            key={r.id}
                                            onClick={() => setFormData({...formData, role: r.id})}
                                            className={`flex items-center gap-5 p-5 rounded-2xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                formData.role === r.id 
                                                ? 'border-[#028a0f] bg-green-50/50 shadow-md' 
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                            }`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                                formData.role === r.id ? 'bg-[#028a0f] text-white' : 'bg-slate-50 text-slate-400'
                                            }`}>
                                                {r.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900">{r.title}</h3>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">{r.desc}</p>
                                            </div>
                                            {formData.role === r.id && <CheckCircle2 className="w-5 h-5 text-[#028a0f]" />}
                                        </button>
                                    ))}
                                </div>
                                <Button 
                                    onClick={nextStep}
                                    disabled={!formData.role}
                                    className="w-full h-13 bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-xl shadow-lg shadow-green-900/10 gap-2"
                                >
                                    Continue as {formData.role ? formData.role.charAt(0).toUpperCase() + formData.role.slice(1) : '...'} <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {/* STEP 2: ACCOUNT INFORMATION (COMBINED) */}
                        {currentStep === 2 && (
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Step 2: Account Information</h1>
                                    <p className="text-slate-400 font-medium">Please provide your details below</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                                            <Input className="h-18 bg-slate-50 border-slate-100 rounded-2xl text-lg px-6" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                                            <Input className="h-18 bg-slate-50 border-slate-100 rounded-2xl text-lg px-6" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                            <Input 
                                                className="h-18 pl-14 bg-slate-50 border-slate-100 rounded-2xl text-lg font-medium" 
                                                placeholder="09XXXXXXXXX" 
                                                type="tel"
                                                value={formData.phoneNumber} 
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                                    if (val.length <= 11) {
                                                        setFormData({...formData, phoneNumber: val});
                                                    }
                                                }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                            <Input className="h-18 pl-14 bg-slate-50 border-slate-100 rounded-2xl text-lg" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={!!prefilledData.email} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                            <Input className="h-18 pl-14 pr-14 bg-slate-50 border-slate-100 rounded-2xl text-lg font-medium" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold ml-1">Min. 8 characters with at least one uppercase letter and one number.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                                            <Input className="h-18 pl-14 pr-14 bg-slate-50 border-slate-100 rounded-2xl text-lg font-medium" type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <Button variant="ghost" onClick={prevStep} className="flex-1 h-13 font-bold text-slate-500 rounded-xl">Back</Button>
                                    <Button onClick={handleStep2Continue} disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.phoneNumber || !formData.password || !formData.confirmPassword} className="flex-[2] h-13 bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-xl gap-2 shadow-lg shadow-green-900/10">Continue <ChevronRight className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: REVIEW & SUBMIT */}
                        {currentStep === 3 && (
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Step 3: Final Review</h1>
                                    <p className="text-slate-400 font-medium">Ready to join AssetLink?</p>
                                </div>
                                <Card className="border-slate-100 bg-slate-50/50 rounded-2xl overflow-hidden">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-slate-400 uppercase">Role</span>
                                            <Badge className="bg-green-100 text-[#028a0f] border-0 font-bold px-3 py-1 uppercase">{formData.role}</Badge>
                                        </div>
                                        <Separator className="opacity-50" />
                                        <div className="grid grid-cols-2 gap-y-4 text-sm font-semibold">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 uppercase">Name</p>
                                                <p className="text-slate-700">{formData.firstName} {formData.lastName}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 uppercase">Email</p>
                                                <p className="text-slate-700 truncate">{formData.email}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 uppercase">Phone</p>
                                                <p className="text-slate-700">{formData.phoneNumber}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-4">
                                    <Button variant="ghost" onClick={prevStep} className="flex-1 h-13 font-bold text-slate-500 rounded-xl" disabled={isLoading}>Back</Button>
                                    <Button onClick={() => handleSubmit()} disabled={isLoading} className="flex-[2] h-13 bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-xl shadow-lg shadow-green-900/10">
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-sm font-semibold text-slate-500">
                        Already have an account? <Link to="/login" className="text-[#028a0f] font-bold hover:underline">Log in</Link>
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: ILLUSTRATION */}
            <div className="hidden md:flex w-[55%] bg-slate-50 items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute top-20 right-20 w-64 h-64 bg-[#028a0f]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="relative z-10 w-full max-w-[650px] space-y-12">
                    <div className="w-full drop-shadow-2xl">
                        <svg viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                            <path d="M0 550C200 550 300 400 400 400C500 400 600 500 800 500V600H0V550Z" fill="#F1F5F9" />
                            <circle cx="500" cy="200" r="80" fill="#028a0f" />
                            <path d="M200 550C400 550 500 350 600 350C700 350 750 450 800 450V600H200V550Z" fill="#E2E8F0" />
                            <g transform="translate(150, 350)">
                                <circle cx="40" cy="30" r="15" fill="#334155" />
                                <path d="M40 45C25 45 15 65 15 100H65C65 65 55 45 40 45Z" fill="#334155" />
                                <rect x="35" y="55" width="25" height="35" rx="5" fill="#028a0f" />
                            </g>
                            <g transform="translate(550, 380)">
                                <circle cx="40" cy="30" r="15" fill="#334155" />
                                <path d="M40 45C25 45 15 65 15 100H65C65 65 55 45 40 45Z" fill="#334155" />
                                <rect x="20" y="55" width="25" height="35" rx="5" fill="#028a0f" />
                            </g>
                        </svg>
                    </div>
                    <div className="space-y-3 px-4">
                        <h3 className="text-3xl font-black text-slate-800 leading-tight">Start Your Journey</h3>
                        <p className="text-slate-500 font-medium max-w-md leading-relaxed">
                            Join AssetLink today and help us build a smarter, more efficient school maintenance system.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

