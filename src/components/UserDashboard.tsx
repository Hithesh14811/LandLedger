import {
  Building2, ArrowRightLeft, Scissors,
  Shield, Clock, CheckCircle, XCircle, MapPin, Copy, Check, Wallet, Activity, TrendingUp, Landmark, FileCheck, ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../store';

interface UserDashboardProps {
  onNavigate: (page: string) => void;
}

export function UserDashboard({ onNavigate }: UserDashboardProps) {
  const { currentUser, properties, pendingActions, ledger, nocTransferRequests, getUserByWallet } = useStore();
  const [walletCopied, setWalletCopied] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 text-lg">Please sign in to view your dashboard</p>
        </div>
      </div>
    );
  }

  const myProperties = properties.filter(p => p.currentOwnerWallet === currentUser.walletAddress);
  const myPendingActions = pendingActions.filter(a => a.requestedBy === currentUser.walletAddress);
  
  // Get NOC transfer requests for current user (both as sender and receiver)
  const myNOCRequests = nocTransferRequests.filter(r => 
    r.fromWallet === currentUser.walletAddress || r.toWallet === currentUser.walletAddress
  );
  
  const myTransactions = ledger.filter(b => 
    b.initiatorWalletAddress === currentUser.walletAddress ||
    b.transactionData.toWallet === currentUser.walletAddress ||
    b.transactionData.fromWallet === currentUser.walletAddress
  );

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'Low Risk';
    if (score >= 40) return 'Medium Risk';
    return 'High Risk';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'pending': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'disputed': return 'text-red-700 bg-red-50 border-red-200';
      case 'subdivided': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const maskedWallet = `${currentUser.walletAddress.substring(0, 10)}...${currentUser.walletAddress.substring(currentUser.walletAddress.length - 8)}`;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage your properties and view transactions</p>
        </div>
        <button
          onClick={() => onNavigate('verify')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-200"
        >
          <Shield className="w-4 h-4" />
          Verify Property
        </button>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">Account Holder</p>
              <h2 className="text-xl font-bold">{currentUser.name}</h2>
              <p className="text-slate-400 text-sm">{currentUser.email}</p>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1.5 font-medium">Wallet Address</p>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(currentUser.walletAddress);
                setWalletCopied(true);
                window.setTimeout(() => setWalletCopied(false), 2000);
              }}
              className="flex items-center gap-3 text-sm font-mono text-indigo-300 hover:text-indigo-200 transition-colors group"
              title="Click to copy full wallet address"
            >
              <span>{maskedWallet}</span>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all ${
                walletCopied 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-slate-600 text-slate-300 group-hover:bg-slate-500'
              }`}>
                {walletCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{myProperties.filter(p => p.status === 'active').length}</div>
          <div className="text-sm text-slate-500 font-medium">Active Properties</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{myPendingActions.filter(a => a.status === 'pending').length}</div>
          <div className="text-sm text-slate-500 font-medium">Pending Actions</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{myTransactions.length}</div>
          <div className="text-sm text-slate-500 font-medium">Transactions</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {myProperties.reduce((sum, p) => sum + p.areaSquareMeters, 0).toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 font-medium">Total Area (m²)</div>
        </div>
      </div>

      {/* My Properties */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">My Properties</h2>
          </div>
          <span className="text-sm text-slate-500">{myProperties.length} total</span>
        </div>
        
        {myProperties.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Landmark className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Properties Yet</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
              To register a property, visit your local Land Registry Office with your property documents and Aadhaar card.
            </p>
            <button
              onClick={() => onNavigate('verify')}
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Shield className="w-4 h-4" />
              Verify an existing property
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myProperties.map(property => (
              <div key={property.propertyID} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{property.propertyID}</h3>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(property.status)}`}>
                        {property.status.toUpperCase()}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRiskColor(property.riskScore)}`}>
                        {getRiskLabel(property.riskScore)} • {property.riskScore}
                      </span>
                      {property.loanInfo?.isUnderLoan && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          🏦 Loan Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {property.location}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{property.areaSquareMeters.toLocaleString()} m²</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>Registered {formatDate(property.registeredAt)}</span>
                    </div>
                  </div>
                  
                  {property.status === 'active' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onNavigate('transfer')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer
                      </button>
                      <button
                        onClick={() => onNavigate('subdivide')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Scissors className="w-4 h-4" />
                        Subdivide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Actions */}
      {myPendingActions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Pending Actions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {myPendingActions.map(action => (
              <div key={action.actionID} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      action.status === 'pending' 
                        ? 'bg-amber-100' 
                        : action.status === 'approved'
                        ? 'bg-emerald-100'
                        : 'bg-red-100'
                    }`}>
                      {action.status === 'pending' ? (
                        <Clock className="w-5 h-5 text-amber-600" />
                      ) : action.status === 'approved' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{action.actionType.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-slate-500">
                        Submitted {formatDate(action.requestedAt)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    action.status === 'pending' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : action.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {action.status.toUpperCase()}
                  </span>
                </div>
                {action.comments && (
                  <div className="mt-3 ml-14 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="font-medium">Authority Comment:</span> {action.comments}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOC Transfer Requests */}
      {myNOCRequests.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-orange-50 flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">NOC Transfer Requests</h2>
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-medium">
              Bank Loan Clearance
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {myNOCRequests.map(request => {
              const fromUser = getUserByWallet(request.fromWallet);
              const toUser = getUserByWallet(request.toWallet);
              const property = properties.find(p => p.propertyID === request.propertyID);
              const isSender = request.fromWallet === currentUser.walletAddress;
              
              return (
                <div key={request.requestID} className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        request.status === 'pending' 
                          ? 'bg-amber-100' 
                          : request.status === 'approved'
                          ? 'bg-emerald-100'
                          : 'bg-red-100'
                      }`}>
                        {request.status === 'pending' ? (
                          <Clock className="w-5 h-5 text-amber-600" />
                        ) : request.status === 'approved' ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-900">
                            {isSender ? 'Transfer to' : 'Incoming from'} {isSender ? toUser?.name : fromUser?.name}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            isSender ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {isSender ? 'OUTGOING' : 'INCOMING'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          Property: <span className="font-medium">{request.propertyID}</span>
                          {property && <span className="text-slate-400"> • {property.location}</span>}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Landmark className="w-3 h-3" />
                            {request.bankName}
                          </span>
                          <span>Loan: ₹{request.loanAmount.toLocaleString()}</span>
                          <span>Submitted {formatDate(request.requestedAt)}</span>
                        </div>
                        
                        {/* Show transfer details */}
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="text-slate-600">{fromUser?.name || 'Unknown'}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-600">{toUser?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex-shrink-0 ${
                      request.status === 'pending' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : request.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Status Messages */}
                  {request.status === 'pending' && (
                    <div className="mt-3 ml-14 text-sm text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-200">
                      <span className="font-medium">⏳ Awaiting Authority Review:</span> Your NOC transfer request is being reviewed by the Land Registry Authority. The bank NOC document will be verified before the transfer is approved.
                    </div>
                  )}
                  
                  {request.status === 'approved' && (
                    <div className="mt-3 ml-14 text-sm text-emerald-700 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                      <span className="font-medium">✅ Transfer Completed:</span> The property has been successfully transferred. The bank loan has been cleared and ownership has been updated.
                      {!isSender && <span className="block mt-1 font-medium">You are now the legal owner of this property!</span>}
                    </div>
                  )}
                  
                  {request.status === 'rejected' && (
                    <div className="mt-3 ml-14 text-sm text-red-700 bg-red-50 rounded-xl p-3 border border-red-200">
                      <span className="font-medium">❌ Transfer Rejected:</span> {request.rejectionReason || 'The NOC document could not be verified. Please contact the Land Registry Office for more information.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Transactions</h2>
          </div>
          <button
            onClick={() => onNavigate('ledger')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View All →
          </button>
        </div>
        
        {myTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">No transactions recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myTransactions.slice(-5).reverse().map(block => (
              <div key={block.index} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-bold">#{block.index}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{block.transactionType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {block.blockHash.substring(0, 20)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{formatDate(block.timestamp)}</p>
                    <p className="text-xs text-slate-400">Property: {block.transactionData.propertyID}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
