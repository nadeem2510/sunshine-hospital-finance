import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Vendors from './pages/Vendors';
import Accounts from './pages/Accounts';

function AppInner() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (!user) return <Login />;

  const pages = { dashboard: <Dashboard />, employees: <Employees />, payroll: <Payroll />, vendors: <Vendors />, accounts: <Accounts /> };

  return (
    <Layout tab={tab} setTab={setTab}>
      {pages[tab] || <Dashboard />}
    </Layout>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
