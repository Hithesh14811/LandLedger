import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Shield, Fingerprint, User, Building2, Info, CheckCircle, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (page: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { users, loginUser, initializeDemoData } = useStore();
  const [selectedUser, setSelectedUser] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeDemoData();
  }, [initializeDemoData]);

  const handleLogin = async () => {
    if (!selectedUser) {
      setError('Please select a user to login');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    // Simulate WebAuthn authentication delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const success = loginUser(selectedUser);
    
    if (success) {
      onNavigate('dashboard');
    } else {
      setError('Authentication failed. Please try again.');
    }
    
    setIsAuthenticating(false);
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.substring(0, 10)}...${wallet.substring(wallet.length - 6)}`;
  };

  const selectedUserData = users.find(u => u.userID === selectedUser);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500">Sign in to access your land registry account</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Info Banner */}
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-indigo-900">Registration Information</p>
                <p className="text-indigo-700 mt-1">
                  New users must be registered by a Land Registry Authority using Aadhaar verification. 
                  Visit your local office to register.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Your Account
              </label>
              <select
                value={selectedUser}
                onChange={(e) => {
                  setSelectedUser(e.target.value);
                  setError('');
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="">Choose an account...</option>
                {users.map(user => (
                  <option key={user.userID} value={user.userID}>
                    {user.name} • {user.role === 'AUTHORITY' ? 'Authority' : 'Citizen'}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected User Details */}
            {selectedUserData && (
              <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedUserData.role === 'AUTHORITY' 
                        ? 'bg-amber-100' 
                        : 'bg-emerald-100'
                    }`}>
                      {selectedUserData.role === 'AUTHORITY' 
                        ? <Building2 className="w-5 h-5 text-amber-600" />
                        : <User className="w-5 h-5 text-emerald-600" />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{selectedUserData.name}</p>
                      <p className={`text-xs font-medium ${
                        selectedUserData.role === 'AUTHORITY' 
                          ? 'text-amber-600' 
                          : 'text-emerald-600'
                      }`}>
                        {selectedUserData.role === 'AUTHORITY' ? 'Land Registry Authority' : 'Registered Citizen'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Aadhaar Number</span>
                    <span className="font-mono text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-100">
                      {selectedUserData.aadhaarNumber?.replace(/(\d{4})/g, '$1 ').trim() || selectedUserData.nationalID}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Wallet Address</span>
                    <span className="font-mono text-xs text-slate-800 bg-white px-2 py-1 rounded-md border border-slate-100">
                      {truncateWallet(selectedUserData.walletAddress)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Verification Status</span>
                    <span className={`flex items-center gap-1.5 font-medium ${
                      selectedUserData.verified ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {selectedUserData.verified 
                        ? <><CheckCircle className="w-4 h-4" /> Verified</>
                        : <><AlertCircle className="w-4 h-4" /> Pending</>
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={!selectedUser || isAuthenticating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl px-4 py-4 font-semibold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 disabled:shadow-none"
            >
              {isAuthenticating ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Sign In with Passkey</span>
                </>
              )}
            </button>
          </div>

          {/* Security Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Secured by WebAuthn</p>
                <p className="text-xs text-slate-500">Your biometric data never leaves your device</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-amber-800">
            <span className="font-semibold">Demo Mode:</span> Select any user to simulate login. 
            In production, this uses WebAuthn hardware authentication.
          </p>
        </div>
      </div>
    </div>
  );
};
