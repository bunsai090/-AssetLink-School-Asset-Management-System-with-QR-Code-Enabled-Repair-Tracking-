import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    User, 
    Mail, 
    Phone, 
    Lock, 
    Camera, 
    Save, 
    Loader2, 
    ArrowLeft,
    Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const [formData, setFormData] = useState({
        fullName: user?.full_name || '',
        phoneNumber: user?.phone || '',
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: '',
    });

    const handleInfoUpdate = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                full_name: formData.fullName,
                phone: formData.phoneNumber
            });
            
            await updateProfile(auth.currentUser, {
                displayName: formData.fullName
            });

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Update Error:", error);
            toast.error("Failed to update profile info.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return toast.error("Passwords do not match!");
        }
        
        setIsLoading(true);
        try {
            await updatePassword(auth.currentUser, passwordData.newPassword);
            setPasswordData({ newPassword: '', confirmPassword: '' });
            toast.success("Password updated successfully!");
        } catch (error) {
            console.error("Password Error:", error);
            toast.error(error.message || "Failed to update password. You may need to re-login.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return toast.error("Please upload an image file.");
        }

        setIsUploading(true);
        setUploadProgress(0);
        
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, true);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(progress);
                }
            };

            xhr.onload = async () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    const imageUrl = response.secure_url;

                    try {
                        await updateProfile(auth.currentUser, { photoURL: imageUrl });
                        const userRef = doc(db, 'users', user.uid);
                        await updateDoc(userRef, { photoURL: imageUrl });
                        toast.success("Profile picture updated!");
                    } catch (err) {
                        console.error("Firebase Update Error:", err);
                        toast.error("Upload success, but failed to link to your account.");
                    } finally {
                        setIsUploading(false);
                        setUploadProgress(0);
                    }
                } else {
                    const error = JSON.parse(xhr.responseText);
                    console.error("Cloudinary Error:", error);
                    toast.error(error.error?.message || "Cloudinary upload failed.");
                    setIsUploading(false);
                }
            };

            xhr.onerror = () => {
                toast.error("Network error during upload.");
                setIsUploading(false);
            };

            xhr.send(formData);

        } catch (error) {
            console.error("Critical Upload Error:", error);
            setIsUploading(false);
            toast.error("An unexpected error occurred.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <div className="h-48 bg-[#028a0f] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-black rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
                </div>
                <div className="container mx-auto px-6 h-full flex items-end pb-6">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate(-1)}
                        className="absolute top-6 left-6 text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back
                    </Button>
                </div>
            </div>

            <div className="container mx-auto px-6 -mt-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="space-y-6">
                        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                            <CardContent className="pt-10 pb-8 flex flex-col items-center">
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-16 h-16 text-slate-300" />
                                        )}
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-3xl z-10">
                                                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                                                <span className="text-white text-[10px] font-black uppercase tracking-widest">{uploadProgress}%</span>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#028a0f] text-white rounded-xl border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                                    >
                                        <Camera className="w-5 h-5" />
                                    </button>
                                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                                </div>

                                <div className="text-center mt-6">
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{user?.full_name}</h2>
                                    <Badge className="mt-2 bg-green-100 text-[#028a0f] border-0 font-bold px-3 py-1 uppercase text-[10px] tracking-widest">
                                        {user?.role}
                                    </Badge>
                                </div>

                                <div className="w-full mt-8 space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-semibold text-slate-600">{user?.phone || 'No phone added'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-slate-100 shadow-xl shadow-slate-200/50">
                            <CardHeader className="border-b border-slate-50 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-[#028a0f]">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Personal Information</CardTitle>
                                        <CardDescription>Update your display name and contact details.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <form onSubmit={handleInfoUpdate} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                            <div className="relative group">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#028a0f] transition-colors" />
                                                <Input 
                                                    className="h-14 pl-11 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-semibold"
                                                    value={formData.fullName}
                                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#028a0f] transition-colors" />
                                                <Input 
                                                    className="h-14 pl-11 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-semibold"
                                                    placeholder="09XXXXXXXXX"
                                                    value={formData.phoneNumber}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        if (val.length <= 11) setFormData({...formData, phoneNumber: val});
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                            <div className="relative group">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input 
                                                    className="h-14 pl-11 bg-slate-100/70 border-slate-200 rounded-xl font-semibold text-slate-500 cursor-not-allowed select-none focus:outline-none"
                                                    value={user?.email || ''}
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 ml-1 font-medium">Email address cannot be changed directly for security reasons.</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-xl shadow-lg gap-2 transition-all active:scale-95">
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-100 shadow-xl shadow-slate-200/50">
                            <CardHeader className="border-b border-slate-50 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Account Security</CardTitle>
                                        <CardDescription>Keep your account secure by using a strong password.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#028a0f] transition-colors" />
                                                <Input 
                                                    type="password"
                                                    className="h-14 pl-11 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-semibold"
                                                    placeholder="Enter new password"
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#028a0f] transition-colors" />
                                                <Input 
                                                    type="password"
                                                    className="h-14 pl-11 bg-slate-50 border-slate-100 focus:bg-white rounded-xl font-semibold"
                                                    placeholder="Confirm new password"
                                                    value={passwordData.confirmPassword}
                                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button type="submit" disabled={isLoading || !passwordData.newPassword} className="h-12 px-8 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg gap-2 transition-all active:scale-95">
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                            Update Password
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
