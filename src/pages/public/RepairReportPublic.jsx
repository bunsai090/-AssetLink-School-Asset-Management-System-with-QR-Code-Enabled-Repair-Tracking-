import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle, Wrench, DollarSign, Package, Image, Printer, ArrowLeft, ShieldCheck, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export default function RepairReportPublic() {
    const urlParams = new URLSearchParams(window.location.search);
    const requestId = urlParams.get('id');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!requestId) { setNotFound(true); setLoading(false); return; }
        async function load() {
            try {
                const snap = await getDoc(doc(db, 'repair_requests', requestId));
                if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
                setReport({ id: snap.id, ...snap.data() });
            } catch (e) {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [requestId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-teal/20 border-t-teal rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Loading Report</p>
            </div>
        </div>
    );

    if (notFound) return (
        <div className="flex items-center justify-center min-h-screen text-center p-6 bg-slate-50/50">
            <div className="max-w-sm">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Wrench className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Report Not Found</h2>
                <p className="text-slate-500 mt-3 text-sm leading-relaxed">This repair report link is invalid or the record has been archived. Please contact your administrator.</p>
                <Button variant="outline" className="mt-8 rounded-xl px-8 font-bold" onClick={() => window.history.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] print:bg-white pb-12">
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                    
                    /* Force content into one page */
                    html, body { height: 99%; overflow: hidden; }
                    
                    .max-w-2xl { max-width: 100% !important; width: 100% !important; padding: 0.5in !important; margin: 0 !important; }
                    
                    /* Shrink spacing */
                    main.space-y-6 { gap: 0.75rem !important; margin-top: 0 !important; }
                    .p-8 { padding: 1.25rem !important; }
                    .p-6 { padding: 1rem !important; }
                    .rounded-[2.5rem], .rounded-3xl { border-radius: 1rem !important; }
                    
                    /* Shrink typography */
                    h1.text-3xl { font-size: 1.5rem !important; }
                    h2.text-4xl { font-size: 1.75rem !important; }
                    .text-sm { font-size: 0.75rem !important; }
                    .text-base { font-size: 0.85rem !important; }
                    .text-2xl { font-size: 1.25rem !important; }
                    
                    /* Optimize image for space */
                    img { max-height: 2.5in !important; object-fit: contain !important; }
                    
                    /* Compact grid */
                    .grid { gap: 0.75rem !important; }
                    
                    /* Shrink footer */
                    .pt-8 { padding-top: 1rem !important; }
                    .mt-4 { margin-top: 0.5rem !important; }
                }
            `}} />

            {/* Premium Header */}
            <header className="no-print sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-8 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal to-emerald-500 flex items-center justify-center shadow-lg shadow-teal/20">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-black text-slate-900 text-base tracking-tight">AssetLink</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">Verification Gateway</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={handlePrint}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 h-11 font-black uppercase text-[10px] tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/10"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print Report
                        </Button>
                    </div>
                </div>
            </header>

            {/* Report Content */}
            <main className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:space-y-4">
                
                {/* Receipt Header (Visible in Print) */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">OFFICIAL SERVICE REPORT</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.3em]">AssetLink Management System</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Document Ref</p>
                        <p className="font-black text-slate-900">#{report.request_number || report.id.substring(0, 8)}</p>
                    </div>
                </div>

                {/* Status Banner */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <CheckCircle className="w-32 h-32 text-teal" />
                    </div>
                    
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex h-2 w-2 rounded-full bg-teal animate-pulse" />
                            <p className="text-[10px] font-black text-teal uppercase tracking-[0.2em]">Verified Completion</p>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
                            {report.asset_name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {report.school_name || 'N/A'}</span>
                            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {report.completed_at ? format(report.completed_at.toDate(), 'MMM d, yyyy') : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    {/* Damage Description */}
                    <div className="bg-amber-50/50 rounded-3xl p-6 border border-amber-100/60">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">Original Issue</p>
                        <blockquote className="text-sm font-medium text-amber-900 italic leading-relaxed">
                            "{report.description}"
                        </blockquote>
                        <div className="mt-4 pt-4 border-t border-amber-200/30 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-black text-amber-700 uppercase">
                                {report.reported_by_name?.charAt(0) || 'T'}
                            </div>
                            <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest">Reported by {report.reported_by_name || 'Teacher'}</p>
                        </div>
                    </div>

                    {/* Staff Remarks */}
                    <div className="bg-teal-50/50 rounded-3xl p-6 border border-teal-100/60">
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-4">Service Remarks</p>
                        <p className="text-sm font-bold text-teal-900 leading-relaxed">
                            {report.maintenance_notes || 'Standard maintenance performed.'}
                        </p>
                        <div className="mt-4 pt-4 border-t border-teal-200/30">
                             <p className="text-[10px] font-bold text-teal-700/60 uppercase tracking-widest">Technician Approved</p>
                        </div>
                    </div>
                </div>

                {/* Financials & Inventory */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-slate-400" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materials</p>
                            </div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                {report.materials_used || 'None'}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <DollarSign className="w-4 h-4 text-amber-600" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Cost</p>
                            </div>
                            <p className="text-2xl font-black text-slate-900">
                                ₱{report.actual_cost?.toLocaleString() || '0.00'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Evidence Image */}
                {report.completion_photo && (
                    <div className="bg-white rounded-3xl p-4 border border-slate-200/60 shadow-sm print:p-0 print:border-none">
                         <div className="flex items-center gap-2 mb-4 px-2 no-print">
                            <Image className="w-4 h-4 text-teal" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Physical Evidence</p>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                            <img
                                src={report.completion_photo}
                                alt="Completion proof"
                                className="w-full h-auto object-cover max-h-[400px]"
                            />
                        </div>
                    </div>
                )}

                {/* Verification Footer */}
                <div className="flex flex-col items-center pt-8 border-t border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center max-w-[250px] leading-relaxed">
                        AssetLink Secure Verification Page · Do not share sensitive repair logs
                    </p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase mt-4">
                        Report Generated: {format(new Date(), 'MMMM d, yyyy · p')}
                    </p>
                </div>
            </main>
        </div>
    );
}

