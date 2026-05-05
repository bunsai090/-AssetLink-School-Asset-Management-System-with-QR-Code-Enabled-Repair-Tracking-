import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Wrench, CheckCircle, Clock, ArrowRight, CalendarDays, TrendingUp, Activity, ChevronRight, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isToday } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

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
                        {loading ? <Skeleton className="h-9 w-16 mt-1" /> : (
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

export default function PrincipalDashboard() {
    const { currentUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [pendingUsersCount, setPendingUsersCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'repair_requests'), orderBy('created_at', 'desc'));
        const unsub = onSnapshot(q, s => {
            setRequests(s.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        // Fetch pending users count
        const usersQ = query(collection(db, 'users'), where('is_approved', '==', false));
        const unsubUsers = onSnapshot(usersQ, s => {
            setPendingUsersCount(s.docs.length);
        });

        return () => {
            unsub();
            unsubUsers();
        };
    }, [currentUser]);

    const pendingApproval = requests.filter(r => r.status === 'Pending');
    const inProgress      = requests.filter(r => r.status === 'In Progress');
    const completed       = requests.filter(r => r.status === 'Completed');
    const todayScheduled  = requests.filter(r =>
        r.scheduled_start_date && isToday(parseISO(r.scheduled_start_date)) && r.status === 'Approved'
    );
    const total = requests.length || 1;

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
                        {greeting()}, <span className="text-slate-900 font-bold">{currentUser?.full_name?.split(' ')[0]}</span>. Review and prioritize requests.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {todayScheduled.length > 0 && (
                        <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold px-3 py-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {todayScheduled.length} scheduled today
                        </Badge>
                    )}
                    <Link to="/repair-requests">
                        <Button size="sm" className="bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold gap-2 shadow-sm">
                            <AlertTriangle className="w-4 h-4" /> Review Requests
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Awaiting Approval" value={pendingApproval.length + pendingUsersCount} subtitle="Needs your action"  icon={Clock}         colorClass="bg-amber-100 text-amber-600"   loading={loading} />
                <StatCard title="In Progress"        value={inProgress.length}      subtitle="Assigned to staff" icon={Wrench}        colorClass="bg-blue-100 text-blue-600"     loading={loading} />
                <StatCard title="Completed"          value={completed.length}       subtitle="Resolved repairs"  icon={CheckCircle}   colorClass="bg-emerald-100 text-emerald-600" loading={loading} />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending list — 2/3 width */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base font-bold">Pending Your Approval</CardTitle>
                                <CardDescription>Repair requests waiting for your review</CardDescription>
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
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
                                    <Skeleton className="w-1 h-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                            ))
                        ) : pendingApproval.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground text-sm">All caught up!</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">No pending requests right now.</p>
                                </div>
                            </div>
                        ) : pendingApproval.slice(0, 6).map(req => {
                            const priority = PRIORITY_CONFIG[req.priority] || PRIORITY_CONFIG['Medium'];
                            return (
                                <Link key={req.id} to="/repair-requests">
                                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer group">
                                        <div className={`w-1 h-10 rounded-full flex-shrink-0 ${priority.color}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-[#028a0f] transition-colors">{req.asset_name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{req.description}</p>
                                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium uppercase tracking-wide">{req.reported_by_name}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <StatusBadge status={req.priority} />
                                            <span className="text-[10px] text-muted-foreground">
                                                {req.created_at ? format(req.created_at.toDate(), 'MMM d') : ''}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#028a0f] transition-colors" />
                                    </div>
                                </Link>
                            );
                        })}
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
                                    <CardTitle className="text-sm font-bold">Overall Progress</CardTitle>
                                    <CardDescription className="text-xs">{requests.length} total requests</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4 space-y-4">
                            {loading ? <Skeleton className="h-24 w-full" /> : (
                                [
                                    { label: 'Pending',     count: pendingApproval.length, colorClass: 'bg-amber-400',   textClass: 'text-amber-600' },
                                    { label: 'In Progress', count: inProgress.length,      colorClass: 'bg-blue-400',    textClass: 'text-blue-600'  },
                                    { label: 'Completed',   count: completed.length,       colorClass: 'bg-emerald-400', textClass: 'text-emerald-600' },
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
                                { label: 'Resolution Rate',  value: `${Math.round((completed.length / total) * 100)}%`, color: 'text-emerald-600' },
                                { label: 'Pending Actions',  value: pendingApproval.length,  color: pendingApproval.length > 0 ? 'text-amber-600' : 'text-emerald-600' },
                                { label: 'Scheduled Today',  value: todayScheduled.length,   color: todayScheduled.length > 0  ? 'text-blue-600'  : 'text-muted-foreground' },
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
