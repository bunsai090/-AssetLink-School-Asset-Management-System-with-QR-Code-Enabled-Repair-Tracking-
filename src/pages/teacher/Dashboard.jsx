import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Wrench, CheckCircle, Clock, ArrowRight, Plus, TrendingUp, Activity, ChevronRight, CircleDot, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const PRIORITY_CONFIG = {
    Critical: { color: 'bg-red-500' },
    High:     { color: 'bg-orange-400' },
    Medium:   { color: 'bg-amber-400' },
    Low:      { color: 'bg-emerald-400' },
};

function StatCard({ title, value, subtitle, icon: Icon, colorClass, loading }) {
    return (
        <Card className="relative overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        {loading ? (
                            <Skeleton className="h-9 w-16 mt-1" />
                        ) : (
                            <p className="text-4xl font-black text-foreground tracking-tight">{value}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colorClass}`} />
        </Card>
    );
}

export default function TeacherDashboard() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        if (!currentUser) return;
        const unsubAssets = onSnapshot(query(collection(db, 'assets'), orderBy('created_at', 'desc')), s => {
            setAssets(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubReqs = onSnapshot(query(collection(db, 'repair_requests'), orderBy('created_at', 'desc')), s => {
            const teacherEmail = currentUser.email?.toLowerCase();
            const teacherName  = currentUser.full_name?.toLowerCase();
            const mine = s.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => {
                    const emailMatch  = r.reported_by_email?.toLowerCase() === teacherEmail;
                    const nameMatch   = r.reported_by_name?.toLowerCase()  === teacherName;
                    const schoolMatch = r.school_id === currentUser.school_id;
                    return emailMatch || nameMatch || (r.status === 'Pending Teacher Verification' && schoolMatch);
                });
            setRequests(mine);
            setLoading(false);
        });
        return () => { unsubAssets(); unsubReqs(); };
    }, [currentUser]);

    const pending    = requests.filter(r => r.status === 'Pending');
    const inProgress = requests.filter(r => r.status === 'In Progress');
    const completed  = requests.filter(r => r.status === 'Completed');
    const critical   = requests.filter(r => r.priority === 'Critical');
    const needsVerif = requests.filter(r => r.status === 'Pending Teacher Verification');
    const total      = requests.length || 1;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-1.5 h-6 bg-teal rounded-full" />
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium tracking-tight">
                        {greeting()}, <span className="text-slate-900 font-bold">{currentUser?.full_name?.split(' ')[0] || 'Teacher'}</span>. Track your school assets and reports.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {needsVerif.length > 0 && (
                        <Badge variant="outline" className="gap-1.5 border-blue-200 bg-blue-50 text-blue-700 font-semibold px-3 py-1.5 animate-pulse">
                            <CircleDot className="w-3.5 h-3.5" />
                            {needsVerif.length} needs verification
                        </Badge>
                    )}
                    <Link to="/report-damage">
                        <Button size="sm" className="bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold gap-2 shadow-sm">
                            <Plus className="w-4 h-4" /> Report Damage
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Assets"    value={assets.length}    subtitle="Registered assets"  icon={Package}       colorClass="bg-teal-100 text-teal-600"    loading={loading} />
                <StatCard title="Pending Repairs" value={pending.length}   subtitle="Awaiting action"    icon={Clock}         colorClass="bg-amber-100 text-amber-600"   loading={loading} />
                <StatCard title="In Progress"     value={inProgress.length} subtitle="Active repairs"   icon={Wrench}        colorClass="bg-blue-100 text-blue-600"     loading={loading} />
                <StatCard title="Critical Issues" value={critical.length}  subtitle="Urgent attention"   icon={AlertTriangle} colorClass="bg-red-100 text-red-600"       loading={loading} />
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Requests */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base font-bold">My Repair Requests</CardTitle>
                                <CardDescription>Recent damage reports you submitted</CardDescription>
                            </div>
                            <Link to="/repair-requests">
                                <Button variant="ghost" size="sm" className="text-[#028a0f] hover:bg-emerald-50 gap-1 text-xs font-bold">
                                    View all <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-4 space-y-1">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 p-3">
                                    <Skeleton className="w-10 h-10 rounded-xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7 text-slate-300" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground text-sm">No reports yet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Submit a report when you find a damaged asset.</p>
                                </div>
                                <Link to="/report-damage">
                                    <Button size="sm" variant="outline" className="gap-2 mt-1">
                                        <Plus className="w-3.5 h-3.5" /> Report Now
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            requests.slice(0, 5).map(req => {
                                const priority = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG['Medium'];
                                return (
                                    <Link key={req.id} to={`/repair-requests?id=${req.id}`}>
                                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer group">
                                            <div className={`w-1 h-10 rounded-full flex-shrink-0 ${priority.color}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-[#028a0f] transition-colors">{req.asset_name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{req.description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                <StatusBadge status={req.status} />
                                                <span className="text-[10px] text-muted-foreground">
                                                    {req.created_at ? format(req.created_at.toDate(), 'MMM d') : ''}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#028a0f] transition-colors" />
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="space-y-4">
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold">Request Overview</CardTitle>
                                    <CardDescription className="text-xs">{requests.length} total reports</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4 space-y-4">
                            {loading ? <Skeleton className="h-20 w-full" /> : (
                                [
                                    { label: 'Pending',     count: pending.length,    colorClass: 'bg-amber-400', textClass: 'text-amber-600' },
                                    { label: 'In Progress', count: inProgress.length, colorClass: 'bg-blue-400',  textClass: 'text-blue-600'  },
                                    { label: 'Completed',   count: completed.length,  colorClass: 'bg-emerald-400', textClass: 'text-emerald-600' },
                                ].map(({ label, count, colorClass, textClass }) => (
                                    <div key={label} className="space-y-1.5">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                                            <span className={`text-xs font-black ${textClass}`}>{count}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${colorClass} transition-all duration-700`} style={{ width: `${(count / total) * 100}%` }} />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground text-right">{Math.round((count / total) * 100)}%</p>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-purple-500" />
                                </div>
                                <CardTitle className="text-sm font-bold">Activity Summary</CardTitle>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4 space-y-3">
                            {[
                                { label: 'Resolution Rate', value: `${Math.round((completed.length / total) * 100)}%`, color: 'text-emerald-600' },
                                { label: 'Critical Issues', value: critical.length, color: critical.length > 0 ? 'text-red-600' : 'text-emerald-600' },
                                { label: 'Needs Verification', value: needsVerif.length, color: needsVerif.length > 0 ? 'text-blue-600' : 'text-muted-foreground' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <CircleDot className="w-3 h-3 text-muted-foreground/40" />
                                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                                    </div>
                                    <span className={`text-sm font-black ${color}`}>{value}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
