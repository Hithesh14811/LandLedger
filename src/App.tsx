import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { LoginPage } from './components/LoginPage';
import { UserDashboard } from './components/UserDashboard';
import { RegisterPropertyPage } from './components/RegisterPropertyPage';
import { TransferPropertyPage } from './components/TransferPropertyPage';
import { SubdividePropertyPage } from './components/SubdividePropertyPage';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { VerifyPropertyPage } from './components/VerifyPropertyPage';
import { LedgerExplorer } from './components/LedgerExplorer';
import { useStore } from './store';

// Version for cache invalidation - update this when data structure changes
const APP_VERSION = '11.0.0';

type PageType = 
  | 'home' 
  | 'login' 
  | 'dashboard' 
  | 'register-property' 
  | 'transfer' 
  | 'subdivide'
  | 'authority' 
  | 'verify' 
  | 'ledger';

export function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const { currentUser, initializeDemoData } = useStore();

  // Version check and cache clear
  useEffect(() => {
    const storedVersion = localStorage.getItem('land-registry-version');
    if (storedVersion !== APP_VERSION) {
      // Clear old data
      localStorage.removeItem('land-registry-storage');
      localStorage.removeItem('userPrivateKey');
      localStorage.setItem('land-registry-version', APP_VERSION);
      // Force reload to clear zustand state
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    initializeDemoData();
  }, [initializeDemoData]);

  useEffect(() => {
    if (currentUser && currentPage === 'home') {
      setCurrentPage('dashboard');
    }
  }, [currentUser, currentPage]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as PageType);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'dashboard':
        if (currentUser?.role === 'AUTHORITY') {
          return <AuthorityDashboard onNavigate={handleNavigate} />;
        }
        return <UserDashboard onNavigate={handleNavigate} />;
      case 'register-property':
        return <RegisterPropertyPage onNavigate={handleNavigate} />;
      case 'transfer':
        return <TransferPropertyPage onNavigate={handleNavigate} />;
      case 'subdivide':
        return <SubdividePropertyPage onNavigate={handleNavigate} />;
      case 'authority':
        return <AuthorityDashboard onNavigate={handleNavigate} />;
      case 'verify':
        return <VerifyPropertyPage />;
      case 'ledger':
        return <LedgerExplorer />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}
