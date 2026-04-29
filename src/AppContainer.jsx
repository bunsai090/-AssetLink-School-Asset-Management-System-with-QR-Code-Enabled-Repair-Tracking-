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
import UserManagement from './pages/admin/Users';
import RepairRequestsTeacher from './pages/teacher/RepairRequests';
import ReportDamage from './pages/teacher/ReportDamage';
import RepairRequestsPrincipal from './pages/principal/RepairRequests';
import Tasks from './pages/maintenance/Tasks';
import MaintenanceCalendar from './pages/maintenance/MaintenanceCalendar';
import AssetPublic from './pages/public/AssetPublic';
import RepairReportPublic from './pages/public/RepairReportPublic';
import React, { useEffect, Component } from 'react';

// --- CRASH REPORTER (Error Boundary) ---
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 p-8 flex flex-col items-center justify-center font-sans">
            <h1 className="text-4xl font-black text-red-600 mb-2">Oops! Something went wrong.</h1>
            <p className="text-lg font-bold text-red-800 mb-6 bg-red-100 px-4 py-2 rounded-lg">
                {this.state.error && this.state.error.toString()}
            </p>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-200 overflow-auto w-full max-w-5xl">
                <h3 className="font-bold text-slate-800 mb-2">Component Stack Trace:</h3>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
            </div>
            <button 
                onClick={() => window.location.href = '/'}
                className="mt-8 bg-red-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-red-700 transition-colors"
            >
                Refresh App
            </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthenticatedApp = () => {
    const { currentUser, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
    const role = currentUser?.role || 'teacher';

    useEffect(() => {
        if (currentUser) {
            console.log("--- APP_CONTAINER LOADED ---");
            console.log("Logged in User:", currentUser.email);
            console.log("User Role:", role);
        }
    }, [currentUser, role]);


    if (isLoadingPublicSettings || isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#028a0f] rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading AssetLink...</p>
                </div>
            </div>
        );
    }

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

    if (authError) {
        if (authError.type === 'unauthorized_role') {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                        <ShieldAlert className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h1>
                    <p className="text-slate-600 max-w-sm mb-8">{authError.message}</p>
                    <button onClick={() => window.location.href = '/'} className="bg-[#028a0f] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#016d0c] transition-colors">Back to Login</button>
                </div>
            );
        }
    }

    const renderDashboard = () => {
        if (role === 'maintenance') return <DashboardMaintenance />;
        if (role === 'teacher') return <DashboardTeacher />;
        if (role === 'principal') return <DashboardPrincipal />;
        return <DashboardAdmin />;
    };

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
                <Route path="/users" element={<UserManagement />} />
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

export default function AppContainer() {
    return (
        <ErrorBoundary>
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
        </ErrorBoundary>
    );
}
