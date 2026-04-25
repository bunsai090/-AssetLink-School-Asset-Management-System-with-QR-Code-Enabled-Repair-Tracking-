import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { sileo } from "sileo";
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LocalRegister() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        employeeId: '',
        password: '',
        confirmPassword: '',
        role: ''
    });

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            sileo.error({ title: 'Mismatch', description: 'Passwords do not match.' });
            return;
        }
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await setDoc(doc(db, 'users', user.uid), {
                full_name: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                role: formData.role,
                created_at: serverTimestamp()
            });

            await signOut(auth);
            sileo.success({ title: 'Success!', description: `Account created.` });
            navigate('/');
        } catch (error) {
            sileo.error({ title: 'Error', description: error.message });
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center font-sans p-6">
            <div className="w-full max-w-[500px] space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Create Account</h1>
                    <p className="text-slate-500 text-sm">Join AssetLink to manage school resources</p>
                </div>

                <div className="space-y-6">
                    {/* Simplified Form */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">First Name</label>
                            <Input className="h-11 border-slate-200" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Last Name</label>
                            <Input className="h-11 border-slate-200" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Email Address</label>
                        <Input className="h-11 border-slate-200" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Password</label>
                        <Input className="h-11 border-slate-200" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                        <Input className="h-11 border-slate-200" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Role</label>
                        <select 
                            className="w-full h-11 border border-slate-200 rounded-md px-3 text-sm focus:ring-2 focus:ring-[#22c55e] focus:outline-none"
                            value={formData.role}
                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="">Select Role</option>
                            <option value="teacher">Teacher</option>
                            <option value="principal">Principal</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>

                    <Button 
                        onClick={handleSubmit}
                        className="w-full h-11 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-md"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign Up'}
                    </Button>

                    <p className="text-center text-sm text-slate-600">
                        Already have an account? <Link to="/" className="text-[#22c55e] font-bold hover:underline">Log in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
