import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight, Building2, User, CheckCircle, AlertCircle, Scissors,
  Shield, Fingerprint, Search, MapPin, Wallet, FileWarning, Upload,
  AlertTriangle, Clock, Landmark, FileText, X
} from 'lucide-react';
import { useStore } from '../store';
import type { GeoPolygon } from '../types';
import { signDataAsync, verifySignature, getUserPrivateKey, sha256 } from '../utils/crypto';

interface TransferPropertyPageProps {
  onNavigate: (page: string) => void;
}

export function TransferPropertyPage({ onNavigate }: TransferPropertyPageProps) {
  const { 
    currentUser, properties, users, 
    directTransferProperty, initiateSubdivision, submitNOCTransferRequest
  } = useStore();
  
  const [mode, setMode] = useState<'transfer' | 'subdivide'>('transfer');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [buyerWallet, setBuyerWallet] = useState('');
  const [agreementContent, setAgreementContent] = useState('');
  const [nocDocument, setNocDocument] = useState('');
  const [nocFileName, setNocFileName] = useState('');
  const [nocFileHash, setNocFileHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // File input ref
  const nocFileInputRef = useRef<HTMLInputElement>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Subdivision state
  const [numParcels, setNumParcels] = useState(2);
  const [surveyContent, setSurveyContent] = useState('');

  // Check if selected property is under loan
  const selectedPropertyData = properties.find(p => p.propertyID === selectedProperty);
  const isPropertyUnderLoan = selectedPropertyData?.loanInfo?.isUnderLoan || false;

  // Reset states when mode changes
  useEffect(() => {
    setError('');
    setSuccess('');
    setShowTransferConfirm(false);
    setNocDocument('');
    setNocFileName('');
    setNocFileHash('');
  }, [mode, selectedProperty]);

  // Handle NOC file upload
  const handleNocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload PDF, JPG, or PNG files only.');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum file size is 10MB.');
      return;
    }
    
    try {
      // Read file content and generate hash
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array).map(b => String.fromCharCode(b)).join('');
      const base64Content = btoa(binaryString);
      const fileHash = sha256(base64Content);
      
      setNocFileName(file.name);
      setNocFileHash(fileHash);
      setNocDocument(base64Content);
      setError('');
    } catch (err) {
      setError('Failed to read file. Please try again.');
    }
  };

  // Remove uploaded NOC file
  const handleRemoveNocFile = () => {
    setNocDocument('');
    setNocFileName('');
    setNocFileHash('');
    if (nocFileInputRef.current) {
      nocFileInputRef.current.value = '';
    }
  };

  // Derive private key seamlessly from user credentials
  const userPrivateKey = useMemo(() => {
    if (currentUser?.userID && currentUser?.aadhaarNumber) {
      return getUserPrivateKey(currentUser.userID, currentUser.aadhaarNumber);
    }
    return null;
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Authentication Required</h2>
          <p className="text-slate-500 mb-6">Please log in to access property transactions</p>
          <button 
            onClick={() => onNavigate('login')} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const myProperties = properties.filter(
    p => p.currentOwnerWallet === currentUser.walletAddress && p.status === 'active'
  );

  const buyerWalletTrimmed = buyerWallet.trim().toLowerCase();
  const buyerSuggestions = users.filter(
    user =>
      user.walletAddress !== currentUser.walletAddress &&
      buyerWalletTrimmed.length > 2 &&
      (user.walletAddress.toLowerCase().includes(buyerWalletTrimmed) ||
       user.name.toLowerCase().includes(buyerWalletTrimmed))
  );
  const matchedBuyer = users.find(
    user =>
      user.walletAddress !== currentUser.walletAddress &&
      user.walletAddress.toLowerCase() === buyerWalletTrimmed
  );

  const isSelfTransfer = buyerWalletTrimmed === currentUser.walletAddress.toLowerCase();

  const validateTransferInput = () => {
    if (!selectedProperty) {
      setError('Please select a property to transfer');
      return false;
    }
    if (!buyerWalletTrimmed) {
      setError('Please enter the recipient wallet address');
      return false;
    }
    if (isSelfTransfer) {
      setError('You cannot transfer property to yourself');
      return false;
    }
    if (!agreementContent.trim()) {
      setError('Please provide sale agreement details');
      return false;
    }
    if (!matchedBuyer) {
      setError('Recipient wallet address not found in registry. Please select from suggestions.');
      return false;
    }
    
    // Additional validation for properties under loan
    if (isPropertyUnderLoan && !nocDocument.trim()) {
      setError('This property is under loan. Please upload the Bank NOC document.');
      return false;
    }
    
    if (!userPrivateKey) {
      setError('Unable to derive wallet credentials. Please contact support.');
      return false;
    }

    setError('');
    return true;
  };

  const handleDirectTransfer = async () => {
    if (!validateTransferInput() || !matchedBuyer || !userPrivateKey) return;

    setIsSubmitting(true);
    setError('');

    try {
      const transactionPayload = JSON.stringify({
        action: 'TRANSFER_PROPERTY',
        propertyID: selectedProperty,
        fromWallet: currentUser.walletAddress,
        toWallet: matchedBuyer.walletAddress,
        timestamp: Date.now()
      });

      const { signature, signerAddress } = await signDataAsync(transactionPayload, userPrivateKey);
      
      if (signerAddress.toLowerCase() !== currentUser.walletAddress.toLowerCase()) {
        throw new Error('Wallet signature mismatch. Transfer rejected.');
      }

      const isValid = verifySignature(transactionPayload, signature, currentUser.walletAddress);
      if (!isValid) {
        throw new Error('Signature verification failed. Transfer rejected.');
      }

      directTransferProperty(
        selectedProperty,
        matchedBuyer.walletAddress,
        agreementContent,
        signature
      );

      setSuccess(`Transfer completed successfully! Property ${selectedProperty} has been transferred to ${matchedBuyer.name}.`);
      
      setTimeout(() => onNavigate('dashboard'), 3000);
    } catch (err: any) {
      setError(err.message || 'Transfer failed. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleNOCTransfer = async () => {
    if (!validateTransferInput() || !matchedBuyer) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = submitNOCTransferRequest(
        selectedProperty,
        matchedBuyer.walletAddress,
        {
          fileName: nocFileName,
          fileType: nocFileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
          fileData: nocDocument,
          hash: nocFileHash
        },
        agreementContent
      );

      if ('error' in result) {
        throw new Error(result.error);
      }

      setSuccess(
        `NOC Transfer Request submitted successfully! Request ID: ${result.requestID}. ` +
        `The authority will verify your Bank NOC and process the transfer. ` +
        `The property will be transferred to ${matchedBuyer.name} once approved.`
      );
      
      setTimeout(() => onNavigate('dashboard'), 4000);
    } catch (err: any) {
      setError(err.message || 'NOC Transfer request failed. Please try again.');
    }

    setIsSubmitting(false);
  };

  const handleInitiateTransfer = () => {
    if (!validateTransferInput()) return;
    setShowTransferConfirm(true);
  };

  const handlePasskeyAuthenticateAndTransfer = async () => {
    setIsAuthenticating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsAuthenticating(false);
    setShowTransferConfirm(false);
    
    // Route to appropriate transfer method
    if (isPropertyUnderLoan) {
      await handleNOCTransfer();
    } else {
      await handleDirectTransfer();
    }
  };

  const handleSubdivision = async () => {
    if (!selectedProperty) {
      setError('Please select a property to subdivide');
      return;
    }
    if (!surveyContent.trim()) {
      setError('Please provide survey document details');
      return;
    }

    const property = properties.find(p => p.propertyID === selectedProperty);
    if (!property) {
      setError('Property not found');
      return;
    }

    setIsSubmitting(true);
    setError('');

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const coords = property.boundaryPolygon.coordinates[0];
      const minLng = Math.min(...coords.map(c => c[0]));
      const maxLng = Math.max(...coords.map(c => c[0]));
      const minLat = Math.min(...coords.map(c => c[1]));
      const maxLat = Math.max(...coords.map(c => c[1]));
      
      const latStep = (maxLat - minLat) / numParcels;
      
      const childPolygons: GeoPolygon[] = [];
      for (let i = 0; i < numParcels; i++) {
        childPolygons.push({
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat + i * latStep],
            [maxLng, minLat + i * latStep],
            [maxLng, minLat + (i + 1) * latStep],
            [minLng, minLat + (i + 1) * latStep],
            [minLng, minLat + i * latStep]
          ]]
        });
      }

      const result = initiateSubdivision(selectedProperty, childPolygons, surveyContent);
      
      if ('error' in result) {
        setError(result.error);
      } else {
        setSuccess(`Subdivision request submitted successfully! Action ID: ${result.actionID}. Awaiting authority approval.`);
        setTimeout(() => onNavigate('dashboard'), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Subdivision failed');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Property Transactions</h1>
        <p className="text-slate-500">Transfer ownership or subdivide your registered properties</p>
      </div>

      {/* Wallet Status */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">Wallet Connected</p>
            <p className="text-sm text-emerald-600 font-mono">
              {currentUser.walletAddress.substring(0, 14)}...{currentUser.walletAddress.slice(-8)}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Ready</span>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('transfer')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            mode === 'transfer' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          Transfer Ownership
        </button>
        <button
          onClick={() => setMode('subdivide')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
            mode === 'subdivide' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Scissors className="w-4 h-4" />
          Subdivide Property
        </button>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <p className="text-emerald-700 text-sm font-medium">{success}</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Transfer Mode */}
          {mode === 'transfer' && !showTransferConfirm && (
            <div className="space-y-6">
              {/* Property Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Property to Transfer
                </label>
                {myProperties.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No Properties Found</p>
                    <p className="text-sm text-slate-400 mt-1">You don't own any active properties</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myProperties.map(property => (
                      <button
                        key={property.propertyID}
                        onClick={() => setSelectedProperty(property.propertyID)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          selectedProperty === property.propertyID
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedProperty === property.propertyID 
                            ? 'bg-indigo-100' 
                            : 'bg-slate-100'
                        }`}>
                          <Building2 className={`w-6 h-6 ${
                            selectedProperty === property.propertyID 
                              ? 'text-indigo-600' 
                              : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold truncate ${
                              selectedProperty === property.propertyID 
                                ? 'text-indigo-900' 
                                : 'text-slate-800'
                            }`}>
                              {property.propertyID}
                            </p>
                            {property.loanInfo?.isUnderLoan && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Landmark className="w-3 h-3" />
                                LOAN
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <p className="text-sm text-slate-500 truncate">{property.location}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            selectedProperty === property.propertyID 
                              ? 'text-indigo-900' 
                              : 'text-slate-800'
                          }`}>
                            {property.areaSquareMeters.toLocaleString()} m²
                          </p>
                        </div>
                        {selectedProperty === property.propertyID && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Loan Warning - Show when property under loan is selected */}
              {isPropertyUnderLoan && selectedPropertyData && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileWarning className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-800 text-lg">Property Under Loan</h3>
                      <p className="text-amber-700 mt-1 text-sm">
                        This property has an active loan. Direct transfer is <strong>blocked</strong>.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-amber-600 font-medium">Lender</p>
                          <p className="text-amber-900 font-semibold">{selectedPropertyData.loanInfo?.loanProvider || 'Unknown'}</p>
                        </div>
                        <div className="bg-white/60 rounded-lg p-3">
                          <p className="text-amber-600 font-medium">Outstanding</p>
                          <p className="text-amber-900 font-semibold">₹{(selectedPropertyData.loanInfo?.remainingAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-amber-100 rounded-lg">
                        <p className="text-amber-800 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          To transfer this property, you must:
                        </p>
                        <ol className="mt-2 text-amber-700 text-sm space-y-1 list-decimal list-inside">
                          <li>Obtain a <strong>No Objection Certificate (NOC)</strong> from {selectedPropertyData.loanInfo?.loanProvider || 'the bank'}</li>
                          <li>Upload the NOC document below</li>
                          <li>Submit for authority verification</li>
                          <li>Upon approval, the loan will be cleared and ownership transferred</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Buyer Wallet Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Recipient Wallet Address
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={buyerWallet}
                    onChange={(e) => setBuyerWallet(e.target.value)}
                    placeholder="Enter wallet address or search by name..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                {/* Self-transfer warning */}
                {isSelfTransfer && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700">You cannot transfer property to yourself</p>
                  </div>
                )}

                {/* Suggestions */}
                {!isSelfTransfer && buyerSuggestions.length > 0 && !matchedBuyer && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Registered Users</p>
                    </div>
                    {buyerSuggestions.slice(0, 5).map(user => (
                      <button
                        key={user.userID}
                        onClick={() => setBuyerWallet(user.walletAddress)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 border-b border-slate-100 last:border-b-0 transition-colors"
                      >
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{user.walletAddress}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Matched buyer */}
                {!isSelfTransfer && matchedBuyer && (
                  <div className="mt-3 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-800">{matchedBuyer.name}</p>
                      <p className="text-xs text-emerald-600 font-mono">{matchedBuyer.walletAddress}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
              </div>

              {/* NOC Document Upload - Only for properties under loan */}
              {isPropertyUnderLoan && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Bank NOC Document <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={nocFileInputRef}
                    onChange={handleNocFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  
                  {!nocFileName ? (
                    // Upload area
                    <div
                      onClick={() => nocFileInputRef.current?.click()}
                      className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-100 transition-all"
                    >
                      <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Upload className="w-7 h-7 text-amber-600" />
                      </div>
                      <p className="font-semibold text-amber-800 mb-1">Click to upload NOC document</p>
                      <p className="text-sm text-amber-600">PDF, JPG, or PNG • Max 10MB</p>
                    </div>
                  ) : (
                    // Uploaded file display
                    <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-emerald-800 truncate">{nocFileName}</p>
                          <p className="text-xs text-emerald-600 font-mono mt-1">
                            Hash: {nocFileHash.substring(0, 16)}...{nocFileHash.slice(-8)}
                          </p>
                        </div>
                        <button
                          onClick={handleRemoveNocFile}
                          className="w-10 h-10 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors"
                        >
                          <X className="w-5 h-5 text-red-600" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>Document uploaded and hashed successfully</span>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-amber-600 mt-3">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    This document will be verified by the Land Registry Authority before the transfer is processed.
                  </p>
                </div>
              )}

              {/* Sale Agreement */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Sale Agreement Details
                </label>
                <textarea
                  value={agreementContent}
                  onChange={(e) => setAgreementContent(e.target.value)}
                  placeholder="Enter sale agreement terms, price, conditions..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Transfer Type Indicator */}
              {selectedProperty && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                  isPropertyUnderLoan 
                    ? 'bg-amber-50 border border-amber-200' 
                    : 'bg-indigo-50 border border-indigo-200'
                }`}>
                  {isPropertyUnderLoan ? (
                    <>
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-800">NOC Transfer (Authority Review)</p>
                        <p className="text-sm text-amber-600">
                          Your request will be submitted for authority verification. Transfer will be processed after NOC approval.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5 text-indigo-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-indigo-800">Direct Transfer (Instant)</p>
                        <p className="text-sm text-indigo-600">
                          Ownership will be transferred immediately upon authentication.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Transfer Button */}
              <button
                onClick={handleInitiateTransfer}
                disabled={isSubmitting || !selectedProperty || !buyerWalletTrimmed || isSelfTransfer}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-colors shadow-lg disabled:shadow-none ${
                  isPropertyUnderLoan
                    ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-amber-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-indigo-200'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : isPropertyUnderLoan ? (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit NOC Transfer Request
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Initiate Transfer
                  </>
                )}
              </button>
            </div>
          )}

          {/* Transfer Confirmation */}
          {mode === 'transfer' && showTransferConfirm && (
            <div className="space-y-6">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  isPropertyUnderLoan ? 'bg-amber-100' : 'bg-indigo-100'
                }`}>
                  <Shield className={`w-8 h-8 ${isPropertyUnderLoan ? 'text-amber-600' : 'text-indigo-600'}`} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {isPropertyUnderLoan ? 'Confirm NOC Transfer Request' : 'Confirm Transfer'}
                </h2>
                <p className="text-slate-500 mt-1">
                  {isPropertyUnderLoan 
                    ? 'This request will be sent for authority review' 
                    : 'This action is permanent and irreversible'}
                </p>
              </div>

              {/* Transfer Summary */}
              <div className="bg-slate-50 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Property</span>
                  <span className="font-semibold text-slate-800">{selectedProperty}</span>
                </div>
                {selectedPropertyData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Location</span>
                    <span className="text-sm text-slate-700">{selectedPropertyData.location}</span>
                  </div>
                )}
                {isPropertyUnderLoan && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Transfer Type</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
                      NOC REQUIRED
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">From</p>
                      <p className="font-medium text-slate-800">{currentUser.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {currentUser.walletAddress.substring(0, 14)}...
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                    <div className="flex-1 text-right">
                      <p className="text-xs text-slate-500 mb-1">To</p>
                      <p className="font-medium text-slate-800">{matchedBuyer?.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {matchedBuyer?.walletAddress.substring(0, 14)}...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className={`rounded-xl p-4 ${
                isPropertyUnderLoan 
                  ? 'bg-amber-50 border border-amber-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${isPropertyUnderLoan ? 'text-amber-800' : 'text-red-800'}`}>
                  <strong>Warning:</strong>{' '}
                  {isPropertyUnderLoan 
                    ? 'Your NOC document will be verified by the Land Registry Authority. Upon approval, the loan will be cleared and ownership will be transferred to the recipient.'
                    : 'Like a cryptocurrency transfer, this transaction will be cryptographically signed and permanently recorded on the blockchain. It cannot be reversed or undone.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasskeyAuthenticateAndTransfer}
                  disabled={isAuthenticating || isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors shadow-lg ${
                    isPropertyUnderLoan
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {isAuthenticating ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-5 h-5" />
                      Authenticate & {isPropertyUnderLoan ? 'Submit' : 'Sign'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Subdivide Mode */}
          {mode === 'subdivide' && (
            <div className="space-y-6">
              {/* Property Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Select Property to Subdivide
                </label>
                {myProperties.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No Properties Found</p>
                    <p className="text-sm text-slate-400 mt-1">You don't own any active properties</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myProperties.map(property => (
                      <button
                        key={property.propertyID}
                        onClick={() => setSelectedProperty(property.propertyID)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          selectedProperty === property.propertyID
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          selectedProperty === property.propertyID 
                            ? 'bg-indigo-100' 
                            : 'bg-slate-100'
                        }`}>
                          <Building2 className={`w-6 h-6 ${
                            selectedProperty === property.propertyID 
                              ? 'text-indigo-600' 
                              : 'text-slate-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            selectedProperty === property.propertyID 
                              ? 'text-indigo-900' 
                              : 'text-slate-800'
                          }`}>
                            {property.propertyID}
                          </p>
                          <p className="text-sm text-slate-500 truncate">{property.location}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            selectedProperty === property.propertyID 
                              ? 'text-indigo-900' 
                              : 'text-slate-800'
                          }`}>
                            {property.areaSquareMeters.toLocaleString()} m²
                          </p>
                        </div>
                        {selectedProperty === property.propertyID && (
                          <CheckCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Number of Parcels */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Number of Parcels
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={numParcels}
                  onChange={(e) => setNumParcels(parseInt(e.target.value) || 2)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-2">
                  The property will be divided into {numParcels} equal parcels
                </p>
              </div>

              {/* Survey Document */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Survey Document Details
                </label>
                <textarea
                  value={surveyContent}
                  onChange={(e) => setSurveyContent(e.target.value)}
                  placeholder="Enter survey map details, measurements, boundary descriptions..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Requirements Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 mb-2">Subdivision Requirements</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Sum of child areas must equal parent area</li>
                  <li>• Child parcels must be within parent boundary</li>
                  <li>• Child parcels must not overlap each other</li>
                  <li>• <strong>Authority approval is required</strong></li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubdivision}
                disabled={isSubmitting || !selectedProperty || !surveyContent.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-200 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Scissors className="w-5 h-5" />
                    Submit Subdivision Request
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
