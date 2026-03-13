import React, { useState } from 'react';
import { useStore } from '../store';
import type { GeoPolygon, LoanInfo, User } from '../types';
import { createRectanglePolygon } from '../utils/geo';
import { Shield, Users, Building2, Landmark, CheckCircle, XCircle, Clock, Copy, Check, AlertTriangle, Search, User as UserIcon, FileCheck, ArrowRight, Download } from 'lucide-react';

interface AuthorityDashboardProps {
  onNavigate: (page: string) => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ onNavigate: _onNavigate }) => {
  const {
    currentUser, users, properties,
    getPendingActionsForAuthority, approvePropertyRegistration, approveSubdivision, rejectAction,
    registerUserByAuthority, registerPropertyByAuthority, updatePropertyLoanStatus,
    searchUsersByName, getUserByWallet, getNOCTransferRequests, approveNOCTransfer, rejectNOCTransfer
  } = useStore();

  const [activeTab, setActiveTab] = useState<'pending' | 'noc' | 'users' | 'properties' | 'loan'>('pending');
  const [_nocRejectReason, setNocRejectReason] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // User Registration State
  const [userForm, setUserForm] = useState({ name: '', aadhaarNumber: '', email: '', phone: '' });
  const [registeredUserWallet, setRegisteredUserWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [userError, setUserError] = useState('');

  // Property Registration State
  const [propertyForm, setPropertyForm] = useState({
    ownerSearch: '', selectedOwner: null as User | null,
    location: '', surveyNumber: '', areaSquareMeters: '',
    centerLng: '', centerLat: '',
    previousOwnerSearch: '', selectedPreviousOwner: null as User | null,
    documents: [] as { type: string; content: string }[]
  });
  const [ownerSuggestions, setOwnerSuggestions] = useState<User[]>([]);
  const [previousOwnerSuggestions, setPreviousOwnerSuggestions] = useState<User[]>([]);
  const [propertyError, setPropertyError] = useState('');
  const [registeredProperty, setRegisteredProperty] = useState<string | null>(null);

  // Loan Update State
  const [loanForm, setLoanForm] = useState({
    propertyID: '', isUnderLoan: false, loanAmount: '', remainingAmount: '',
    loanProvider: '', remainingYears: '', monthlyEMI: ''
  });
  const [loanSuccess, setLoanSuccess] = useState(false);

  const pendingActionsList = getPendingActionsForAuthority();
  const nocRequests = getNOCTransferRequests();

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!currentUser || currentUser.role !== 'AUTHORITY') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800">Access Denied</h2>
          <p className="text-red-600 mt-2">This page is only accessible to Land Registry Authorities.</p>
        </div>
      </div>
    );
  }

  const handleRegisterUser = () => {
    setUserError('');
    setRegisteredUserWallet(null);
    if (!userForm.name || !userForm.aadhaarNumber || !userForm.email || !userForm.phone) {
      setUserError('All fields are required');
      return;
    }
    if (!/^\d{12}$/.test(userForm.aadhaarNumber)) {
      setUserError('Aadhaar number must be exactly 12 digits');
      return;
    }
    try {
      const result = registerUserByAuthority({ name: userForm.name, aadhaarNumber: userForm.aadhaarNumber, email: userForm.email, phone: userForm.phone });
      setRegisteredUserWallet({ address: result.wallet.address, privateKey: result.wallet.privateKey });
      setUserForm({ name: '', aadhaarNumber: '', email: '', phone: '' });
    } catch (err: unknown) {
      setUserError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const handleOwnerSearch = (query: string) => {
    setPropertyForm(prev => ({ ...prev, ownerSearch: query, selectedOwner: null }));
    if (query.length >= 2) {
      setOwnerSuggestions(searchUsersByName(query).filter(u => u.role === 'CITIZEN'));
    } else {
      setOwnerSuggestions([]);
    }
  };

  const handlePreviousOwnerSearch = (query: string) => {
    setPropertyForm(prev => ({ ...prev, previousOwnerSearch: query, selectedPreviousOwner: null }));
    if (query.length >= 2) {
      setPreviousOwnerSuggestions(searchUsersByName(query).filter(u => u.role === 'CITIZEN'));
    } else {
      setPreviousOwnerSuggestions([]);
    }
  };

  const handleRegisterProperty = () => {
    setPropertyError('');
    setRegisteredProperty(null);
    if (!propertyForm.selectedOwner) { setPropertyError('Please select a registered owner'); return; }
    if (!propertyForm.location || !propertyForm.surveyNumber || !propertyForm.areaSquareMeters) { setPropertyError('Location, survey number, and area are required'); return; }
    if (!propertyForm.centerLng || !propertyForm.centerLat) { setPropertyError('Property coordinates are required'); return; }

    const area = parseFloat(propertyForm.areaSquareMeters);
    const lng = parseFloat(propertyForm.centerLng);
    const lat = parseFloat(propertyForm.centerLat);
    if (isNaN(area) || isNaN(lng) || isNaN(lat)) { setPropertyError('Invalid numeric values'); return; }

    const side = Math.sqrt(area);
    const boundaryPolygon: GeoPolygon = createRectanglePolygon(lng, lat, side, side);
    const documents = [
      { type: 'sale_deed', content: `Sale Deed for ${propertyForm.surveyNumber} - Owner: ${propertyForm.selectedOwner.name} - ${Date.now()}` },
      { type: 'survey_map', content: `Survey Map for ${propertyForm.surveyNumber} - Coordinates: ${lng}, ${lat} - ${Date.now()}` }
    ];

    const result = registerPropertyByAuthority({
      ownerWallet: propertyForm.selectedOwner.walletAddress, location: propertyForm.location,
      surveyNumber: propertyForm.surveyNumber, areaSquareMeters: area, boundaryPolygon, documents,
      previousOwnerWallet: propertyForm.selectedPreviousOwner?.walletAddress
    });

    if ('error' in result) { setPropertyError(result.error); }
    else {
      setRegisteredProperty(result.propertyID);
      setPropertyForm({ ownerSearch: '', selectedOwner: null, location: '', surveyNumber: '', areaSquareMeters: '', centerLng: '', centerLat: '', previousOwnerSearch: '', selectedPreviousOwner: null, documents: [] });
    }
  };

  const handleUpdateLoan = () => {
    setLoanSuccess(false);
    if (!loanForm.propertyID) return;
    const loanInfo: LoanInfo = {
      isUnderLoan: loanForm.isUnderLoan,
      loanAmount: loanForm.loanAmount ? parseFloat(loanForm.loanAmount) : undefined,
      remainingAmount: loanForm.remainingAmount ? parseFloat(loanForm.remainingAmount) : undefined,
      loanProvider: loanForm.loanProvider || undefined,
      remainingYears: loanForm.remainingYears ? parseFloat(loanForm.remainingYears) : undefined,
      monthlyEMI: loanForm.monthlyEMI ? parseFloat(loanForm.monthlyEMI) : undefined
    };
    updatePropertyLoanStatus(loanForm.propertyID, loanInfo);
    setLoanSuccess(true);
    setLoanForm({ propertyID: '', isUnderLoan: false, loanAmount: '', remainingAmount: '', loanProvider: '', remainingYears: '', monthlyEMI: '' });
  };

  const handleApprove = (actionID: string, type: string) => {
    if (type === 'SUBDIVIDE_PROPERTY') approveSubdivision(actionID);
    else approvePropertyRegistration(actionID);
  };

  const truncateWallet = (wallet: string) => `${wallet.substring(0, 8)}...${wallet.substring(wallet.length - 6)}`;

  const tabs = [
    { id: 'pending', label: 'Pending Approvals', icon: Clock, count: pendingActionsList.length },
    { id: 'noc', label: 'NOC Transfers', icon: FileCheck, count: nocRequests.length },
    { id: 'users', label: 'Register User', icon: Users },
    { id: 'properties', label: 'Register Property', icon: Building2 },
    { id: 'loan', label: 'Loan Status', icon: Landmark }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Authority Dashboard</h1>
            <p className="text-slate-400">Land Registry Administration Panel</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium">Pending</p>
            <p className="text-2xl font-bold">{pendingActionsList.length}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium">Users</p>
            <p className="text-2xl font-bold">{users.filter(u => u.role === 'CITIZEN').length}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium">Properties</p>
            <p className="text-2xl font-bold">{properties.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex bg-slate-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 border-b-2 border-indigo-600 -mb-px'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-semibold">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Pending Approvals */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingActionsList.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No pending actions</p>
                  <p className="text-slate-400 text-sm">All caught up!</p>
                </div>
              ) : (
                pendingActionsList.map(action => {
                  const requester = getUserByWallet(action.requestedBy);
                  return (
                    <div key={action.actionID} className="bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                              action.actionType === 'SUBDIVIDE_PROPERTY' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>{action.actionType.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-slate-400">{new Date(action.requestedAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-700">Requested by: <span className="font-semibold">{requester?.name || 'Unknown'}</span></p>
                          {action.data.location && <p className="text-sm text-slate-500 mt-1">📍 {action.data.location}</p>}
                          {action.data.parentPropertyID && <p className="text-sm text-slate-500">🏠 Parent: {action.data.parentPropertyID}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(action.actionID, action.actionType)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button onClick={() => rejectAction(action.actionID, 'Rejected by authority')} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* NOC Transfer Approvals */}
          {activeTab === 'noc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                  NOC Transfer Requests
                </h3>
                <span className="text-sm text-slate-500">{nocRequests.length} pending</span>
              </div>

              {nocRequests.length === 0 ? (
                <div className="text-center py-16">
                  <CheckCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No pending NOC transfers</p>
                  <p className="text-slate-400 text-sm">All NOC transfer requests have been processed</p>
                </div>
              ) : (
                nocRequests.map(request => {
                  const fromUser = getUserByWallet(request.fromWallet);
                  const toUser = getUserByWallet(request.toWallet);
                  const property = properties.find(p => p.propertyID === request.propertyID);
                  
                  return (
                    <div key={request.requestID} className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 hover:border-amber-300 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileCheck className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-200 text-amber-800">
                              NOC TRANSFER
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(request.requestedAt).toLocaleString()}
                            </span>
                          </div>
                          
                          {/* Property Info */}
                          <div className="bg-white rounded-lg p-3 mb-3 border border-amber-100">
                            <p className="text-xs text-slate-500 mb-1">Property</p>
                            <p className="font-semibold text-slate-800">{request.propertyID}</p>
                            {property && <p className="text-sm text-slate-500">{property.location}</p>}
                          </div>
                          
                          {/* Transfer Details */}
                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex-1 bg-white rounded-lg p-3 border border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">From</p>
                              <p className="font-semibold text-slate-800">{fromUser?.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-400 font-mono">{truncateWallet(request.fromWallet)}</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1 bg-white rounded-lg p-3 border border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">To</p>
                              <p className="font-semibold text-slate-800">{toUser?.name || 'Unknown'}</p>
                              <p className="text-xs text-slate-400 font-mono">{truncateWallet(request.toWallet)}</p>
                            </div>
                          </div>
                          
                          {/* Bank/Loan Info */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">Bank</p>
                              <p className="font-semibold text-slate-800">{request.bankName}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">Loan Amount</p>
                              <p className="font-semibold text-slate-800">₹{request.loanAmount.toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* NOC Document Download */}
                          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                            <p className="text-xs text-slate-600 font-semibold mb-3">Bank NOC Document</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-50 rounded-lg p-3">
                                <p className="font-medium text-slate-800 text-sm">{request.nocFileName || 'NOC Document'}</p>
                                <p className="text-xs text-slate-500 font-mono mt-1">
                                  Hash: {request.nocDocumentHash.substring(0, 16)}...{request.nocDocumentHash.slice(-8)}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  // Create download link from base64 data
                                  const link = document.createElement('a');
                                  const mimeType = request.nocFileType || 'application/pdf';
                                  link.href = `data:${mimeType};base64,${request.nocFileData}`;
                                  link.download = request.nocFileName || `NOC_${request.requestID}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                View NOC
                              </button>
                            </div>
                          </div>
                          
                          {/* Document Hashes */}
                          <div className="bg-slate-100 rounded-lg p-3 mb-4">
                            <p className="text-xs text-slate-600 font-semibold mb-2">Document Verification Hashes</p>
                            <div className="space-y-1 text-xs">
                              <p className="font-mono text-slate-500">
                                NOC: {request.nocDocumentHash.substring(0, 24)}...
                              </p>
                              <p className="font-mono text-slate-500">
                                Agreement: {request.saleAgreementHash.substring(0, 24)}...
                              </p>
                            </div>
                          </div>
                          
                          {/* Approval Notice */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                            <p className="text-xs text-emerald-700">
                              <strong>Upon approval:</strong> The loan will be cleared and ownership will be transferred to {toUser?.name || 'the recipient'}.
                            </p>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <button 
                              onClick={() => approveNOCTransfer(request.requestID)}
                              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Approve & Transfer
                            </button>
                            <button 
                              onClick={() => {
                                const reason = prompt('Enter rejection reason:');
                                if (reason) {
                                  rejectNOCTransfer(request.requestID, reason);
                                  setNocRejectReason('');
                                }
                              }}
                              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Register User */}
          {activeTab === 'users' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-indigo-600" />
                Register New User via Aadhaar
              </h3>
              
              {registeredUserWallet && (
                <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> User Registered Successfully
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Wallet Address</p>
                          <p className="font-mono text-sm text-slate-800">{truncateWallet(registeredUserWallet.address)}</p>
                        </div>
                        <button onClick={() => copyToClipboard(registeredUserWallet.address, 'addr')} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors">
                          {copiedField === 'addr' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Private Key</p>
                          <p className="font-mono text-sm text-slate-800">{truncateWallet(registeredUserWallet.privateKey)}</p>
                        </div>
                        <button onClick={() => copyToClipboard(registeredUserWallet.privateKey, 'key')} className="p-2 hover:bg-emerald-100 rounded-lg transition-colors">
                          {copiedField === 'key' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-700 font-medium">⚠️ IMPORTANT: Save the private key securely. It will NOT be shown again!</p>
                    </div>
                  </div>
                </div>
              )}

              {userError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{userError}</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input type="text" value={userForm.name} onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="Enter full name as per Aadhaar" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Aadhaar Number</label>
                  <input type="text" value={userForm.aadhaarNumber} onChange={(e) => setUserForm(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono bg-slate-50 focus:bg-white transition-colors" placeholder="1234 5678 9012" maxLength={12} />
                  <p className="text-xs text-slate-400 mt-1">12-digit Aadhaar number</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                  <input type="tel" value={userForm.phone} onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="+91-9876543210" />
                </div>
                <button onClick={handleRegisterUser} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3.5 font-semibold transition-colors shadow-lg shadow-indigo-200">Register User</button>
              </div>
            </div>
          )}

          {/* Register Property */}
          {activeTab === 'properties' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Register New Property
              </h3>
              
              {registeredProperty && (
                <div className="mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h4 className="font-semibold text-emerald-800 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Property Registered</h4>
                  <p className="text-sm text-emerald-700 mt-1">Property ID: <code className="font-mono bg-white px-2 py-0.5 rounded">{registeredProperty}</code></p>
                </div>
              )}

              {propertyError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{propertyError}</div>}

              <div className="space-y-4">
                {/* Owner Search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Property Owner *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={propertyForm.selectedOwner ? propertyForm.selectedOwner.name : propertyForm.ownerSearch} onChange={(e) => handleOwnerSearch(e.target.value)} className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="Search by name or Aadhaar..." />
                  </div>
                  {ownerSuggestions.length > 0 && !propertyForm.selectedOwner && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                      {ownerSuggestions.map(user => (
                        <button key={user.userID} onClick={() => { setPropertyForm(prev => ({ ...prev, selectedOwner: user, ownerSearch: '' })); setOwnerSuggestions([]); }} className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex justify-between items-center border-b border-slate-100 last:border-0">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{user.aadhaarNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {propertyForm.selectedOwner && (
                    <div className="mt-2 p-3 bg-indigo-50 rounded-xl flex justify-between items-center border border-indigo-100">
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">{propertyForm.selectedOwner.name}</p>
                        <p className="text-xs text-indigo-600 font-mono">{truncateWallet(propertyForm.selectedOwner.walletAddress)}</p>
                      </div>
                      <button onClick={() => setPropertyForm(prev => ({ ...prev, selectedOwner: null, ownerSearch: '' }))} className="text-red-500 hover:text-red-700 p-1"><XCircle className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>

                {/* Previous Owner */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Previous Owner (optional)</label>
                  <input type="text" value={propertyForm.selectedPreviousOwner ? propertyForm.selectedPreviousOwner.name : propertyForm.previousOwnerSearch} onChange={(e) => handlePreviousOwnerSearch(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="Search previous owner..." />
                  {previousOwnerSuggestions.length > 0 && !propertyForm.selectedPreviousOwner && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-auto">
                      {previousOwnerSuggestions.map(user => (
                        <button key={user.userID} onClick={() => { setPropertyForm(prev => ({ ...prev, selectedPreviousOwner: user, previousOwnerSearch: '' })); setPreviousOwnerSuggestions([]); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{user.aadhaarNumber}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {propertyForm.selectedPreviousOwner && (
                    <div className="mt-2 p-3 bg-slate-100 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">{propertyForm.selectedPreviousOwner.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{truncateWallet(propertyForm.selectedPreviousOwner.walletAddress)}</p>
                      </div>
                      <button onClick={() => setPropertyForm(prev => ({ ...prev, selectedPreviousOwner: null, previousOwnerSearch: '' }))} className="text-red-500 hover:text-red-700 p-1"><XCircle className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Location / Address *</label>
                  <input type="text" value={propertyForm.location} onChange={(e) => setPropertyForm(prev => ({ ...prev, location: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="Full address" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Survey Number *</label>
                    <input type="text" value={propertyForm.surveyNumber} onChange={(e) => setPropertyForm(prev => ({ ...prev, surveyNumber: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="SRV-123" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Area (m²) *</label>
                    <input type="number" value={propertyForm.areaSquareMeters} onChange={(e) => setPropertyForm(prev => ({ ...prev, areaSquareMeters: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="5000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Longitude *</label>
                    <input type="number" step="0.0001" value={propertyForm.centerLng} onChange={(e) => setPropertyForm(prev => ({ ...prev, centerLng: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="77.5946" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Latitude *</label>
                    <input type="number" step="0.0001" value={propertyForm.centerLat} onChange={(e) => setPropertyForm(prev => ({ ...prev, centerLat: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors" placeholder="12.9716" />
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700">
                  <strong>Auto-generated:</strong> Boundary polygon, document hashes, wallet mappings, and ledger entries will be created automatically.
                </div>

                <button onClick={handleRegisterProperty} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3.5 font-semibold transition-colors shadow-lg shadow-indigo-200">Register Property</button>
              </div>
            </div>
          )}

          {/* Update Loan Status */}
          {activeTab === 'loan' && (
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-600" />
                Update Property Loan Status
              </h3>
              
              {loanSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Loan status updated successfully!</div>}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Property</label>
                  <select value={loanForm.propertyID} onChange={(e) => setLoanForm(prev => ({ ...prev, propertyID: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors">
                    <option value="">Choose property...</option>
                    {properties.filter(p => p.status === 'active').map(p => {
                      const owner = getUserByWallet(p.currentOwnerWallet);
                      return <option key={p.propertyID} value={p.propertyID}>{p.propertyID} - {owner?.name || 'Unknown'}</option>;
                    })}
                  </select>
                </div>

                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" checked={loanForm.isUnderLoan} onChange={(e) => setLoanForm(prev => ({ ...prev, isUnderLoan: e.target.checked }))} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500" />
                  <span className="text-sm font-medium text-slate-700">Property is under loan</span>
                </label>

                {loanForm.isUnderLoan && (
                  <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Loan Amount (₹)</label>
                        <input type="number" value={loanForm.loanAmount} onChange={(e) => setLoanForm(prev => ({ ...prev, loanAmount: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" placeholder="5000000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remaining (₹)</label>
                        <input type="number" value={loanForm.remainingAmount} onChange={(e) => setLoanForm(prev => ({ ...prev, remainingAmount: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" placeholder="3500000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Loan Provider</label>
                      <input type="text" value={loanForm.loanProvider} onChange={(e) => setLoanForm(prev => ({ ...prev, loanProvider: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" placeholder="State Bank of India" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Years Left</label>
                        <input type="number" value={loanForm.remainingYears} onChange={(e) => setLoanForm(prev => ({ ...prev, remainingYears: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" placeholder="10" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Monthly EMI (₹)</label>
                        <input type="number" value={loanForm.monthlyEMI} onChange={(e) => setLoanForm(prev => ({ ...prev, monthlyEMI: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white" placeholder="45000" />
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={handleUpdateLoan} disabled={!loanForm.propertyID} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3.5 font-semibold transition-colors shadow-lg shadow-indigo-200 disabled:shadow-none">Update Loan Status</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
