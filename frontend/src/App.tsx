import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SalesInvoices } from './pages/SalesInvoices';
import { DeliveryChallans } from './pages/DeliveryChallans';
import { Quotations } from './pages/Quotations';
import { Purchases } from './pages/Purchases';
import { Parties } from './pages/Parties';
import { Inventory } from './pages/Inventory';
import { ServiceManagement as Services } from './pages/ServiceManagement';
import { TechnicianMobile } from './pages/TechnicianMobile';
import { Expenses } from './pages/Expenses';
import { Accounting } from './pages/Accounting';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 font-semibold">Loading Smart Agro Systems...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in as field technician, default directly to TechnicianMobile view
  if (user.role === 'SERVICE_TECHNICIAN' && window.location.pathname === '/') {
    return <Navigate to="/mobile-tech" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sales" element={<SalesInvoices />} />
            <Route path="/delivery-challans" element={<DeliveryChallans />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/parties" element={<Parties />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/services" element={<Services />} />
            <Route path="/mobile-tech" element={<TechnicianMobile />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
