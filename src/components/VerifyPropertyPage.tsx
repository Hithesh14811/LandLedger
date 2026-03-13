import { useState, useMemo } from 'react';
import {
  Search, Building2, Shield, FileCheck, AlertTriangle,
  User, MapPin, CheckCircle, Blocks, Globe,
  TrendingUp, Activity, Scale, Network, ChevronDown, ChevronUp,
  Info, Landmark
} from 'lucide-react';
import { useStore } from '../store';
import { calculateComprehensiveRisk, RiskBreakdown, FactorAnalysis } from '../utils/riskEngine';

export function VerifyPropertyPage() {
  const { properties, users, documents, ledger, encroachmentAlerts, getPropertyHistory } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [expandedFactors, setExpandedFactors] = useState<string[]>([]);

  const handleSearch = () => {
    const property = properties.find(p => 
      p.propertyID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (property) {
      setSelectedProperty(property.propertyID);
    }
  };

  const property = selectedProperty ? properties.find(p => p.propertyID === selectedProperty) : null;
  const owner = property ? users.find(u => u.walletAddress === property.currentOwnerWallet) : null;
  const propertyDocs = property ? documents.filter(d => d.propertyID === property.propertyID) : [];
  const history = property ? getPropertyHistory(property.propertyID) : [];
  
  const riskAnalysis: RiskBreakdown | null = useMemo(() => {
    if (!property) return null;
    return calculateComprehensiveRisk(property, ledger, encroachmentAlerts, documents, users);
  }, [property, ledger, encroachmentAlerts, documents, users]);

  const ownershipNodes = property
    ? history
        .filter(block => 
          block.transactionType === 'REGISTER_PROPERTY' || 
          block.transactionType === 'TRANSFER_PROPERTY' ||
          block.transactionType === 'TRANSFER_WITH_NOC'
        )
        .sort((a, b) => a.timestamp - b.timestamp)
        .reduce<string[]>((wallets, block) => {
          if (block.transactionType === 'REGISTER_PROPERTY' && block.transactionData.toWallet) {
            if (wallets[wallets.length - 1] !== block.transactionData.toWallet) {
              wallets.push(block.transactionData.toWallet);
            }
          }
          if (
            (block.transactionType === 'TRANSFER_PROPERTY' || block.transactionType === 'TRANSFER_WITH_NOC')
          ) {
            if (wallets.length === 0 && block.transactionData.fromWallet) {
              wallets.push(block.transactionData.fromWallet);
            }
            if (block.transactionData.toWallet) {
              wallets.push(block.transactionData.toWallet);
            }
          }
          return wallets;
        }, [])
    : [];

  const toggleFactor = (factor: string) => {
    setExpandedFactors(prev => 
      prev.includes(factor) ? prev.filter(f => f !== factor) : [...prev, factor]
    );
  };

  const getRiskLevelStyle = (level: string) => {
    switch (level) {
      case 'LOW': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
      case 'MEDIUM': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
      case 'HIGH': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' };
      case 'CRITICAL': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
      default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    if (score >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusStyle = (status: string) => {
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFactorIcon = (factorName: string) => {
    switch (factorName) {
      case 'ownershipStability': return <TrendingUp className="w-5 h-5" />;
      case 'documentIntegrity': return <FileCheck className="w-5 h-5" />;
      case 'legalStanding': return <Scale className="w-5 h-5" />;
      case 'boundaryIntegrity': return <Globe className="w-5 h-5" />;
      case 'transactionPatterns': return <Activity className="w-5 h-5" />;
      case 'networkAnalysis': return <Network className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getFactorLabel = (factorName: string) => {
    switch (factorName) {
      case 'ownershipStability': return 'Ownership Stability';
      case 'documentIntegrity': return 'Document Integrity';
      case 'legalStanding': return 'Legal Standing';
      case 'boundaryIntegrity': return 'Boundary Integrity';
      case 'transactionPatterns': return 'Transaction Patterns';
      case 'networkAnalysis': return 'Network Analysis';
      default: return factorName;
    }
  };

  const renderFactorCard = (factorName: string, factor: FactorAnalysis) => {
    const isExpanded = expandedFactors.includes(factorName);
    
    return (
      <div key={factorName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => toggleFactor(factorName)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-slate-100 ${getScoreColor(factor.score)}`}>
              {getFactorIcon(factorName)}
            </div>
            <div className="text-left">
              <p className="text-slate-900 font-semibold">{getFactorLabel(factorName)}</p>
              <p className="text-xs text-slate-400">Weight: {factor.weight}%</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className={`text-xl font-bold ${getScoreColor(factor.score)}`}>{factor.score}</p>
            </div>
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${getScoreBgColor(factor.score)} transition-all`} style={{ width: `${factor.score}%` }} />
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpanded ? 'bg-indigo-100' : 'bg-slate-100'}`}>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </div>
          </div>
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-4 bg-slate-50">
            <div className="space-y-2">
              {factor.indicators.map((indicator, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-slate-800">{indicator.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                          indicator.severity === 'critical' ? 'bg-red-500 text-white' :
                          indicator.severity === 'high' ? 'bg-orange-500 text-white' :
                          indicator.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                        }`}>{indicator.severity}</span>
                      </div>
                      <p className="text-xs text-slate-500">{indicator.description}</p>
                    </div>
                    <p className={`font-mono text-sm font-bold ${
                      indicator.impact === 'positive' ? 'text-emerald-600' :
                      indicator.impact === 'negative' ? 'text-red-600' : 'text-slate-600'
                    }`}>{indicator.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
          <Shield className="w-4 h-4" />
          Public Verification
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Verify Property Ownership</h1>
        <p className="text-slate-500">
          Search any property by ID or address to verify ownership, view transaction history,
          and check document integrity. No login required.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-xl mx-auto">
        <div className="relative bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter Property ID or address..."
            className="w-full pl-14 pr-28 py-4 text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
          >
            Search
          </button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2 justify-center items-center">
          <span className="text-sm text-slate-400">Quick search:</span>
          {properties.slice(0, 3).map(p => (
            <button key={p.propertyID} onClick={() => setSelectedProperty(p.propertyID)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">{p.propertyID}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {property && riskAnalysis && (() => {
        const riskStyle = getRiskLevelStyle(riskAnalysis.riskLevel);
        return (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Header Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">{property.propertyID}</h2>
                          <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <MapPin className="w-4 h-4" />
                            {property.location}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusStyle(property.status)}`}>
                        {property.status.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${riskStyle.bg} ${riskStyle.border} ${riskStyle.text}`}>
                        {riskAnalysis.riskLevel} RISK
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50">
                  <div><p className="text-xs text-slate-400 mb-1">Area</p><p className="text-slate-900 font-semibold">{property.areaSquareMeters.toLocaleString()} m²</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Registered</p><p className="text-slate-900 font-semibold">{formatDate(property.registeredAt)}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Transfers</p><p className="text-slate-900 font-semibold">{property.transferCount}</p></div>
                  <div><p className="text-xs text-slate-400 mb-1">Disputes</p><p className="text-slate-900 font-semibold">{property.disputes}</p></div>
                </div>
              </div>

              {/* Loan Warning */}
              {property.loanInfo?.isUnderLoan && (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-300 p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-7 h-7 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-800 mb-2">⚠️ Loan Encumbrance Warning</h3>
                      <p className="text-red-700 mb-4 text-sm">
                        This property is currently under a bank loan. Any transaction requires clearance from the lending institution.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white/80 rounded-xl p-4 border border-red-200">
                        {property.loanInfo.loanProvider && <div><p className="text-xs text-slate-500">Bank</p><p className="text-slate-900 font-semibold">{property.loanInfo.loanProvider}</p></div>}
                        {property.loanInfo.remainingAmount && <div><p className="text-xs text-slate-500">Outstanding</p><p className="text-red-600 font-bold">₹{property.loanInfo.remainingAmount.toLocaleString()}</p></div>}
                        {property.loanInfo.remainingYears && <div><p className="text-xs text-slate-500">Years Left</p><p className="text-slate-900 font-semibold">{property.loanInfo.remainingYears} years</p></div>}
                        {property.loanInfo.monthlyEMI && <div><p className="text-xs text-slate-500">EMI</p><p className="text-slate-900 font-semibold">₹{property.loanInfo.monthlyEMI.toLocaleString()}/mo</p></div>}
                      </div>
                      <div className="mt-4 p-3 bg-red-100 rounded-xl">
                        <p className="text-xs text-red-800 font-medium">⚠️ Transfer requires bank NOC (No Objection Certificate)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Owner */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Current Owner
                </h3>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                  <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 font-semibold text-lg">{owner?.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500 font-mono">{property.currentOwnerWallet}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
              </div>

              {/* Ownership Chain */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Blocks className="w-5 h-5 text-indigo-600" />
                  Ownership Chain
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {(ownershipNodes.length > 0 ? ownershipNodes : [property.currentOwnerWallet]).map((wallet, index, arr) => {
                    const nodeUser = users.find(u => u.walletAddress === wallet);
                    const isCurrent = index === arr.length - 1;
                    return (
                      <div key={`${wallet}-${index}`} className="flex items-center gap-3">
                        <div className={`px-4 py-3 rounded-xl border-2 ${
                          isCurrent ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                        }`}>
                          <p className={`text-sm font-semibold ${isCurrent ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {nodeUser?.name || 'Unknown'}
                            {isCurrent && <span className="ml-2 text-xs text-emerald-600">(Current)</span>}
                          </p>
                          <p className="text-xs font-mono text-slate-400">{wallet.substring(0, 10)}...{wallet.substring(wallet.length - 6)}</p>
                        </div>
                        {!isCurrent && <span className="text-slate-400 text-xl">→</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-600" />
                    Risk Analysis
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span>Confidence: {riskAnalysis.confidence}%</span>
                  </div>
                </div>

                {/* Overall Score */}
                <div className={`p-6 rounded-2xl border-2 mb-6 ${riskStyle.bg} ${riskStyle.border}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm ${riskStyle.text} opacity-80 mb-1`}>Overall Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${riskStyle.text}`}>{riskAnalysis.overallScore}</span>
                        <span className={`text-xl ${riskStyle.text} opacity-60`}>/ 100</span>
                      </div>
                    </div>
                    {riskAnalysis.riskLevel === 'LOW' ? <CheckCircle className={`w-16 h-16 ${riskStyle.text} opacity-30`} /> : <AlertTriangle className={`w-16 h-16 ${riskStyle.text} opacity-30`} />}
                  </div>
                </div>

                {/* Risk Flags */}
                {riskAnalysis.flags.length > 0 && (
                  <div className="mb-6 space-y-2">
                    {riskAnalysis.flags.map((flag, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${flag.type === 'CRITICAL' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-start gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${flag.type === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>{flag.type}</span>
                          <div>
                            <p className={`font-medium text-sm ${flag.type === 'CRITICAL' ? 'text-red-800' : 'text-orange-800'}`}>{flag.message}</p>
                            <p className="text-xs text-slate-600 mt-1">{flag.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Factor Breakdown */}
                <div className="space-y-3">
                  {Object.entries(riskAnalysis.factors).map(([factorName, factor]) => renderFactorCard(factorName, factor))}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  Verified Documents
                </h3>
                {propertyDocs.length === 0 ? (
                  <p className="text-slate-400">No documents found</p>
                ) : (
                  <div className="space-y-3">
                    {propertyDocs.map(doc => (
                      <div key={doc.documentID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-5 h-5 text-emerald-600" />
                          <div>
                            <p className="text-slate-800 font-medium">{doc.documentType.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-400 font-mono">Hash: {doc.documentHash.substring(0, 24)}...</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">IPFS CID</p>
                          <p className="text-xs text-indigo-600 font-mono">{doc.ipfsCID.substring(0, 16)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-emerald-700">All documents verified with SHA-256 hashes on IPFS</p>
                </div>
              </div>

              {/* Boundary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Property Boundary (GeoJSON)
                </h3>
                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-slate-400 font-mono">{JSON.stringify(property.boundaryPolygon, null, 2)}</pre>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Loan Alert */}
              {property.loanInfo?.isUnderLoan && (
                <div className="bg-red-50 rounded-2xl border-2 border-red-300 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <h3 className="font-bold text-red-800">LOAN ACTIVE</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {property.loanInfo.remainingAmount && <div className="flex justify-between"><span className="text-slate-600">Outstanding:</span><span className="text-red-600 font-bold">₹{property.loanInfo.remainingAmount.toLocaleString()}</span></div>}
                    {property.loanInfo.remainingYears && <div className="flex justify-between"><span className="text-slate-600">Years Left:</span><span className="text-slate-900">{property.loanInfo.remainingYears}</span></div>}
                    {property.loanInfo.loanProvider && <div className="flex justify-between"><span className="text-slate-600">Bank:</span><span className="text-slate-900 text-xs">{property.loanInfo.loanProvider}</span></div>}
                  </div>
                </div>
              )}

              {/* Risk Summary */}
              <div className={`rounded-2xl border-2 p-6 ${riskStyle.bg} ${riskStyle.border}`}>
                <h3 className={`font-semibold mb-4 flex items-center gap-2 ${riskStyle.text}`}>
                  {riskAnalysis.riskLevel === 'LOW' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  Risk Summary
                </h3>
                <div className={`text-4xl font-bold mb-2 ${riskStyle.text}`}>{riskAnalysis.overallScore}/100</div>
                <p className={`text-sm ${riskStyle.text}`}>{riskAnalysis.riskLevel} Risk</p>
                <div className="mt-4 space-y-2 text-sm">
                  {Object.entries(riskAnalysis.factors).map(([key, factor]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-slate-600">{getFactorLabel(key)}</span>
                      <span className={`font-semibold ${getScoreColor(factor.score)}`}>{factor.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction History */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Blocks className="w-5 h-5 text-indigo-600" />
                  History
                </h3>
                {history.length === 0 ? <p className="text-slate-400 text-sm">No history</p> : (
                  <div className="space-y-4">
                    {history.map((block) => (
                      <div key={block.index} className="relative pl-5 pb-4 border-l-2 border-slate-200 last:border-0">
                        <div className="absolute left-0 top-1 w-2.5 h-2.5 -translate-x-[5.5px] rounded-full bg-indigo-500" />
                        <p className="text-sm font-medium text-slate-800">{block.transactionType.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-400">Block #{block.index}</p>
                        <p className="text-xs text-slate-400">{formatDate(block.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Badge */}
              <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 p-6 text-center">
                <Landmark className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-slate-900 font-semibold mb-2">Verified Property</h3>
                <p className="text-sm text-slate-500">
                  Verified on LandLedger with {history.length} recorded transactions.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {!property && searchQuery && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No property found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
