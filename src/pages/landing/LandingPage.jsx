import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Shield, QrCode, ClipboardList, Wrench, ArrowRight, CheckCircle2,
    ScanLine, Bell, BarChart3, Users, School, ChevronRight,
    Smartphone, Eye, Zap, BookOpen, HardHat, GraduationCap, UserCog
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ───────── Workflow Step Data ───────── */
const WORKFLOW_STEPS = [
    {
        step: '01',
        icon: <ScanLine className="w-6 h-6" />,
        title: 'Scan the QR Code',
        desc: 'A teacher spots a broken chair. They pull out their phone, scan the QR code stuck on the asset, and the system instantly identifies it.',
        color: '#028a0f',
    },
    {
        step: '02',
        icon: <ClipboardList className="w-6 h-6" />,
        title: 'Submit a Repair Report',
        desc: 'With one tap, the teacher files a damage report. No paperwork, no delays — just a quick description and an optional photo.',
        color: '#16a34a',
    },
    {
        step: '03',
        icon: <Bell className="w-6 h-6" />,
        title: 'Maintenance Gets Notified',
        desc: 'The maintenance team receives the request in real-time on their dashboard. They can prioritize, assign, and schedule the repair.',
        color: '#15803d',
    },
    {
        step: '04',
        icon: <CheckCircle2 className="w-6 h-6" />,
        title: 'Track Until Resolved',
        desc: 'Everyone involved — teacher, principal, maintenance — can track the repair status live until the asset is fully restored.',
        color: '#166534',
    },
];

/* ───────── Role Card Data ───────── */
const ROLES = [
    {
        icon: <GraduationCap className="w-7 h-7" />,
        role: 'Teacher',
        tagline: 'Report in Seconds',
        perks: ['Scan QR to report damage', 'Track repair status live', 'View asset history'],
    },
    {
        icon: <HardHat className="w-7 h-7" />,
        role: 'Maintenance',
        tagline: 'Fix What Matters',
        perks: ['Centralized task queue', 'Priority-based scheduling', 'Update repair progress'],
    },
    {
        icon: <Eye className="w-7 h-7" />,
        role: 'Principal',
        tagline: 'Oversee Everything',
        perks: ['School-wide dashboard', 'Approve critical repairs', 'Monitor team efficiency'],
    },
    {
        icon: <UserCog className="w-7 h-7" />,
        role: 'Admin',
        tagline: 'Full Control',
        perks: ['Manage all assets', 'User & role management', 'Analytics & reports'],
    },
];

/* ───────── Stats ───────── */
const STATS = [
    { value: '95%', label: 'Faster Reporting' },
    { value: '3x', label: 'Repair Efficiency' },
    { value: '100%', label: 'Asset Visibility' },
    { value: '0', label: 'Paper Forms Needed' },
];

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function LandingPage() {
    const navigate = useNavigate();
    const [mobileMenu, setMobileMenu] = useState(false);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // ── Hero entrance ──
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
            tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.6 })
              .from('.hero-heading span', { y: 80, opacity: 0, stagger: 0.12, duration: 0.9 }, '-=0.3')
              .from('.hero-sub', { y: 30, opacity: 0, duration: 0.7 }, '-=0.5')
              .from('.hero-actions', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
              .from('.hero-visual', { scale: 0.85, opacity: 0, duration: 1.2, ease: 'back.out(1.4)' }, '-=0.8')
              .from('.stat-item', { y: 40, opacity: 0, stagger: 0.1, duration: 0.6 }, '-=0.6');

            // ── Scroll-triggered sections ──
            gsap.utils.toArray('.anim-up').forEach((el) => {
                gsap.from(el, {
                    scrollTrigger: { 
                        trigger: el, 
                        start: 'top 95%', 
                        once: true 
                    },
                    y: 20, 
                    autoAlpha: 0, 
                    duration: 0.6, 
                    ease: 'power2.out',
                });
            });

            // Note: Workflow and Role cards animations removed temporarily to ensure visibility
            gsap.set(['.workflow-card', '.role-card'], { autoAlpha: 1, y: 0 });

            gsap.from('.cta-box', {
                scrollTrigger: { 
                    trigger: '.cta-box', 
                    start: 'top 95%', 
                    once: true 
                },
                scale: 0.95, 
                autoAlpha: 0, 
                duration: 1, 
                ease: 'back.out(1.2)',
            });

            // Refresh ScrollTrigger to ensure correct positions
            setTimeout(() => {
                ScrollTrigger.refresh();
            }, 100);
        });

        return () => ctx.revert();
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans overflow-x-hidden">

            {/* ═══════ NAVBAR ═══════ */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-lg z-50 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-[72px]">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#028a0f] rounded-lg flex items-center justify-center">
                            <Shield className="text-white w-5 h-5" />
                        </div>
                        <span className="text-xl font-black text-slate-900 tracking-tight">AssetLink</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6">
                        <a href="#how-it-works" className="text-sm font-semibold text-slate-500 hover:text-[#028a0f] transition-colors">How it Works</a>
                        <a href="#roles" className="text-sm font-semibold text-slate-500 hover:text-[#028a0f] transition-colors">Who It's For</a>
                        <a href="#features" className="text-sm font-semibold text-slate-500 hover:text-[#028a0f] transition-colors">Features</a>
                        <Separator orientation="vertical" className="h-6" />
                        <Link to="/login"><Button variant="ghost" className="font-bold text-[#028a0f]">Log in</Button></Link>
                        <Link to="/register"><Button className="bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold rounded-lg px-5">Get Started</Button></Link>
                    </div>

                    <button className="md:hidden text-slate-700" onClick={() => setMobileMenu(!mobileMenu)}>
                        {mobileMenu ? <span className="text-2xl">✕</span> : <span className="text-2xl">☰</span>}
                    </button>
                </div>

                {mobileMenu && (
                    <div className="md:hidden bg-white border-t border-slate-100 px-6 py-6 space-y-4">
                        <a href="#how-it-works" className="block text-sm font-semibold text-slate-600" onClick={() => setMobileMenu(false)}>How it Works</a>
                        <a href="#roles" className="block text-sm font-semibold text-slate-600" onClick={() => setMobileMenu(false)}>Who It's For</a>
                        <a href="#features" className="block text-sm font-semibold text-slate-600" onClick={() => setMobileMenu(false)}>Features</a>
                        <Separator />
                        <Link to="/login" className="block"><Button variant="outline" className="w-full font-bold">Log in</Button></Link>
                        <Link to="/register" className="block"><Button className="w-full bg-[#028a0f] hover:bg-[#016d0c] text-white font-bold">Get Started</Button></Link>
                    </div>
                )}
            </nav>

            {/* ═══════ HERO ═══════ */}
            <section className="relative pt-36 pb-20 md:pt-44 md:pb-28">
                {/* Background decorations */}
                <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-[#028a0f]/[0.03] rounded-full -translate-x-1/2 blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full translate-x-1/3 blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text side */}
                        <div className="lg:w-[55%] space-y-8">
                            <Badge className="hero-badge bg-green-50 text-[#028a0f] border-green-200 hover:bg-green-50 px-3 py-1 text-xs font-bold">
                                <QrCode className="w-3 h-3 mr-1.5" /> QR-Powered Asset Management
                            </Badge>

                            <h1 className="hero-heading text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                                <span className="block">Stop losing track</span>
                                <span className="block">of school assets.</span>
                                <span className="block text-[#028a0f]">Start scanning.</span>
                            </h1>

                            <p className="hero-sub text-lg text-slate-500 leading-relaxed max-w-lg">
                                AssetLink digitizes your entire school inventory. Teachers report damage with a QR scan, maintenance gets notified instantly, and principals see everything in real-time.
                            </p>

                            <div className="hero-actions flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => navigate('/register')}
                                    className="h-13 px-7 bg-[#028a0f] hover:bg-[#016d0c] text-white text-base font-bold rounded-xl group shadow-lg shadow-green-900/10"
                                >
                                    Get Started Free
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/login')}
                                    className="h-13 px-7 border-slate-200 text-slate-700 text-base font-bold rounded-xl"
                                >
                                    Log In to Dashboard
                                </Button>
                            </div>
                        </div>

                        {/* Visual side — mock dashboard card */}
                        <div className="lg:w-[45%] hero-visual relative">
                            <Card className="border-slate-200 shadow-2xl shadow-slate-200/60 rounded-2xl overflow-hidden">
                                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                    <span className="ml-3 text-xs text-slate-400 font-mono">assetlink.app/dashboard</span>
                                </div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Repairs</p>
                                            <p className="text-3xl font-black text-slate-900">12</p>
                                        </div>
                                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                                            <Wrench className="w-6 h-6 text-orange-500" />
                                        </div>
                                    </div>
                                    <Separator />
                                    {/* Mini repair list */}
                                    {[
                                        { asset: 'Projector — Room 204', status: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
                                        { asset: 'Lab Chair #17', status: 'Pending', color: 'bg-red-100 text-red-700' },
                                        { asset: 'Desktop PC — ICT Lab', status: 'Completed', color: 'bg-green-100 text-green-700' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                                    <QrCode className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">{item.asset}</span>
                                            </div>
                                            <Badge className={`${item.color} border-0 text-[11px] font-bold`}>{item.status}</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Floating notification card */}
                            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl border border-slate-100 p-3 flex items-center gap-3 animate-bounce">
                                <div className="w-10 h-10 bg-[#028a0f] rounded-lg flex items-center justify-center shrink-0">
                                    <ScanLine className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">New Report</p>
                                    <p className="text-xs font-bold text-slate-800">Chair #42 — Broken leg</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats bar */}
                    <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
                        {STATS.map((s, i) => (
                            <div key={i} className="stat-item text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                <p className="text-3xl font-black text-[#028a0f]">{s.value}</p>
                                <p className="text-sm font-semibold text-slate-500 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ HOW IT WORKS ═══════ */}
            <section id="how-it-works" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 anim-up">
                        <Badge className="bg-green-50 text-[#028a0f] border-green-200 hover:bg-green-50 mb-4">
                            <Zap className="w-3 h-3 mr-1" /> Simple Workflow
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">From damage to fix in 4 steps</h2>
                        <p className="text-slate-500 mt-4 max-w-xl mx-auto">No training needed. If you can scan a QR code, you can use AssetLink.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 workflow-grid">
                        {WORKFLOW_STEPS.map((s, i) => (
                            <Card key={i} className="workflow-card border-slate-200 hover:border-[#028a0f]/30 transition-colors rounded-2xl group">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="text-4xl font-black text-slate-200 group-hover:text-[#028a0f]/20 transition-colors">{s.step}</span>
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: s.color }}>
                                            {s.icon}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mb-2">{s.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ WHO IT'S FOR ═══════ */}
            <section id="roles" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 anim-up">
                        <Badge className="bg-green-50 text-[#028a0f] border-green-200 hover:bg-green-50 mb-4">
                            <Users className="w-3 h-3 mr-1" /> Built for Every Role
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">One platform, four perspectives</h2>
                        <p className="text-slate-500 mt-4 max-w-xl mx-auto">Each user sees exactly what they need — nothing more, nothing less.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 roles-grid">
                        {ROLES.map((r, i) => (
                            <Card key={i} className="role-card border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all rounded-2xl group">
                                <CardContent className="p-8">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-[#028a0f] mb-6 group-hover:bg-[#028a0f] group-hover:text-white transition-colors duration-300">
                                        {r.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">{r.role}</h3>
                                    <p className="text-sm font-semibold text-[#028a0f] mb-4">{r.tagline}</p>
                                    <ul className="space-y-2">
                                        {r.perks.map((p, j) => (
                                            <li key={j} className="flex items-start gap-2 text-sm text-slate-500">
                                                <CheckCircle2 className="w-4 h-4 text-[#028a0f] shrink-0 mt-0.5" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ KEY FEATURES ═══════ */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 anim-up">
                        <Badge className="bg-green-50 text-[#028a0f] border-green-200 hover:bg-green-50 mb-4">
                            <BarChart3 className="w-3 h-3 mr-1" /> Core Capabilities
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Why schools choose AssetLink</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Smartphone className="w-7 h-7" />,
                                title: 'Transparency',
                                desc: 'Real-time visibility into the location and condition of every asset in the school. No more guessing.',
                            },
                            {
                                icon: <Zap className="w-7 h-7" />,
                                title: 'Efficiency',
                                desc: 'Eliminates manual paperwork and slow reporting. A quick scan is all it takes to trigger a repair workflow.',
                            },
                            {
                                icon: <BarChart3 className="w-7 h-7" />,
                                title: 'Data-Driven Decisions',
                                desc: 'View analytics on asset depreciation, common failure points, and maintenance costs to plan budgets smarter.',
                            },
                        ].map((f, i) => (
                            <Card key={i} className="anim-up border-slate-200 rounded-2xl hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                                <CardContent className="p-10">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-[#028a0f] mb-6 group-hover:bg-[#028a0f] group-hover:text-white transition-colors duration-300">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-3">{f.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ CTA ═══════ */}
            <section className="py-24">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="cta-box bg-[#028a0f] rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40" />
                        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full -ml-30 -mb-30" />
                        <div className="relative z-10">
                            <School className="w-12 h-12 mx-auto mb-6 text-green-200" />
                            <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Ready to modernize your school?</h2>
                            <p className="text-green-100 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
                                Join schools already using AssetLink to improve resource efficiency, eliminate paper-based tracking, and speed up maintenance response times.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Link to="/register">
                                    <Button className="h-13 px-10 bg-white text-[#028a0f] hover:bg-green-50 text-base font-bold rounded-xl shadow-xl">
                                        Create Free Account <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                                <Link to="/login">
                                    <Button variant="ghost" className="h-13 px-10 text-white border border-white/20 hover:bg-white/10 text-base font-bold rounded-xl">
                                        Log In
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ FOOTER ═══════ */}
            <footer className="bg-[#0a1f1a] text-white relative overflow-hidden">
                {/* Subtle decorative gradient orbs */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-[#028a0f]/[0.06] rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[200px] bg-emerald-600/[0.04] rounded-full blur-[100px] pointer-events-none" />

                {/* Main footer content */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

                        {/* Brand column */}
                        <div className="lg:col-span-4 space-y-6">
                            <Link to="/" className="flex items-center gap-2.5 group">
                                <div className="w-9 h-9 bg-[#028a0f] rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-[#028a0f]/20 transition-shadow duration-300">
                                    <Shield className="text-white w-5 h-5" />
                                </div>
                                <span className="text-xl font-black tracking-tight">AssetLink</span>
                            </Link>
                            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                                Digitizing school asset management with QR code-enabled repair tracking. Building smarter schools, one scan at a time.
                            </p>
                            {/* Status indicator */}
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-xs text-slate-500 font-medium">All systems operational</span>
                            </div>
                        </div>

                        {/* Platform links */}
                        <div className="lg:col-span-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-5">Platform</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: 'How it Works', href: '#how-it-works' },
                                    { label: 'Who It\'s For', href: '#roles' },
                                    { label: 'Features', href: '#features' },
                                    { label: 'Dashboard', href: '/login' },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 group/link">
                                            <ChevronRight className="w-3 h-3 text-slate-600 group-hover/link:text-[#028a0f] group-hover/link:translate-x-0.5 transition-all duration-200" />
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Resources links */}
                        <div className="lg:col-span-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-5">Resources</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: 'Report Damage', href: '/login' },
                                    { label: 'Track Repairs', href: '/login' },
                                    { label: 'Asset Registry', href: '/login' },
                                    { label: 'Analytics', href: '/login' },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <a href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1.5 group/link">
                                            <ChevronRight className="w-3 h-3 text-slate-600 group-hover/link:text-[#028a0f] group-hover/link:translate-x-0.5 transition-all duration-200" />
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Connect column */}
                        <div className="lg:col-span-4">
                            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mb-5">Connect</h4>
                            <div className="flex items-center gap-3 mb-5">
                                {[
                                    { icon: (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    ), href: '#', label: 'Facebook' },
                                    { icon: (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    ), href: '#', label: 'X' },
                                    { icon: (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                                    ), href: '#', label: 'Instagram' },
                                    { icon: (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                    ), href: '#', label: 'LinkedIn' },
                                ].map((social, i) => (
                                    <a
                                        key={i}
                                        href={social.href}
                                        aria-label={social.label}
                                        className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:bg-[#028a0f] hover:text-white hover:border-[#028a0f]/50 hover:shadow-lg hover:shadow-[#028a0f]/20 transition-all duration-300"
                                    >
                                        {social.icon}
                                    </a>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">Follow our journey as we transform school asset management across the Philippines.</p>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="mt-14 pt-7 border-t border-white/[0.06]">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-xs text-slate-500">
                                © {new Date().getFullYear()} AssetLink. All rights reserved.
                            </p>
                            <div className="flex items-center gap-6">
                                {['Privacy Policy', 'Terms of Service', 'Accessibility'].map((item, i) => (
                                    <a key={i} href="#" className="text-xs text-slate-500 hover:text-slate-300 transition-colors duration-200">
                                        {item}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
