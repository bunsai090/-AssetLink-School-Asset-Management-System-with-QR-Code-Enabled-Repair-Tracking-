import { Toaster } from "sileo";
import { ShieldAlert } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LocalLogin from './pages/auth/LocalLogin';
import LocalRegister from './pages/auth/LocalRegister';
import LandingPage from './pages/landing/LandingPage';
import Layout from './components/Layout';
import DashboardAdmin from './pages/admin/Dashboard';
import DashboardTeacher from './pages/teacher/Dashboard';
import UserProfile from './pages/profile/UserProfile';
import DashboardMaintenance from './pages/maintenance/Dashboard';

import DashboardPrincipal from './pages/principal/Dashboard';

import Assets from './pages/admin/Assets';
import Analytics from './pages/admin/Analytics';

import RepairRequestsTeacher from './pages/teacher/RepairRequests';
import ReportDamage from './pages/teacher/ReportDamage';

import RepairRequestsPrincipal from './pages/principal/RepairRequests';

import Tasks from './pages/maintenance/Tasks';
import MaintenanceCalendar from './pages/maintenance/MaintenanceCalendar';

import AssetPublic from './pages/public/AssetPublic';
import RepairReportPublic from './pages/public/RepairReportPublic';

import { LifeLine } from "react-loading-indicators";

console.log("--- ASSETLINK APP REFRESHED: VERSION 2.0 ---");

const AuthenticatedApp = () => {
    const { currentUser, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
    const role = currentUser?.role || 'teacher';

    // Auto-redirect authenticated users away from auth pages
    if (currentUser && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
        return <Navigate to="/" replace />;
    }

    // Show loading spinner
    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999]">
                <LifeLine color="#32cd32" size="medium" text="" textColor="" />
                <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">
                    Loading AssetLink...
                </p>
            </div>
        );
    }

    // Show login/register flows if not authenticated
    if (!currentUser) {
        return (
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LocalLogin />} />
                <Route path="/register" element={<LocalRegister />} />
                <Route path="*" element={<LandingPage />} />
            </Routes>
        );
    }

    // Handle authentication errors
    if (authError) {
        if (authError.type === 'user_not_registered') {
            return <UserNotRegisteredError />;
        }
        if (authError.type === 'unauthorized_role') {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h1>
                    <p className="text-slate-600 max-w-sm mb-8">{authError.message}</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="bg-[#008080] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#006666] transition-colors"
                    >
                        Back to Login
                    </button>
                </div>
            );
        }
    }

    // Role-based Dashboard selection
    const renderDashboard = () => {
        if (role === 'maintenance') return <DashboardMaintenance />;
        if (role === 'teacher') return <DashboardTeacher />;
        if (role === 'principal') return <DashboardPrincipal />;
        return <DashboardAdmin />;
    };

    // Role-based Repair Requests selection
    const renderRepairRequests = () => {
        if (role === 'principal') return <RepairRequestsPrincipal />;
        return <RepairRequestsTeacher />;
    };

    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={renderDashboard()} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/repair-requests" element={renderRepairRequests()} />
                <Route path="/report-damage" element={<ReportDamage />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/calendar" element={<MaintenanceCalendar />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/asset-view" element={<AssetPublic />} />
                <Route path="*" element={<PageNotFound />} />
            </Route>
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <QueryClientProvider client={queryClientInstance}>
                <Router>
                    <Routes>
                        <Route path="/repair-report" element={<RepairReportPublic />} />
                        <Route path="/*" element={<AuthenticatedApp />} />
                    </Routes>
                </Router>
                <Toaster position="top-right" />
            </QueryClientProvider>
        </AuthProvider>
    )
}

export default App