import React, { useState } from 'react';
import {
  Shield, Home, Search, LogOut, Menu, X,
  Building2, ClipboardList, Blocks, ArrowRightLeft, ChevronRight
} from 'lucide-react';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { session, currentUser, logoutUser } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicNavItems = [
    { id: 'home', label: 'Home', icon: Home },
  ];

  const commonNavItems = [
    { id: 'verify', label: 'Verify Property', icon: Search },
    { id: 'ledger', label: 'Ledger', icon: Blocks },
  ];

  const citizenNavItems = [
    { id: 'dashboard', label: 'My Properties', icon: Building2 },
    { id: 'transfer', label: 'Transfer', icon: ArrowRightLeft },
  ];

  const authorityNavItems = [
    { id: 'authority', label: 'Dashboard', icon: Shield },
    { id: 'dashboard', label: 'Pending', icon: ClipboardList },
  ];

  const getNavItems = () => {
    let items = session && currentUser ? [...commonNavItems] : [...publicNavItems, ...commonNavItems];
    if (session && currentUser) {
      if (currentUser.role === 'CITIZEN') {
        items = [...citizenNavItems, ...items];
      } else if (currentUser.role === 'AUTHORITY') {
        items = [...authorityNavItems, ...items];
      }
    }
    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Government Banner */}
      <div className="bg-slate-800 text-slate-300 text-xs py-2 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="font-medium text-white">Government of India</span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline">Ministry of Land Resources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-emerald-400">System Active</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => onNavigate(session && currentUser ? 'dashboard' : 'home')}
            >
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50 group-hover:shadow-indigo-300/50 transition-shadow">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">LandLedger</h1>
                <p className="text-[11px] text-slate-400 font-medium tracking-wide uppercase">Blockchain Secured Platform</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              <div className="flex items-center bg-slate-100 rounded-xl p-1.5 gap-1">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : ''}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              {session && currentUser ? (
                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{currentUser.name}</p>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentUser.role === 'AUTHORITY' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></span>
                        <p className="text-xs text-slate-400 capitalize">{currentUser.role.toLowerCase()}</p>
                      </div>
                    </div>
                    <button
                      onClick={logoutUser}
                      className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Logout"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('login')}
                  className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-200/50 hover:shadow-indigo-300/50"
                >
                  Sign In
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100">
            <nav className="px-4 py-3 space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
              {session && currentUser && (
                <button
                  onClick={() => {
                    logoutUser();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              )}
              {!session && (
                <button
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium bg-indigo-600 text-white"
                >
                  <Shield className="w-5 h-5" />
                  Sign In
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">LandLedger</p>
                <p className="text-xs text-slate-500">© 2024 Government of India. All rights reserved.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span>All Systems Operational</span>
              </div>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">SHA-256 Encrypted</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">IPFS Secured</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
