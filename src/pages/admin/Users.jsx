import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
    Users, UserPlus, ShieldCheck, ShieldAlert, Trash2, Search, 
    Filter, MoreVertical, CheckCircle, XCircle, Mail, Phone, 
    UserCog, HardHat, GraduationCap, Loader2, ArrowRight, Clock, User,
    Eye, EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { sileo } from 'sileo';
// Note: we do NOT use createUserWithEmailAndPassword here because it would
// sign out the current admin. We use the REST API instead.
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from '@/components/ui/tabs';

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export default function UserManagement() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [activeTab, setActiveTab] = useState('active');
    
    // Create Principal Modal
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creatingPrincipal, setCreatingPrincipal] = useState(false);
    const [newPrincipal, setNewPrincipal] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        userId: null,
        type: null, // 'reject' or 'delete'
        isLoading: false
    });

    useEffect(() => {
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(allUsers);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(u => {
        const matchSearch = u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === 'all' || u.role === filterRole;
        const matchStatus = activeTab === 'pending' ? u.is_approved === false : u.is_approved !== false;
        return matchSearch && matchRole && matchStatus;
    });

    const pendingCount = users.filter(u => u.is_approved === false).length;

    const handleApprove = async (userId) => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                is_approved: true,
                status: 'Approved',
                approved_by: currentUser.full_name,
                approved_at: serverTimestamp()
            });
            sileo.success({ title: 'User Approved', description: 'The user can now access the system.' });
        } catch (error) {
            sileo.error({ title: 'Error', description: 'Failed to approve user.' });
        }
    };

    const handleReject = (userId) => {
        setConfirmModal({ isOpen: true, userId, type: 'reject', isLoading: false });
    };

    const handleDeleteUser = (userId) => {
        setConfirmModal({ isOpen: true, userId, type: 'delete', isLoading: false });
    };

    const executeConfirmAction = async () => {
        if (!confirmModal.userId) return;
        setConfirmModal(prev => ({ ...prev, isLoading: true }));
        try {
            await deleteDoc(doc(db, 'users', confirmModal.userId));
            const isReject = confirmModal.type === 'reject';
            sileo.success({ 
                title: isReject ? 'User Rejected' : 'User Deleted', 
                description: isReject ? 'The registration has been removed.' : 'Account has been removed from the system.' 
            });
            setConfirmModal({ isOpen: false, userId: null, type: null, isLoading: false });
        } catch (error) {
            sileo.error({ title: 'Error', description: 'Failed to complete action.' });
            setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
    };

    const handleCreatePrincipal = async (e) => {
        e.preventDefault();
        setCreatingPrincipal(true);
        try {
            // Check if email already exists in Firestore
            const q = query(collection(db, 'users'), where('email', '==', newPrincipal.email));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                sileo.error({ title: 'Error', description: 'This email is already in use.' });
                return;
            }

            // ── STEP 1: Create Firebase Auth account via REST API ────────────────
            // We use the REST API instead of the Firebase SDK so we don't sign
            // out the currently logged-in admin.
            const signUpRes = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: newPrincipal.email,
                        password: newPrincipal.password,
                        returnSecureToken: true
                    })
                }
            );

            const signUpData = await signUpRes.json();

            if (!signUpRes.ok) {
                const code = signUpData?.error?.message || '';
                let msg = 'Failed to create account.';
                if (code.includes('EMAIL_EXISTS')) msg = 'This email is already registered in the authentication system.';
                else if (code.includes('WEAK_PASSWORD')) msg = 'Password is too weak. Use at least 6 characters.';
                throw new Error(msg);
            }

            const { localId: uid, idToken } = signUpData;

            // ── STEP 2: Write Firestore document with the real Firebase Auth UID ──
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
            const firestoreRes = await fetch(firestoreUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    fields: {
                        full_name:        { stringValue: `${newPrincipal.firstName} ${newPrincipal.lastName}` },
                        email:            { stringValue: newPrincipal.email },
                        phone:            { stringValue: newPrincipal.phone || '' },
                        role:             { stringValue: 'principal' },
                        is_approved:      { booleanValue: true },
                        status:           { stringValue: 'Approved' },
                        created_at:       { timestampValue: new Date().toISOString() },
                        created_by_admin: { booleanValue: true }
                    }
                })
            });

            if (!firestoreRes.ok) {
                const fsErr = await firestoreRes.json().catch(() => ({}));
                throw new Error(fsErr?.error?.message || 'Failed to save principal data.');
            }

            sileo.success({ 
                title: 'Principal Created', 
                description: `${newPrincipal.firstName} can now log in with the provided credentials.`
            });
            setCreateModalOpen(false);
            setNewPrincipal({ firstName: '', lastName: '', email: '', password: '', phone: '' });
        } catch (error) {
            sileo.error({ title: 'Error', description: error.message });
        } finally {
            setCreatingPrincipal(false);
        }
    };

    const getRoleIcon = (role) => {
        switch(role) {
            case 'admin': return <ShieldCheck className="w-4 h-4 text-purple-600" />;
            case 'principal': return <UserCog className="w-4 h-4 text-blue-600" />;
            case 'teacher': return <GraduationCap className="w-4 h-4 text-emerald-600" />;
            case 'maintenance': return <HardHat className="w-4 h-4 text-amber-600" />;
            default: return <User className="w-4 h-4 text-slate-400" />;
        }
    };

    const renderUserGrid = () => {
        if (loading) {
            return Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
            ));
        }

        if (filteredUsers.length === 0) {
            return (
                <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                    <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-800">No users found</h3>
                    <p className="text-slate-400 text-sm mt-1">Try adjusting your filters.</p>
                </div>
            );
        }

        return filteredUsers.map(u => (
            <Card key={u.id} className={`rounded-[2.5rem] border-slate-200/60 overflow-hidden hover:shadow-2xl transition-all duration-500 group ${u.is_approved === false ? 'border-amber-200 bg-amber-50/10' : 'bg-white'}`}>
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-teal group-hover:text-white transition-all duration-500 shadow-inner">
                                {u.role === 'teacher' ? <GraduationCap className="w-7 h-7" /> : 
                                    u.role === 'maintenance' ? <HardHat className="w-7 h-7" /> : 
                                    <UserCog className="w-7 h-7" />}
                            </div>
                            <div>
                                <h3 className="font-black text-slate-900 tracking-tight leading-tight group-hover:text-teal transition-colors truncate max-w-[150px]">{u.full_name}</h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {getRoleIcon(u.role)}
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{u.role}</span>
                                </div>
                            </div>
                        </div>
                        <Badge variant={u.is_approved === false ? "warning" : "success"} className="rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                            {u.is_approved === false ? 'Pending' : 'Active'}
                        </Badge>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-300" />
                            <span className="truncate">{u.email}</span>
                        </div>
                        {u.phone && (
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                <Phone className="w-3.5 h-3.5 text-slate-300" />
                                <span>{u.phone}</span>
                            </div>
                        )}
                    </div>

                    <Separator className="mb-4 opacity-50" />

                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Joined {u.created_at ? new Date(u.created_at.toDate()).toLocaleDateString() : 'N/A'}
                        </span>
                        
                        <div className="flex gap-2">
                            {u.is_approved === false ? (
                                <>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleApprove(u.id)}
                                        className="bg-teal hover:bg-teal/90 text-white font-black uppercase text-[9px] tracking-widest h-9 rounded-xl px-4"
                                    >
                                        Approve
                                    </Button>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => handleReject(u.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 rounded-xl"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                u.role !== 'admin' && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-400">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                                            <DropdownMenuItem 
                                                className="text-red-600 font-bold gap-2 cursor-pointer"
                                                onClick={() => handleDeleteUser(u.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Remove User
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ));
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 bg-teal rounded-full" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium tracking-tight">Approve new registrations and manage school personnel.</p>
                </div>
                {currentUser?.role === 'admin' && (
                    <Button 
                        onClick={() => setCreateModalOpen(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl gap-2 shadow-xl shadow-slate-900/10"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create New Principal
                    </Button>
                )}
            </div>

            {/* Tabs and Filters */}
            <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-200 h-auto shadow-sm">
                        <TabsTrigger 
                            value="active" 
                            className="px-6 py-2.5 rounded-xl font-bold text-sm data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all"
                        >
                            Active Users
                        </TabsTrigger>
                        <TabsTrigger 
                            value="pending" 
                            className="px-6 py-2.5 rounded-xl font-bold text-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white transition-all gap-2"
                        >
                            Pending Approvals
                            {pendingCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-amber-600 shadow-sm">
                                    {pendingCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto bg-white p-2 rounded-3xl border border-slate-200/60 shadow-sm flex-1 max-w-3xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search by name or email..." 
                                className="pl-11 h-12 bg-slate-50/50 border-transparent focus:border-teal/30 focus:bg-white rounded-2xl transition-all text-sm font-medium" 
                                value={search} 
                                onChange={e => setSearch(e.target.value)} 
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                className="bg-slate-50 border-none rounded-2xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal/20 h-12"
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="teacher">Teachers</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="principal">Principals</option>
                                <option value="admin">Admins</option>
                            </select>
                        </div>
                    </div>
                </div>

                <TabsContent value="active" className="m-0 focus-visible:outline-none">
                    {/* User Grid Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {renderUserGrid()}
                    </div>
                </TabsContent>

                <TabsContent value="pending" className="m-0 focus-visible:outline-none">
                    {/* User Grid Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {renderUserGrid()}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create Principal Dialog */}
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
                    {/* Premium Header */}
                    <div className="px-8 pt-8 pb-6 bg-slate-50/80 border-b border-slate-100">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center shrink-0 border border-teal/20 shadow-sm">
                                <UserPlus className="w-6 h-6 text-teal" />
                            </div>
                            <div className="space-y-1 mt-0.5">
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                                    Create Principal Account
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 font-medium">
                                    Initialize a new administrator account for the school system.
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                    
                    <form onSubmit={handleCreatePrincipal} className="p-8 space-y-6">
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">First Name</label>
                                    <Input 
                                        className="h-11 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                        required
                                        placeholder="e.g. John"
                                        value={newPrincipal.firstName}
                                        onChange={e => setNewPrincipal({...newPrincipal, firstName: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Last Name</label>
                                    <Input 
                                        className="h-11 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                        required
                                        placeholder="e.g. Doe"
                                        value={newPrincipal.lastName}
                                        onChange={e => setNewPrincipal({...newPrincipal, lastName: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        type="email"
                                        className="h-11 pl-10 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                        required
                                        placeholder="principal@school.edu"
                                        value={newPrincipal.email}
                                        onChange={e => setNewPrincipal({...newPrincipal, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Temporary Password</label>
                                    <div className="relative">
                                        <Input 
                                            type={showPassword ? "text" : "password"}
                                            className="h-11 pr-10 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                            required
                                            placeholder="••••••••"
                                            value={newPrincipal.password}
                                            onChange={e => setNewPrincipal({...newPrincipal, password: e.target.value})}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input 
                                            className="h-11 pl-10 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                            placeholder="+63 900 000 0000"
                                            value={newPrincipal.phone}
                                            onChange={e => setNewPrincipal({...newPrincipal, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-3">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setCreateModalOpen(false)} 
                                className="h-11 px-6 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={creatingPrincipal}
                                className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 group"
                            >
                                {creatingPrincipal ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Initializing...
                                    </>
                                ) : (
                                    <>
                                        Initialize Account
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete/Reject Dialog */}
            <Dialog 
                open={confirmModal.isOpen} 
                onOpenChange={(isOpen) => !confirmModal.isLoading && setConfirmModal(prev => ({ ...prev, isOpen }))}
            >
                <DialogContent className="sm:max-w-[400px] p-0 border-0 shadow-2xl rounded-2xl overflow-hidden bg-white">
                    <div className="px-6 pt-8 pb-6">
                        <div className="flex flex-col items-center text-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                                <Trash2 className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="space-y-1.5">
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">
                                    {confirmModal.type === 'reject' ? 'Reject Registration' : 'Remove User'}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500 font-medium">
                                    {confirmModal.type === 'reject' 
                                        ? "Are you sure you want to reject this user? This action cannot be undone." 
                                        : "Are you sure you want to permanently delete this account? All access will be revoked."}
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-3">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                            disabled={confirmModal.isLoading}
                            className="flex-1 h-11 rounded-xl font-semibold text-slate-600 hover:bg-slate-200/50 transition-colors"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            onClick={executeConfirmAction}
                            disabled={confirmModal.isLoading}
                            className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                        >
                            {confirmModal.isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Confirm
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
