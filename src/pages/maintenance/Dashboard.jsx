import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { AlertTriangle, Wrench, CheckCircle, Clock, ArrowRight, ChevronRight, CircleDot, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getSLAStatus } from '@/lib/slaUtils';

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

export default function MaintenanceDashboard() {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        if (!currentUser) return;
        const unsub = onSnapshot(query(collection(db, 'maintenance_tasks')), s => {
            const sorted = s.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.created_at?.toDate?.() ?? new Date(0)) - (a.created_at?.toDate?.() ?? new Date(0)));
            setTasks(sorted);
            setLoading(false);
        }, err => {
            console.error('[AssetLink] Maintenance Dashboard error:', err);
            setLoading(false);
        });
        return () => unsub();
    }, [currentUser]);

    const myTasks     = tasks.filter(t =>
        t.assigned_to_email === currentUser?.email ||
        t.assigned_to_name?.toLowerCase().includes(currentUser?.full_name?.toLowerCase() || '')
    );
    const myAssigned   = myTasks.filter(t => t.status === 'Assigned');
    const myInProgress = myTasks.filter(t => t.status === 'In Progress');
    const myCompleted  = myTasks.filter(t => t.status === 'Completed' || t.status === 'Pending Teacher Verification');
    const myOnHold     = myTasks.filter(t => t.status === 'On Hold');
    const overdue      = myTasks.filter(t => getSLAStatus(t) === 'overdue' && t.status !== 'Completed');
    const total        = myTasks.length || 1;
    const active       = [...myAssigned, ...myInProgress];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        {greeting()}, <span className="text-foreground font-semibold">{currentUser?.full_name?.split(' ')[0] || 'Staff'}</span> 👋
                    </p>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Workboard</h1>
                    <p className="text-sm text-muted-foreground">Track and manage your assigned maintenance tasks.</p>
                </div>
                <div className="flex items-center gap-3">
                    {overdue.length > 0 && (
                        <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 text-red-700 font-semibold px-3 py-1.5 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {overdue.length} overdue SLA
                        </Badge>
                    )}
                    <Link to="/tasks">
                        <Button size="sm" className="bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold gap-2 shadow-sm">
                            <Wrench className="w-4 h-4" /> My Tasks
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Assigned"   value={myAssigned.length}   subtitle="New pipeline"  icon={Clock}         colorClass="bg-blue-100 text-blue-600"     loading={loading} />
                <StatCard title="Active"     value={myInProgress.length} subtitle="Under repair"  icon={Wrench}        colorClass="bg-amber-100 text-amber-600"   loading={loading} />
                <StatCard title="On Hold"    value={myOnHold.length}     subtitle="Blocked tasks" icon={AlertTriangle} colorClass="bg-red-100 text-red-600"       loading={loading} />
                <StatCard title="Total Done" value={myCompleted.length}  subtitle="Completed"     icon={CheckCircle}   colorClass="bg-emerald-100 text-emerald-600" loading={loading} />
            </div>

            {/* Main grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Active Tasks */}
                <Card className="lg:col-span-2 border-border/60 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base font-bold">Active Workload</CardTitle>
                                <CardDescription>Tasks assigned and currently in progress</CardDescription>
                            </div>
                            <Link to="/tasks">
                                <Button variant="ghost" size="sm" className="text-[#028a0f] hover:bg-emerald-50 gap-1 text-xs font-bold">
                                    Manage <ArrowRight className="w-3.5 h-3.5" />
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
                                        <Skeleton className="h-3 w-1/3" />
                                    </div>
                                </div>
                            ))
                        ) : active.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="font-semibold text-foreground text-sm">Workspace is clear!</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">No active tasks right now.</p>
                                </div>
                            </div>
                        ) : active.slice(0, 5).map(task => (
                            <Link key={task.id} to="/tasks">
                                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors cursor-pointer group">
                                    <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0 group-hover:bg-teal/20 transition-colors">
                                        <Wrench className="w-5 h-5 text-teal" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-[#028a0f] transition-colors uppercase tracking-tight">{task.asset_name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{task.school_name || 'Assigned School'}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                        <StatusBadge status={task.status} />
                                        <StatusBadge status={task.priority || 'Medium'} />
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-[#028a0f] transition-colors" />
                                </div>
                            </Link>
                        ))}
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
                                    <CardTitle className="text-sm font-bold">Efficiency Rating</CardTitle>
                                    <CardDescription className="text-xs">{myTasks.length} total tasks</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4">
                            {loading ? <Skeleton className="h-24 w-full" /> : (
                                <div className="space-y-4">
                                    <div className="flex items-end gap-2">
                                        <span className="text-5xl font-black text-foreground tracking-tight">
                                            {Math.round((myCompleted.length / total) * 100)}
                                        </span>
                                        <span className="text-xl font-black text-muted-foreground mb-1.5">%</span>
                                    </div>
                                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#028a0f] rounded-full transition-all duration-1000"
                                            style={{ width: `${(myCompleted.length / total) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {myCompleted.length} of {myTasks.length} tasks completed
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-purple-500" />
                                </div>
                                <CardTitle className="text-sm font-bold">Workload Summary</CardTitle>
                            </div>
                        </CardHeader>
                        <Separator />
                        <CardContent className="pt-4 space-y-3">
                            {[
                                { label: 'Efficiency Rate', value: `${Math.round((myCompleted.length / total) * 100)}%`, color: 'text-emerald-600' },
                                { label: 'Active Tasks',    value: active.length,    color: active.length > 0    ? 'text-amber-600'      : 'text-muted-foreground' },
                                { label: 'SLA Overdue',     value: overdue.length,   color: overdue.length > 0   ? 'text-red-600'        : 'text-muted-foreground' },
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
