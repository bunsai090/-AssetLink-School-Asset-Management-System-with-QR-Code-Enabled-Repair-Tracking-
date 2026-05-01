import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import { 
    Users, UserPlus, ShieldCheck, ShieldAlert, Trash2, Search, 
    Filter, MoreVertical, CheckCircle, XCircle, Mail, Phone, 
    UserCog, HardHat, GraduationCap, Loader2, ArrowRight, Clock, User
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
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function UserManagement() {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    
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
        const matchPending = !showPendingOnly || u.is_approved === false;
        return matchSearch && matchRole && matchPending;
    });

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

    const handleReject = async (userId) => {
        if (!confirm('Are you sure you want to remove this pending user?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            sileo.success({ title: 'User Rejected', description: 'The registration has been removed.' });
        } catch (error) {
            sileo.error({ title: 'Error', description: 'Failed to reject user.' });
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to permanently delete this user?')) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            sileo.success({ title: 'User Deleted', description: 'Account has been removed from the system.' });
        } catch (error) {
            sileo.error({ title: 'Error', description: 'Failed to delete user.' });
        }
    };

    const handleCreatePrincipal = async (e) => {
        e.preventDefault();
        setCreatingPrincipal(true);
        try {
            // Check if email exists
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', newPrincipal.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                sileo.error({ title: 'Error', description: 'This email is already in use.' });
                setCreatingPrincipal(false);
                return;
            }

            // Note: In a real app, this should be a cloud function to avoid signing out the current admin
            // But since this is a local demo/prototype environment, we'll simulate the creation
            // or use a separate auth instance if available. 
            // For now, we'll create the user document directly (Auth would need admin SDK)
            
            // SIMULATION for prototype: 
            // In production, use Firebase Admin SDK or a Cloud Function.
            const tempPassword = newPrincipal.password || 'Principal123!';
            
            // We'll create the doc, assuming the admin will handle the Auth part later or using a special flow
            const newId = `principal_${Date.now()}`;
            await setDoc(doc(db, 'users', newId), {
                full_name: `${newPrincipal.firstName} ${newPrincipal.lastName}`,
                email: newPrincipal.email,
                phone: newPrincipal.phone,
                role: 'principal',
                is_approved: true,
                status: 'Approved',
                created_at: serverTimestamp(),
                created_by_admin: true
            });

            sileo.success({ 
                title: 'Principal Created', 
                description: `Account for ${newPrincipal.firstName} has been initialized.` 
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

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
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

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-[2rem] border border-slate-200/60 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search by name or email..." 
                        className="pl-11 h-14 bg-slate-50/50 border-transparent focus:border-teal/30 focus:bg-white rounded-[1.5rem] transition-all text-sm font-medium" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
                <div className="flex gap-2 p-1">
                    <Button 
                        variant={showPendingOnly ? "default" : "ghost"}
                        onClick={() => setShowPendingOnly(!showPendingOnly)}
                        className={`h-12 rounded-xl font-bold gap-2 ${showPendingOnly ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-slate-500'}`}
                    >
                        <Clock className="w-4 h-4" />
                        {showPendingOnly ? 'Pending Only' : 'Show All'}
                    </Button>
                    <Separator orientation="vertical" className="h-12" />
                    <select 
                        className="bg-slate-50 border-none rounded-xl px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-teal/20"
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

            {/* User Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-48 bg-white rounded-[2rem] border border-slate-100 animate-pulse" />
                    ))
                ) : filteredUsers.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                        <Users className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-800">No users found</h3>
                        <p className="text-slate-400 text-sm mt-1">Try adjusting your filters.</p>
                    </div>
                ) : (
                    filteredUsers.map(u => (
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
                    ))
                )}
            </div>

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
                                    <Input 
                                        type="password"
                                        className="h-11 border-slate-200 bg-white hover:bg-slate-50/50 focus:bg-white rounded-xl transition-all shadow-sm" 
                                        required
                                        placeholder="••••••••"
                                        value={newPrincipal.password}
                                        onChange={e => setNewPrincipal({...newPrincipal, password: e.target.value})}
                                    />
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
        </div>
    );
}
