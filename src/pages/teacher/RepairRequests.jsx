import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Search, Wrench, CheckCircle, FileText, Printer, ExternalLink, Calendar, Hash, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from 'sileo';
import { format } from 'date-fns';
import RepairPagination from '@/components/RepairPagination';

const STATUSES = ['Pending', 'Approved', 'In Progress', 'Completed', 'Rejected', 'Pending Teacher Verification'];

export default function TeacherRepairRequests() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selected, setSelected] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [verificationFeedback, setVerificationFeedback] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = onSnapshot(
            collection(db, 'repair_requests'),
            (snapshot) => {
                const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                const teacherEmail = currentUser.email?.toLowerCase();
                const teacherName = currentUser.full_name?.toLowerCase();
                
                const mine = all
                    .filter(r => {
                        const emailMatches = r.reported_by_email?.toLowerCase() === teacherEmail;
                        const nameMatches = r.reported_by_name?.toLowerCase() === teacherName;
                        const schoolMatches = r.school_id === currentUser.school_id;
                        
                        return emailMatches || nameMatches || (r.status === 'Pending Teacher Verification' && schoolMatches);
                    })
                    .sort((a, b) => {
                        const dateA = a.created_at?.toDate?.() ?? new Date(0);
                        const dateB = b.created_at?.toDate?.() ?? new Date(0);
                        return dateB - dateA;
                    });
                setRequests(mine);
                setLoading(false);
            },
            (error) => {
                console.error('Teacher RepairRequests error:', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const filtered = requests.filter(r => {
        const matchSearch = !search || r.asset_name?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        return matchSearch && matchStatus;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStatus]);

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginatedRequests = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    async function handleVerifyRepair() {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'repair_requests', selected.id), { 
                status: 'Completed',
                teacher_confirmation: true, 
                completed_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });

            const { getDocs, query, collection, where } = await import('firebase/firestore');
            const taskQuery = query(collection(db, 'maintenance_tasks'), where('repair_request_id', '==', selected.id));
            const taskSnapshot = await getDocs(taskQuery);
            
            const syncPromises = taskSnapshot.docs.map(taskDoc => 
                updateDoc(doc(db, 'maintenance_tasks', taskDoc.id), {
                    status: 'Completed',
                    updated_at: serverTimestamp()
                })
            );
            await Promise.all(syncPromises);

            sileo.success({
                title: 'Repair Verified',
                description: 'The repair has been successfully verified and marked as completed.'
            });
            setSelected(null);
        } catch (error) {
            sileo.error({ title: 'Update Failed', description: 'Could not verify the repair.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleRejectRepair() {
        if (!verificationFeedback.trim()) {
            sileo.error({
                title: 'Feedback Required',
                description: 'Please provide feedback explaining what needs to be fixed.'
            });
            return;
        }
        setSaving(true);
        try {
            await updateDoc(doc(db, 'repair_requests', selected.id), {
                status: 'In Progress',
                teacher_verification_notes: verificationFeedback,
                updated_at: serverTimestamp()
            });

            const { getDocs, query, collection, where } = await import('firebase/firestore');
            const taskQuery = query(collection(db, 'maintenance_tasks'), where('repair_request_id', '==', selected.id));
            const taskSnapshot = await getDocs(taskQuery);
            
            const syncPromises = taskSnapshot.docs.map(taskDoc => 
                updateDoc(doc(db, 'maintenance_tasks', taskDoc.id), {
                    status: 'In Progress',
                    notes: `REWORK REQUESTED: ${verificationFeedback}`, 
                    updated_at: serverTimestamp()
                })
            );
            await Promise.all(syncPromises);

            sileo.success({
                title: 'Rework Requested',
                description: 'Feedback has been sent to the maintenance team for rework.'
            });
            setVerificationFeedback('');
            setSelected(null);
        } catch (error) {
            sileo.error({ title: 'Update Failed', description: 'Could not send feedback.' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 bg-teal rounded-full" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Service Reports</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium tracking-tight">Manage and track your submitted repair requests and service history.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-[2rem] border border-slate-200/60 shadow-sm shadow-slate-200/40">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search assets, descriptions, or reference numbers..." 
                        className="pl-11 h-14 bg-slate-50/50 border-transparent focus:border-teal/30 focus:bg-white rounded-[1.5rem] transition-all text-sm font-medium" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full md:w-56 h-14 bg-slate-50/50 border-transparent focus:border-teal/30 focus:bg-white rounded-[1.5rem] font-bold text-slate-700">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200/60">
                            <SelectItem value="all" className="rounded-xl font-bold">All Reports</SelectItem>
                            {STATUSES.map(s => <SelectItem key={s} value={s} className="rounded-xl font-bold">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <div className="w-10 h-10 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Records</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filtered.length === 0 ? (
                        <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">No Reports Found</h3>
                            <p className="text-slate-400 text-sm mt-2 max-w-[280px] mx-auto font-medium">Try adjusting your filters or search terms to find what you're looking for.</p>
                        </div>
                    ) : (
                        paginatedRequests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => setSelected(req)}
                                className="group relative bg-white rounded-[2.5rem] border border-slate-200/60 p-6 sm:p-8 hover:shadow-2xl hover:shadow-teal/10 hover:border-teal/30 transition-all cursor-pointer animate-in slide-in-from-bottom-4 duration-500 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity -mr-4 -mt-4">
                                    <Wrench className="w-32 h-32 text-slate-900" />
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative">
                                    <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-teal group-hover:text-white transition-all duration-500 flex-shrink-0 shadow-inner">
                                        <Wrench className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase group-hover:text-teal transition-colors">{req.asset_name}</h3>
                                            <StatusBadge status={req.status} size="sm" />
                                        </div>
                                        <p className="text-slate-500 text-sm font-medium line-clamp-1 italic mb-4">"{req.description}"</p>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <Calendar className="w-3 h-3" />
                                                {req.created_at ? format(req.created_at.toDate(), 'MMM d, yyyy') : 'N/A'}
                                            </div>
                                            {req.request_number && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-teal uppercase tracking-widest bg-teal/5 px-2.5 py-1 rounded-full border border-teal/10">
                                                    <Hash className="w-3 h-3" />
                                                    REF: {req.request_number}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 self-center hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center text-teal">
                                            <ArrowUpRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                    
                                    {req.status === 'Pending Teacher Verification' && (
                                        <div className="absolute top-0 right-0 bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest animate-bounce shadow-xl shadow-amber-500/20 no-print">
                                            VERIFY NOW
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            
            <RepairPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="sm:max-w-xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-[#f8fafc]">
                    {selected && (
                        <div className="flex flex-col h-full max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="bg-white px-8 py-6 border-b border-slate-200/60 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight uppercase">{selected.asset_name}</DialogTitle>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                        <Hash className="w-3 h-3" /> Reference: {selected.request_number || 'N/A'}
                                    </p>
                                </div>
                                <StatusBadge status={selected.status} size="md" />
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {/* Report Card */}
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <FileText className="w-16 h-16" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Your Initial Report:</p>
                                        <p className="text-base font-bold text-slate-800 leading-relaxed italic">"{selected.description}"</p>
                                        {selected.created_at && (
                                            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                                                Submitted on {format(selected.created_at.toDate(), 'MMMM d, yyyy')}
                                            </p>
                                        )}
                                    </div>

                                    {selected.maintenance_notes && (
                                        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <Wrench className="w-24 h-24" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Service Resolution Report:</p>
                                            <p className="text-lg font-black leading-snug">"{selected.maintenance_notes}"</p>
                                            
                                            <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-white/10">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Parts / Materials</p>
                                                    <p className="text-sm font-black uppercase text-slate-100">{selected.materials_used || 'General Supplies'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Labor & Audit Cost</p>
                                                    <p className="text-xl font-black text-teal">₱{selected.actual_cost?.toLocaleString() || '0'}</p>
                                                </div>
                                            </div>
                                            
                                            {selected.maintenance_staff_name && (
                                                <div className="mt-6 flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-teal flex items-center justify-center text-[10px] font-black uppercase text-white">
                                                        {selected.maintenance_staff_name.charAt(0)}
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Technician: <span className="text-slate-200">{selected.maintenance_staff_name}</span></p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {selected.photo_url && (
                                        <div className="rounded-[2rem] overflow-hidden border-4 border-white shadow-xl">
                                            <img src={selected.photo_url} alt="Damage evidence" className="w-full h-auto object-cover max-h-[300px]" />
                                        </div>
                                    )}
                                </div>

                                {/* Actions for Verification */}
                                {selected.status === 'Pending Teacher Verification' && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-amber-500/20 shadow-xl space-y-6">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Confirm Service Quality</h4>
                                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Please inspect the asset. If the repair is satisfactory, confirm to close the request. Otherwise, provide rework feedback.</p>
                                        </div>
                                        <Textarea 
                                            value={verificationFeedback} 
                                            onChange={e => setVerificationFeedback(e.target.value)} 
                                            placeholder="Add inspection notes for the technician..." 
                                            className="rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-teal/30 min-h-[120px] font-medium text-sm p-4"
                                        />
                                        <div className="flex gap-4">
                                            <Button onClick={handleVerifyRepair} disabled={saving} className="flex-1 bg-teal hover:bg-teal/90 text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-lg shadow-teal/20 transition-all active:scale-95">
                                                Confirm Fixed
                                            </Button>
                                            <Button onClick={handleRejectRepair} variant="outline" className="flex-1 border-slate-200 text-red-600 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl transition-all active:scale-95">
                                                Request Rework
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Actions for Completed Repairs */}
                                {selected.status === 'Completed' && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Official Receipt & QR</h4>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">Physical proof of service completion.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-widest h-11 rounded-xl gap-2 hover:bg-slate-50"
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/repair-report?id=${selected.id}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                    View Page
                                                </Button>
                                                <Button
                                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl gap-2 shadow-lg shadow-slate-900/10 transition-all active:scale-95"
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/repair-report?id=${selected.id}&print=true`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print Receipt
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 p-8 gap-4 shadow-inner">
                                            <img
                                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/repair-report?id=${selected.id}`)}&margin=12&bgcolor=f8fafc`}
                                                alt="Repair Report QR Code"
                                                className="rounded-3xl shadow-xl border-8 border-white"
                                            />
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-center max-w-[200px]">
                                                Attach this QR to the asset for digital maintenance tracking
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

