import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Search, CheckCircle, ArrowUpCircle, Wrench, ChevronRight, School, UserCircle, Send, X, Check, Image as ImageIcon, Hash, FileText, Printer, ExternalLink, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { sileo } from 'sileo';
import { format } from 'date-fns';
import { calculateDeadline } from '@/lib/slaUtils';
import RepairPagination from '@/components/RepairPagination';

const STATUSES = ['Pending', 'Approved', 'In Progress', 'Completed', 'Rejected'];

export default function PrincipalRepairRequests() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selected, setSelected] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [notes, setNotes] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [maintenanceStaff, setMaintenanceStaff] = useState([]);
    const [scheduledStartDate, setScheduledStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'repair_requests'),
            (snapshot) => {
                const requestsList = snapshot.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .sort((a, b) => {
                        const dateA = a.created_at?.toDate?.() ?? new Date(0);
                        const dateB = b.created_at?.toDate?.() ?? new Date(0);
                        return dateB - dateA;
                    });
                setRequests(requestsList);
                setLoading(false);
            },
            (error) => {
                console.error('RepairRequests fetch error:', error);
                setLoading(false);
            }
        );

        const staffQuery = query(collection(db, 'users'), where('role', '==', 'maintenance'));
        const unsubscribeStaff = onSnapshot(staffQuery, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setMaintenanceStaff(list);
        });

        return () => {
            unsubscribe();
            unsubscribeStaff();
        };
    }, []);

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

    async function updateRequest(id, status, extraData = {}) {
        setSaving(true);
        try {
            await updateDoc(doc(db, 'repair_requests', id), { 
                status, 
                ...extraData,
                updated_at: serverTimestamp() 
            });
            
            sileo.success({
                title: 'Status Updated',
                description: `Successfully updated request to: ${status}.`
            });
            setSelected(null);
        } catch (error) {
            sileo.error({ title: 'Update Failed', description: 'Could not update request status.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleApprove() {
        if (!assignedTo) {
            sileo.error({ title: 'Staff Required', description: 'Please select a maintenance staff to handle the repair.' });
            return;
        }

        const slaDeadline = calculateDeadline(scheduledStartDate, selected.priority);
        
        setSaving(true);
        try {
            // 1. Update Repair Request
            await updateDoc(doc(db, 'repair_requests', selected.id), {
                status: 'In Progress',
                principal_notes: notes,
                assigned_to_name: assignedTo,
                approved_by_name: currentUser?.full_name,
                approved_at: serverTimestamp(),
                scheduled_start_date: scheduledStartDate,
                sla_deadline: slaDeadline.toISOString(),
                updated_at: serverTimestamp()
            });
            
            // 2. Create Maintenance Task
            await addDoc(collection(db, 'maintenance_tasks'), {
                repair_request_id: selected.id,
                request_number: selected.request_number || `RR-${Date.now().toString().slice(-6)}`,
                asset_name: selected.asset_name,
                description: selected.description || '',
                photo_url: selected.photo_url || '',
                reported_by_name: selected.reported_by_name || '',
                asset_code: selected.asset_code || '',
                school_name: selected.school_name || currentUser?.school_name || '',
                assigned_to_name: assignedTo,
                priority: selected.priority,
                status: 'Assigned',
                scheduled_start_date: scheduledStartDate,
                sla_deadline: slaDeadline.toISOString(),
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });

            sileo.success({
                title: 'Request Approved',
                description: `Assigned to ${assignedTo} and scheduled for ${scheduledStartDate}.`
            });
            setSelected(null);
        } catch (error) {
            sileo.error({ title: 'Approval Failed', description: 'Could not process the approval.' });
        } finally {
            setSaving(false);
        }
    }

    async function handleReject() {
        if (!notes.trim()) {
            sileo.error({ title: 'Reason Required', description: 'Please provide a reason for rejection in the notes field.' });
            return;
        }
        await updateRequest(selected.id, 'Rejected', {
            principal_notes: notes,
            rejected_by_name: currentUser?.full_name,
            rejected_at: serverTimestamp()
        });
    }



    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 bg-teal rounded-full" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Repair Approvals</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium tracking-tight">Review and manage repair requests from teachers.</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-teal transition-colors" />
                    <Input placeholder="Search requests..." className="pl-9 bg-card border-border" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-48 bg-card border-border"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-teal/20 border-t-teal rounded-full animate-spin" /></div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-dashed border-border/60">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No repair requests found</p>
                        </div>
                    ) : (
                        paginatedRequests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => { 
                                    setSelected(req); 
                                    setNotes(''); 
                                    setAssignedTo(req.assigned_to_name || ''); 
                                }}
                                className="bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-teal/30 transition-all cursor-pointer group animate-in slide-in-from-bottom-2 duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${req.priority === 'Critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : req.priority === 'High' ? 'bg-orange-400' : 'bg-teal'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <h3 className="font-bold text-foreground text-sm tracking-tight">{req.asset_name}</h3>
                                            <StatusBadge status={req.priority} />
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-1 italic">{req.description}</p>
                                        <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span className="flex items-center gap-1"><School className="w-3 h-3" /> {req.school_name || 'Generic School'}</span>
                                            <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" /> by {req.reported_by_name}</span>
                                            <span>{req.created_at ? format(req.created_at.toDate(), 'MMM d, yyyy') : ''}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal transition-colors" />
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
                                {/* Basic Info Grid */}
                                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm pb-6 border-b border-slate-200/60">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code</p>
                                        <p className="font-bold text-slate-700">{selected.asset_code || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</p>
                                        <div className="flex pt-1"><StatusBadge status={selected.priority} size="sm" /></div>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">School</p>
                                        <p className="font-bold text-teal">{selected.school_name || 'Generic School'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reported By</p>
                                        <p className="font-bold text-slate-700">{selected.reported_by_name}</p>
                                    </div>
                                </div>

                                {/* Report Card */}
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <FileText className="w-16 h-16" />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Initial Report:</p>
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
                                            <img src={selected.photo_url} alt="Evidence" className="w-full h-auto object-cover max-h-[300px]" />
                                        </div>
                                    )}
                                </div>

                                {/* Approval Controls */}
                                {['Pending', 'Approved'].includes(selected.status) && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-teal/20 shadow-xl space-y-6">
                                        <div>
                                            <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Approval Actions</h4>
                                            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">Assign this request to a maintenance technician and set the schedule.</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign Technician</Label>
                                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-teal/30">
                                                        <SelectValue placeholder="Select staff..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {maintenanceStaff.map(staff => (
                                                            <SelectItem key={staff.email} value={staff.full_name} className="rounded-lg">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-sm">{staff.full_name}</span>
                                                                    <span className="text-[10px] text-muted-foreground uppercase">{staff.specialization || 'General'}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduled Date</Label>
                                                <Input 
                                                    type="date" 
                                                    value={scheduledStartDate} 
                                                    onChange={e => setScheduledStartDate(e.target.value)}
                                                    className="h-12 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-teal/30"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administrative Notes</Label>
                                            <Textarea 
                                                value={notes} 
                                                onChange={e => setNotes(e.target.value)} 
                                                placeholder="Instructions for the maintenance team..." 
                                                className="rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-teal/30 min-h-[100px] font-medium text-sm p-4"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <Button onClick={handleApprove} disabled={saving} className="flex-1 bg-teal hover:bg-teal/90 text-white font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl shadow-lg shadow-teal/20 transition-all active:scale-95">
                                                Approve & Assign
                                            </Button>
                                            <Button onClick={handleReject} variant="outline" disabled={saving} className="flex-1 border-slate-200 text-red-600 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest h-14 rounded-2xl transition-all active:scale-95">
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Completed Actions */}
                                {selected.status === 'Completed' && (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Official Report & QR</h4>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5 text-center sm:text-left">Export and print the final service documentation.</p>
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
                                                    View
                                                </Button>
                                                <Button
                                                    className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl gap-2 shadow-lg shadow-slate-900/10 transition-all"
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/repair-report?id=${selected.id}&print=true`;
                                                        window.open(url, '_blank');
                                                    }}
                                                >
                                                    <Printer className="w-4 h-4" />
                                                    Print
                                                </Button>
                                            </div>
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
