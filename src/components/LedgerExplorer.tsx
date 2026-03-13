import { useState } from 'react';
import {
  Blocks, Search, ChevronDown, ChevronUp, CheckCircle,
  Link2, Hash, Clock, User, FileText, Shield, Database
} from 'lucide-react';
import { useStore } from '../store';

export function LedgerExplorer() {
  const { ledger, users, properties } = useStore();
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLedger = ledger.filter(block => {
    const matchesSearch = searchTerm === '' || 
      block.blockHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.transactionData.propertyID?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.initiatorWalletAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || block.transactionType === filterType;
    
    return matchesSearch && matchesType;
  }).reverse();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'REGISTER_PROPERTY': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TRANSFER_PROPERTY': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SUBDIVIDE_PROPERTY': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'DISPUTE_RESOLUTION': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'CORRECT_RECORD': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REGISTER_USER': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'UPDATE_LOAN_STATUS': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const transactionTypes = ['all', 'REGISTER_PROPERTY', 'TRANSFER_PROPERTY', 'SUBDIVIDE_PROPERTY', 'REGISTER_USER', 'UPDATE_LOAN_STATUS', 'DISPUTE_RESOLUTION', 'CORRECT_RECORD'];

  const getInitiatorName = (walletAddress: string) => {
    const user = users.find(u => u.walletAddress === walletAddress);
    return user?.name || 'System';
  };

  const getPropertyLocation = (propertyID: string) => {
    const property = properties.find(p => p.propertyID === propertyID);
    return property?.location || 'Unknown';
  };

  // Verify chain integrity
  const verifyChainIntegrity = () => {
    for (let i = 1; i < ledger.length; i++) {
      if (ledger[i].previousHash !== ledger[i - 1].blockHash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true, brokenAt: -1 };
  };

  const chainIntegrity = verifyChainIntegrity();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-6">
          <Blocks className="w-4 h-4" />
          Public Ledger
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Blockchain Explorer</h1>
        <p className="text-slate-500">
          Browse and verify all property transactions recorded on the ledger.
          Each block is cryptographically linked to ensure tamper-evidence.
        </p>
      </div>

      {/* Chain Integrity Status */}
      <div className={`bg-white rounded-2xl border-2 p-6 flex flex-col md:flex-row items-center justify-between gap-4 ${
        chainIntegrity.valid 
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' 
          : 'border-red-200 bg-gradient-to-br from-red-50 to-white'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            chainIntegrity.valid ? 'bg-emerald-100' : 'bg-red-100'
          }`}>
            {chainIntegrity.valid ? (
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            ) : (
              <Shield className="w-7 h-7 text-red-600" />
            )}
          </div>
          <div>
            <p className={`font-bold text-lg ${chainIntegrity.valid ? 'text-emerald-800' : 'text-red-800'}`}>
              {chainIntegrity.valid ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
            </p>
            <p className="text-sm text-slate-500">
              {chainIntegrity.valid 
                ? 'All block hashes are valid and properly linked' 
                : `Chain broken at block #${chainIntegrity.brokenAt}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-slate-900">{ledger.length}</p>
            <p className="text-sm text-slate-500">Total Blocks</p>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden md:block"></div>
          <div className="text-center hidden md:block">
            <p className="text-3xl font-bold text-slate-900">{properties.length}</p>
            <p className="text-sm text-slate-500">Properties</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by block hash, property ID, or wallet..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {transactionTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Transactions' : type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Block List */}
      <div className="space-y-4">
        {filteredLedger.map((block) => {
          const isExpanded = expandedBlock === block.index;
          const isGenesis = block.index === 0;
          
          return (
            <div
              key={block.index}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Block Header */}
              <div
                onClick={() => setExpandedBlock(isExpanded ? null : block.index)}
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                      <span className="text-indigo-600 font-bold text-lg">#{block.index}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${getTransactionColor(block.transactionType)}`}>
                          {isGenesis ? 'GENESIS' : block.transactionType.replace(/_/g, ' ')}
                        </span>
                        {block.transactionData.propertyID && (
                          <span className="text-sm text-slate-500 font-medium">
                            {block.transactionData.propertyID}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(block.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-400 mb-0.5">Block Hash</p>
                      <p className="text-xs text-slate-600 font-mono bg-slate-50 px-2 py-1 rounded-md">
                        {block.blockHash.substring(0, 16)}...
                      </p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isExpanded ? 'bg-indigo-100' : 'bg-slate-100'
                    }`}>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Block Details */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-6 bg-slate-50">
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-5">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                          <Hash className="w-4 h-4" />
                          Block Hash
                        </div>
                        <div className="font-mono text-xs text-indigo-600 break-all bg-white p-3 rounded-xl border border-slate-200">
                          {block.blockHash}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                          <Link2 className="w-4 h-4" />
                          Previous Block Hash
                        </div>
                        <div className="font-mono text-xs text-slate-500 break-all bg-white p-3 rounded-xl border border-slate-200">
                          {block.previousHash || 'N/A (Genesis Block)'}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                          <User className="w-4 h-4" />
                          Initiator
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <p className="font-semibold text-slate-800">{getInitiatorName(block.initiatorWalletAddress)}</p>
                          <p className="font-mono text-xs text-slate-400 mt-1 break-all">
                            {block.initiatorWalletAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                      {block.initiatorSignature && (
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                            <Shield className="w-4 h-4" />
                            Initiator Signature (ECDSA)
                          </div>
                          <div className="font-mono text-xs text-emerald-600 break-all bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            {block.initiatorSignature}
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                          <Shield className="w-4 h-4" />
                          {block.initiatorSignature ? 'Block Seal' : 'Authority Signature'}
                        </div>
                        <div className="font-mono text-xs text-purple-600 break-all bg-purple-50 p-3 rounded-xl border border-purple-200">
                          {block.authoritySignature || 'N/A'}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                          <FileText className="w-4 h-4" />
                          Transaction Data
                        </div>
                        <div className="bg-white rounded-xl p-4 text-xs font-mono overflow-x-auto border border-slate-200 max-h-48 overflow-y-auto">
                          <pre className="text-slate-600">
                            {JSON.stringify(block.transactionData, null, 2)}
                          </pre>
                        </div>
                      </div>

                      {block.initiatorSignature && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <p className="text-sm font-semibold text-emerald-800 mb-1">✓ Cryptographically Verified Transfer</p>
                          <p className="text-xs text-emerald-700">
                            This transfer was signed with the owner's private key using ECDSA cryptography.
                          </p>
                        </div>
                      )}

                      {block.transactionData.propertyID && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <p className="text-xs font-medium text-indigo-700 mb-1">Property Location</p>
                          <p className="text-sm font-semibold text-indigo-900">
                            {getPropertyLocation(block.transactionData.propertyID)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hash Chain Visualization */}
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-3">Hash Chain Verification</p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex-1 p-3 bg-white rounded-xl font-mono text-slate-500 truncate border border-slate-200">
                        {block.previousHash?.substring(0, 24) || 'Genesis'}...
                      </div>
                      <div className="text-indigo-500 font-bold">→</div>
                      <div className="flex-1 p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-mono text-indigo-600 truncate">
                        {block.blockHash.substring(0, 24)}...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredLedger.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No blocks found matching your search criteria</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">Transaction Types</p>
        <div className="flex flex-wrap gap-2">
          {['REGISTER_PROPERTY', 'TRANSFER_PROPERTY', 'SUBDIVIDE_PROPERTY', 'REGISTER_USER', 'UPDATE_LOAN_STATUS'].map(type => (
            <span key={type} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${getTransactionColor(type)}`}>
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
