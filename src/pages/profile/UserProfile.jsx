import React, { useState, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    User,
    Mail,
    Phone,
    Lock,
    Camera,
    Save,
    Loader2,
    Shield,
    Eye,
    EyeOff,
    CheckCircle,
    CircleDot,
    KeyRound,
    Trash2,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';

const UserProfile = () => {
    const { user } = useAuth();
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

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);

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
    
    const handleRemoveImage = async () => {
        setIsLoading(true);
        setShowRemoveDialog(false);
        try {
            await updateProfile(auth.currentUser, { photoURL: "" });
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { photoURL: "" });
            toast.success("Profile picture removed.");
        } catch (err) {
            console.error("Remove Image Error:", err);
            toast.error("Failed to remove profile picture.");
        } finally {
            setIsLoading(false);
        }
    };

    const initials = user?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* ── Page Header ────────────────────────────── */}
            <div className="space-y-1">
                <h1 className="text-3xl font-black text-foreground tracking-tight">My Profile</h1>
                <p className="text-sm text-muted-foreground">Manage your account settings and personal information.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: Profile Card ──────────────────── */}
                <div className="space-y-4">
                    <Card className="border-border/60 shadow-sm">
                        <CardContent className="pt-8 pb-6 flex flex-col items-center">
                            {/* Avatar */}
                            <div className="relative group">
                                <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                                    <AvatarImage src={user?.photoURL} alt={user?.full_name} />
                                    <AvatarFallback className="text-2xl font-black bg-[#028a0f]/10 text-[#028a0f]">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-full z-10">
                                        <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                                        <span className="text-white text-[9px] font-black">{uploadProgress}%</span>
                                    </div>
                                )}
                                <div className="absolute -bottom-1 -right-1 flex gap-1">
                                    {user?.photoURL && (
                                        <>
                                            <button
                                                onClick={() => setShowRemoveDialog(true)}
                                                disabled={isLoading || isUploading}
                                                className="w-8 h-8 bg-red-500 text-white rounded-full border-2 border-background flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                                                title="Remove Picture"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>

                                            <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                                                <AlertDialogContent className="rounded-[2rem] border-none p-8 max-w-[380px]">
                                                    <AlertDialogHeader>
                                                        <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mb-4 mx-auto">
                                                            <Trash2 className="w-8 h-8 text-red-500" />
                                                        </div>
                                                        <AlertDialogTitle className="text-xl font-black text-center text-slate-900 uppercase tracking-tight">Remove Photo?</AlertDialogTitle>
                                                        <AlertDialogDescription className="text-center text-slate-500 font-medium leading-relaxed">
                                                            Are you sure you want to remove your profile picture? This will revert to your default initials.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
                                                        <AlertDialogCancel className="h-12 rounded-xl border-slate-200 font-bold flex-1">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction 
                                                            onClick={handleRemoveImage}
                                                            className="h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex-1"
                                                        >
                                                            Yes, Remove
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="w-9 h-9 bg-[#028a0f] text-white rounded-full border-4 border-background flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md cursor-pointer"
                                        title="Upload Picture"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                            </div>

                            {/* Info */}
                            <div className="text-center mt-5 space-y-2">
                                <h2 className="text-xl font-black text-foreground tracking-tight">{user?.full_name}</h2>
                                <Badge variant="outline" className="bg-[#028a0f]/10 text-[#028a0f] border-[#028a0f]/20 font-bold text-[10px] uppercase tracking-widest px-3">
                                    {user?.role}
                                </Badge>
                            </div>

                            <Separator className="my-6 w-full" />

                            {/* Quick Info */}
                            <div className="w-full space-y-2">
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 transition-colors">
                                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm font-medium text-foreground truncate">{user?.email}</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 transition-colors">
                                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm font-medium text-foreground">
                                        {user?.phone || 'No phone added'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 transition-colors">
                                    <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm font-medium text-foreground capitalize">{user?.role} Access</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Status Card */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                </div>
                                <CardTitle className="text-sm font-bold">Account Status</CardTitle>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4 space-y-3">
                            {[
                                { label: 'Email Verified', value: auth.currentUser?.emailVerified ? 'Yes' : 'No', color: auth.currentUser?.emailVerified ? 'text-emerald-600' : 'text-amber-600' },
                                { label: 'Auth Provider', value: auth.currentUser?.providerData?.[0]?.providerId === 'google.com' ? 'Google' : 'Email', color: 'text-foreground' },
                                { label: 'Account Role', value: user?.role, color: 'text-[#028a0f]' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <CircleDot className="w-3 h-3 text-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                                    </div>
                                    <span className={`text-xs font-black capitalize ${color}`}>{value}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right: Forms ────────────────────────── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Information */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold">Personal Information</CardTitle>
                                    <CardDescription>Update your display name and contact details.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6">
                            <form onSubmit={handleInfoUpdate} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#028a0f] transition-colors" />
                                            <Input
                                                className="h-12 pl-10 rounded-xl border-border focus:border-[#028a0f] font-medium"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</Label>
                                        <div className="relative group">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#028a0f] transition-colors" />
                                            <Input
                                                className="h-12 pl-10 rounded-xl border-border focus:border-[#028a0f] font-medium"
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
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                            <Input
                                                className="h-12 pl-10 rounded-xl bg-muted/50 border-border/50 font-medium text-muted-foreground cursor-not-allowed"
                                                value={user?.email || ''}
                                                disabled
                                                readOnly
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/70 ml-1 font-medium">
                                            Email cannot be changed for security reasons.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="h-11 px-6 bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-xl shadow-sm gap-2"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Account Security */}
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <KeyRound className="w-4 h-4 text-amber-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold">Account Security</CardTitle>
                                    <CardDescription>Keep your account secure by using a strong password.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-6">
                            <form onSubmit={handlePasswordUpdate} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#028a0f] transition-colors" />
                                            <Input
                                                type={showNewPassword ? 'text' : 'password'}
                                                className="h-12 pl-10 pr-11 rounded-xl border-border focus:border-[#028a0f] font-medium"
                                                placeholder="Enter new password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(p => !p)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#028a0f] transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm Password</Label>
                                        <div className="relative group">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#028a0f] transition-colors" />
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                className="h-12 pl-10 pr-11 rounded-xl border-border focus:border-[#028a0f] font-medium"
                                                placeholder="Confirm password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(p => !p)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#028a0f] transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        disabled={isLoading || !passwordData.newPassword}
                                        variant="outline"
                                        className="h-11 px-6 font-bold rounded-xl gap-2 border-border"
                                    >
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
    );
};

export default UserProfile;
