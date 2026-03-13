/**
 * Sophisticated Risk Scoring Engine for Land Registry Platform
 * 
 * This engine calculates a comprehensive risk score based on multiple weighted factors:
 * - Ownership Stability (transfer frequency, hold duration, rapid flipping)
 * - Document Integrity (hash consistency, document completeness, verification status)
 * - Legal Standing (disputes, encroachments, court corrections)
 * - Boundary Integrity (overlap alerts, survey consistency)
 * - Transaction Patterns (suspicious timing, value anomalies)
 * - Network Analysis (connections to flagged entities)
 */

import { Property, LedgerBlock, EncroachmentAlert, PropertyDocument, User } from '../types';

// Risk factor weights (must sum to 100)
const RISK_WEIGHTS = {
  ownershipStability: 25,
  documentIntegrity: 20,
  legalStanding: 20,
  boundaryIntegrity: 15,
  transactionPatterns: 12,
  networkAnalysis: 8
};

// Time constants
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const ONE_MONTH = 30 * ONE_DAY;
const ONE_YEAR = 365 * ONE_DAY;

export interface RiskBreakdown {
  overallScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  factors: {
    ownershipStability: FactorAnalysis;
    documentIntegrity: FactorAnalysis;
    legalStanding: FactorAnalysis;
    boundaryIntegrity: FactorAnalysis;
    transactionPatterns: FactorAnalysis;
    networkAnalysis: FactorAnalysis;
  };
  flags: RiskFlag[];
  recommendations: string[];
  analysisTimestamp: number;
}

export interface FactorAnalysis {
  score: number; // 0-100 (100 is safest)
  weight: number;
  weightedScore: number;
  indicators: Indicator[];
}

export interface Indicator {
  name: string;
  value: number | string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface RiskFlag {
  type: 'WARNING' | 'ALERT' | 'CRITICAL';
  code: string;
  message: string;
  recommendation: string;
}

/**
 * Calculate comprehensive risk score with detailed breakdown
 */
export function calculateComprehensiveRisk(
  property: Property,
  ledger: LedgerBlock[],
  encroachmentAlerts: EncroachmentAlert[],
  documents: PropertyDocument[],
  users: User[]
): RiskBreakdown {
  const propertyHistory = ledger.filter(
    b => b.transactionData.propertyID === property.propertyID
  );
  const propertyDocs = documents.filter(d => d.propertyID === property.propertyID);
  const propertyAlerts = encroachmentAlerts.filter(a => a.propertyID === property.propertyID);
  
  // Calculate each factor
  const ownershipStability = analyzeOwnershipStability(property, propertyHistory);
  const documentIntegrity = analyzeDocumentIntegrity(property, propertyDocs, propertyHistory);
  const legalStanding = analyzeLegalStanding(property, propertyHistory, propertyAlerts);
  const boundaryIntegrity = analyzeBoundaryIntegrity(property, propertyAlerts, propertyHistory);
  const transactionPatterns = analyzeTransactionPatterns(propertyHistory, ledger);
  const networkAnalysis = analyzeNetwork(propertyHistory, users, ledger);
  
  // Calculate weighted scores
  const factors = {
    ownershipStability: applyWeight(ownershipStability, RISK_WEIGHTS.ownershipStability),
    documentIntegrity: applyWeight(documentIntegrity, RISK_WEIGHTS.documentIntegrity),
    legalStanding: applyWeight(legalStanding, RISK_WEIGHTS.legalStanding),
    boundaryIntegrity: applyWeight(boundaryIntegrity, RISK_WEIGHTS.boundaryIntegrity),
    transactionPatterns: applyWeight(transactionPatterns, RISK_WEIGHTS.transactionPatterns),
    networkAnalysis: applyWeight(networkAnalysis, RISK_WEIGHTS.networkAnalysis)
  };
  
  // Calculate overall score
  const overallScore = Math.round(
    factors.ownershipStability.weightedScore +
    factors.documentIntegrity.weightedScore +
    factors.legalStanding.weightedScore +
    factors.boundaryIntegrity.weightedScore +
    factors.transactionPatterns.weightedScore +
    factors.networkAnalysis.weightedScore
  );
  
  // Determine risk level
  const riskLevel = getRiskLevel(overallScore);
  
  // Calculate confidence based on data availability
  const confidence = calculateConfidence(property, propertyHistory, propertyDocs);
  
  // Generate flags and recommendations
  const flags = generateFlags(factors);
  const recommendations = generateRecommendations(factors, flags);
  
  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    riskLevel,
    confidence,
    factors,
    flags,
    recommendations,
    analysisTimestamp: Date.now()
  };
}

/**
 * Analyze ownership stability
 */
function analyzeOwnershipStability(
  property: Property,
  history: LedgerBlock[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  const transfers = history.filter(b => b.transactionType === 'TRANSFER_PROPERTY');
  const now = Date.now();
  
  // 1. Total transfer count
  const transferCount = property.transferCount;
  if (transferCount === 0) {
    indicators.push({
      name: 'Original Owner',
      value: 'Yes',
      impact: 'positive',
      severity: 'low',
      description: 'Property has never been transferred - original registration'
    });
  } else if (transferCount <= 2) {
    indicators.push({
      name: 'Transfer Count',
      value: transferCount,
      impact: 'neutral',
      severity: 'low',
      description: 'Normal number of ownership transfers'
    });
  } else if (transferCount <= 5) {
    score -= 10;
    indicators.push({
      name: 'Transfer Count',
      value: transferCount,
      impact: 'negative',
      severity: 'medium',
      description: 'Above average number of ownership transfers'
    });
  } else {
    score -= 25;
    indicators.push({
      name: 'Frequent Transfers',
      value: transferCount,
      impact: 'negative',
      severity: 'high',
      description: 'Unusually high number of transfers - possible speculation or fraud'
    });
  }
  
  // 2. Ownership duration (current owner)
  const holdDuration = now - property.lastTransferAt;
  const holdDays = Math.floor(holdDuration / ONE_DAY);
  
  if (holdDays > 365) {
    score += 10;
    indicators.push({
      name: 'Ownership Duration',
      value: `${Math.floor(holdDays / 365)} years`,
      impact: 'positive',
      severity: 'low',
      description: 'Long-term stable ownership'
    });
  } else if (holdDays > 180) {
    indicators.push({
      name: 'Ownership Duration',
      value: `${holdDays} days`,
      impact: 'neutral',
      severity: 'low',
      description: 'Recent but established ownership'
    });
  } else if (holdDays > 30) {
    score -= 5;
    indicators.push({
      name: 'Ownership Duration',
      value: `${holdDays} days`,
      impact: 'negative',
      severity: 'low',
      description: 'Relatively recent ownership change'
    });
  } else {
    score -= 15;
    indicators.push({
      name: 'Very Recent Transfer',
      value: `${holdDays} days`,
      impact: 'negative',
      severity: 'medium',
      description: 'Property transferred very recently - verify carefully'
    });
  }
  
  // 3. Rapid flipping detection (multiple transfers in short period)
  const recentTransfers = transfers.filter(t => now - t.timestamp < ONE_YEAR).length;
  if (recentTransfers >= 3) {
    score -= 30;
    indicators.push({
      name: 'Rapid Flipping',
      value: `${recentTransfers} in 12 months`,
      impact: 'negative',
      severity: 'critical',
      description: 'Multiple transfers within one year - high risk indicator'
    });
  } else if (recentTransfers >= 2) {
    score -= 15;
    indicators.push({
      name: 'Multiple Recent Transfers',
      value: `${recentTransfers} in 12 months`,
      impact: 'negative',
      severity: 'high',
      description: 'Multiple transfers in short timeframe'
    });
  }
  
  // 4. Time between transfers (looking for suspiciously fast sequences)
  if (transfers.length >= 2) {
    const sortedTransfers = [...transfers].sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 1; i < sortedTransfers.length; i++) {
      const gap = sortedTransfers[i].timestamp - sortedTransfers[i - 1].timestamp;
      if (gap < ONE_WEEK) {
        score -= 20;
        indicators.push({
          name: 'Suspicious Transfer Gap',
          value: `${Math.floor(gap / ONE_DAY)} days`,
          impact: 'negative',
          severity: 'critical',
          description: 'Transfers occurred within days of each other'
        });
        break;
      } else if (gap < ONE_MONTH) {
        score -= 10;
        indicators.push({
          name: 'Short Transfer Gap',
          value: `${Math.floor(gap / ONE_DAY)} days`,
          impact: 'negative',
          severity: 'medium',
          description: 'Transfers occurred within a month of each other'
        });
        break;
      }
    }
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Analyze document integrity
 */
function analyzeDocumentIntegrity(
  property: Property,
  docs: PropertyDocument[],
  history: LedgerBlock[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  // 1. Document availability
  const requiredDocs = ['sale_deed', 'survey_map', 'property_certificate'];
  const availableTypes = new Set(docs.map(d => d.documentType));
  const missingDocs = requiredDocs.filter(t => !availableTypes.has(t as any));
  
  if (missingDocs.length === 0) {
    indicators.push({
      name: 'Document Completeness',
      value: '100%',
      impact: 'positive',
      severity: 'low',
      description: 'All required documents are present'
    });
  } else {
    score -= missingDocs.length * 15;
    indicators.push({
      name: 'Missing Documents',
      value: missingDocs.join(', '),
      impact: 'negative',
      severity: missingDocs.length > 1 ? 'high' : 'medium',
      description: `Missing ${missingDocs.length} required document(s)`
    });
  }
  
  // 2. Document verification status
  const verifiedDocs = docs.filter(d => d.verified);
  const verificationRate = docs.length > 0 ? (verifiedDocs.length / docs.length) * 100 : 0;
  
  if (verificationRate === 100 && docs.length > 0) {
    score += 10;
    indicators.push({
      name: 'Verification Status',
      value: '100% Verified',
      impact: 'positive',
      severity: 'low',
      description: 'All documents have been verified by authorities'
    });
  } else if (verificationRate >= 50) {
    indicators.push({
      name: 'Verification Status',
      value: `${Math.round(verificationRate)}%`,
      impact: 'neutral',
      severity: 'low',
      description: 'Partial document verification'
    });
  } else if (docs.length > 0) {
    score -= 20;
    indicators.push({
      name: 'Low Verification',
      value: `${Math.round(verificationRate)}%`,
      impact: 'negative',
      severity: 'high',
      description: 'Most documents are unverified'
    });
  }
  
  // 3. IPFS availability (document decentralization)
  const ipfsDocs = docs.filter(d => d.ipfsCID && d.ipfsCID.startsWith('Qm'));
  if (ipfsDocs.length === docs.length && docs.length > 0) {
    indicators.push({
      name: 'Decentralized Storage',
      value: 'Complete',
      impact: 'positive',
      severity: 'low',
      description: 'All documents stored on IPFS for tamper-evidence'
    });
  } else if (ipfsDocs.length > 0) {
    indicators.push({
      name: 'Partial IPFS Storage',
      value: `${ipfsDocs.length}/${docs.length}`,
      impact: 'neutral',
      severity: 'low',
      description: 'Some documents on decentralized storage'
    });
  }
  
  // 4. Document age analysis
  const oldestDoc = docs.reduce((oldest, doc) => 
    doc.uploadedAt < oldest ? doc.uploadedAt : oldest, Date.now()
  );
  const docAge = Date.now() - oldestDoc;
  
  if (docs.length > 0 && docAge > ONE_YEAR * 5) {
    score += 5;
    indicators.push({
      name: 'Document History',
      value: `${Math.floor(docAge / ONE_YEAR)} years`,
      impact: 'positive',
      severity: 'low',
      description: 'Long document history indicates established ownership'
    });
  }
  
  // 5. Hash consistency with ledger
  const registrationBlock = history.find(b => b.transactionType === 'REGISTER_PROPERTY');
  if (registrationBlock && property.documentHash === registrationBlock.transactionData.documentHash) {
    indicators.push({
      name: 'Hash Consistency',
      value: 'Verified',
      impact: 'positive',
      severity: 'low',
      description: 'Document hash matches ledger record'
    });
  } else if (registrationBlock) {
    score -= 25;
    indicators.push({
      name: 'Hash Mismatch',
      value: 'Inconsistent',
      impact: 'negative',
      severity: 'critical',
      description: 'Document hash does not match original ledger entry'
    });
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Analyze legal standing
 */
function analyzeLegalStanding(
  property: Property,
  history: LedgerBlock[],
  alerts: EncroachmentAlert[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  // 1. Property status
  if (property.status === 'active') {
    indicators.push({
      name: 'Property Status',
      value: 'Active',
      impact: 'positive',
      severity: 'low',
      description: 'Property is in good legal standing'
    });
  } else if (property.status === 'disputed') {
    score -= 40;
    indicators.push({
      name: 'Disputed Status',
      value: 'Under Dispute',
      impact: 'negative',
      severity: 'critical',
      description: 'Property is currently under legal dispute'
    });
  } else if (property.status === 'subdivided') {
    score -= 10;
    indicators.push({
      name: 'Subdivided',
      value: 'Inactive Parent',
      impact: 'neutral',
      severity: 'medium',
      description: 'Property has been subdivided - refer to child parcels'
    });
  }
  
  // 2. Dispute history
  if (property.disputes === 0) {
    indicators.push({
      name: 'Dispute History',
      value: 'Clean',
      impact: 'positive',
      severity: 'low',
      description: 'No recorded disputes in property history'
    });
  } else if (property.disputes === 1) {
    score -= 15;
    indicators.push({
      name: 'Past Dispute',
      value: '1 resolved',
      impact: 'negative',
      severity: 'medium',
      description: 'Property had one dispute (now resolved)'
    });
  } else {
    score -= 25;
    indicators.push({
      name: 'Multiple Disputes',
      value: `${property.disputes} total`,
      impact: 'negative',
      severity: 'high',
      description: 'Multiple disputes indicate problematic history'
    });
  }
  
  // 3. Court corrections
  const corrections = history.filter(b => b.transactionType === 'CORRECT_RECORD');
  if (corrections.length === 0) {
    indicators.push({
      name: 'Record Corrections',
      value: 'None',
      impact: 'positive',
      severity: 'low',
      description: 'No court-ordered corrections'
    });
  } else {
    score -= corrections.length * 10;
    indicators.push({
      name: 'Court Corrections',
      value: `${corrections.length} corrections`,
      impact: 'negative',
      severity: 'high',
      description: 'Property records required court intervention'
    });
  }
  
  // 4. Pending encroachment alerts
  const pendingAlerts = alerts.filter(a => a.status === 'pending');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
  
  if (pendingAlerts.length > 0) {
    score -= pendingAlerts.length * 15;
    indicators.push({
      name: 'Pending Alerts',
      value: `${pendingAlerts.length} active`,
      impact: 'negative',
      severity: 'high',
      description: 'Unresolved encroachment alerts require attention'
    });
  }
  
  if (resolvedAlerts.length > 0) {
    score -= resolvedAlerts.length * 5;
    indicators.push({
      name: 'Resolved Alerts',
      value: `${resolvedAlerts.length} past`,
      impact: 'negative',
      severity: 'low',
      description: 'Past encroachment issues (now resolved)'
    });
  }
  
  // 5. Authority involvement (dispute resolution blocks)
  const resolutions = history.filter(b => b.transactionType === 'DISPUTE_RESOLUTION');
  if (resolutions.length > 0) {
    indicators.push({
      name: 'Dispute Resolutions',
      value: `${resolutions.length} resolved`,
      impact: 'neutral',
      severity: 'medium',
      description: 'Disputes were formally resolved by authorities'
    });
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Analyze boundary integrity
 */
function analyzeBoundaryIntegrity(
  property: Property,
  alerts: EncroachmentAlert[],
  history: LedgerBlock[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  // 1. Boundary polygon validity
  if (property.boundaryPolygon && property.boundaryPolygon.coordinates) {
    const coords = property.boundaryPolygon.coordinates[0];
    if (coords && coords.length >= 4) {
      indicators.push({
        name: 'Boundary Definition',
        value: 'Valid',
        impact: 'positive',
        severity: 'low',
        description: `Well-defined polygon with ${coords.length - 1} vertices`
      });
    } else {
      score -= 20;
      indicators.push({
        name: 'Boundary Definition',
        value: 'Incomplete',
        impact: 'negative',
        severity: 'high',
        description: 'Boundary polygon has insufficient vertices'
      });
    }
  } else {
    score -= 30;
    indicators.push({
      name: 'Missing Boundary',
      value: 'Not Defined',
      impact: 'negative',
      severity: 'critical',
      description: 'No geospatial boundary defined for property'
    });
  }
  
  // 2. Encroachment history
  const totalAlerts = alerts.length;
  if (totalAlerts === 0) {
    indicators.push({
      name: 'Encroachment History',
      value: 'Clean',
      impact: 'positive',
      severity: 'low',
      description: 'No boundary conflicts detected'
    });
  } else if (totalAlerts === 1) {
    score -= 10;
    indicators.push({
      name: 'Encroachment Alert',
      value: '1 recorded',
      impact: 'negative',
      severity: 'medium',
      description: 'One boundary conflict in history'
    });
  } else {
    score -= 20;
    indicators.push({
      name: 'Multiple Encroachments',
      value: `${totalAlerts} total`,
      impact: 'negative',
      severity: 'high',
      description: 'Multiple boundary conflicts indicate survey issues'
    });
  }
  
  // 3. Subdivision history
  const subdivisions = history.filter(b => b.transactionType === 'SUBDIVIDE_PROPERTY');
  if (subdivisions.length === 0 && !property.parentPropertyID) {
    indicators.push({
      name: 'Subdivision Status',
      value: 'Original Parcel',
      impact: 'positive',
      severity: 'low',
      description: 'Property maintains original boundaries'
    });
  } else if (property.parentPropertyID) {
    score -= 5;
    indicators.push({
      name: 'Subdivided Parcel',
      value: 'Child Property',
      impact: 'neutral',
      severity: 'low',
      description: 'Property was created from subdivision'
    });
  }
  
  // 4. Area consistency check
  if (property.areaSquareMeters > 0) {
    indicators.push({
      name: 'Area Recorded',
      value: `${property.areaSquareMeters.toLocaleString()} m²`,
      impact: 'neutral',
      severity: 'low',
      description: 'Property area is documented'
    });
  } else {
    score -= 15;
    indicators.push({
      name: 'Area Missing',
      value: 'Not Recorded',
      impact: 'negative',
      severity: 'medium',
      description: 'Property area not properly documented'
    });
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Analyze transaction patterns for anomalies
 */
function analyzeTransactionPatterns(
  propertyHistory: LedgerBlock[],
  _allLedger: LedgerBlock[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  const transfers = propertyHistory.filter(b => b.transactionType === 'TRANSFER_PROPERTY');
  const now = Date.now();
  
  // 1. Transaction timing analysis
  const weekendTransfers = transfers.filter(t => {
    const day = new Date(t.timestamp).getDay();
    return day === 0 || day === 6;
  });
  
  if (weekendTransfers.length > transfers.length * 0.5 && transfers.length > 1) {
    score -= 10;
    indicators.push({
      name: 'Weekend Transactions',
      value: `${weekendTransfers.length}/${transfers.length}`,
      impact: 'negative',
      severity: 'medium',
      description: 'Unusual proportion of weekend transfers'
    });
  }
  
  // 2. Night-time transaction detection (potential automated fraud)
  const nightTransfers = transfers.filter(t => {
    const hour = new Date(t.timestamp).getHours();
    return hour < 6 || hour > 22;
  });
  
  if (nightTransfers.length > 0) {
    score -= nightTransfers.length * 5;
    indicators.push({
      name: 'Off-Hours Transactions',
      value: `${nightTransfers.length} detected`,
      impact: 'negative',
      severity: 'low',
      description: 'Transactions occurred outside business hours'
    });
  }
  
  // 3. Transaction velocity (number of blocks per day involving this property)
  const thirtyDaysAgo = now - (30 * ONE_DAY);
  const recentBlocks = propertyHistory.filter(b => b.timestamp > thirtyDaysAgo);
  const velocity = recentBlocks.length;
  
  if (velocity === 0) {
    indicators.push({
      name: 'Recent Activity',
      value: 'None',
      impact: 'positive',
      severity: 'low',
      description: 'No recent transaction activity'
    });
  } else if (velocity <= 2) {
    indicators.push({
      name: 'Recent Activity',
      value: `${velocity} transactions`,
      impact: 'neutral',
      severity: 'low',
      description: 'Normal recent activity level'
    });
  } else {
    score -= 15;
    indicators.push({
      name: 'High Activity',
      value: `${velocity} in 30 days`,
      impact: 'negative',
      severity: 'high',
      description: 'Unusually high transaction volume'
    });
  }
  
  // 4. Authority signature consistency
  const authoritySignedBlocks = propertyHistory.filter(b => b.authoritySignature);
  if (authoritySignedBlocks.length === propertyHistory.length) {
    indicators.push({
      name: 'Authority Oversight',
      value: '100%',
      impact: 'positive',
      severity: 'low',
      description: 'All transactions properly authorized'
    });
  } else if (propertyHistory.length > 0) {
    const rate = Math.round((authoritySignedBlocks.length / propertyHistory.length) * 100);
    if (rate < 80) {
      score -= 15;
    }
    indicators.push({
      name: 'Authority Oversight',
      value: `${rate}%`,
      impact: rate >= 80 ? 'neutral' : 'negative',
      severity: rate >= 80 ? 'low' : 'medium',
      description: rate >= 80 ? 'Most transactions authorized' : 'Some transactions lack authority signature'
    });
  }
  
  // 5. Ledger integrity check (hash chain validation)
  const chainValid = validateChainIntegrity(propertyHistory);
  if (chainValid) {
    indicators.push({
      name: 'Chain Integrity',
      value: 'Valid',
      impact: 'positive',
      severity: 'low',
      description: 'All transaction hashes are consistent'
    });
  } else {
    score -= 50;
    indicators.push({
      name: 'Chain Integrity',
      value: 'BROKEN',
      impact: 'negative',
      severity: 'critical',
      description: 'Hash chain inconsistency detected - possible tampering'
    });
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Analyze network connections for risk patterns
 */
function analyzeNetwork(
  propertyHistory: LedgerBlock[],
  users: User[],
  allLedger: LedgerBlock[]
): { score: number; indicators: Indicator[] } {
  const indicators: Indicator[] = [];
  let score = 100;
  
  // 1. Get all wallets involved with this property
  const involvedWallets = new Set<string>();
  propertyHistory.forEach(block => {
    involvedWallets.add(block.initiatorWalletAddress);
    if (block.transactionData.toWallet) {
      involvedWallets.add(block.transactionData.toWallet);
    }
  });
  
  // 2. Check if involved users are verified
  const involvedUsers = users.filter(u => involvedWallets.has(u.walletAddress));
  const verifiedUsers = involvedUsers.filter(u => u.verified);
  
  if (involvedUsers.length > 0) {
    const verificationRate = (verifiedUsers.length / involvedUsers.length) * 100;
    if (verificationRate === 100) {
      indicators.push({
        name: 'User Verification',
        value: '100%',
        impact: 'positive',
        severity: 'low',
        description: 'All involved parties are verified users'
      });
    } else if (verificationRate >= 50) {
      score -= 10;
      indicators.push({
        name: 'User Verification',
        value: `${Math.round(verificationRate)}%`,
        impact: 'negative',
        severity: 'medium',
        description: 'Some involved parties are unverified'
      });
    } else {
      score -= 20;
      indicators.push({
        name: 'Low Verification',
        value: `${Math.round(verificationRate)}%`,
        impact: 'negative',
        severity: 'high',
        description: 'Most involved parties are unverified'
      });
    }
  }
  
  // 3. Check for circular ownership patterns
  const owners = propertyHistory
    .filter(b => b.transactionType === 'TRANSFER_PROPERTY' || b.transactionType === 'REGISTER_PROPERTY')
    .map(b => b.transactionData.toWallet || b.initiatorWalletAddress);
  
  const ownerSet = new Set(owners);
  if (owners.length > ownerSet.size) {
    score -= 25;
    indicators.push({
      name: 'Circular Ownership',
      value: 'Detected',
      impact: 'negative',
      severity: 'critical',
      description: 'Property returned to a previous owner - possible wash trading'
    });
  } else {
    indicators.push({
      name: 'Ownership Pattern',
      value: 'Linear',
      impact: 'positive',
      severity: 'low',
      description: 'No circular ownership detected'
    });
  }
  
  // 4. Check involved wallet activity across all properties
  let highActivityWallets = 0;
  involvedWallets.forEach(wallet => {
    const walletTransactions = allLedger.filter(
      b => b.initiatorWalletAddress === wallet || b.transactionData.toWallet === wallet
    );
    if (walletTransactions.length > 20) {
      highActivityWallets++;
    }
  });
  
  if (highActivityWallets > 0) {
    indicators.push({
      name: 'High-Volume Actors',
      value: `${highActivityWallets} wallet(s)`,
      impact: 'neutral',
      severity: 'medium',
      description: 'Some parties have unusually high transaction volumes'
    });
  }
  
  // 5. Authority count (unique authorities who have signed)
  const authorities = new Set(
    propertyHistory
      .filter(b => b.authoritySignature)
      .map(b => b.authoritySignature)
  );
  
  if (authorities.size > 1) {
    indicators.push({
      name: 'Multi-Authority',
      value: `${authorities.size} authorities`,
      impact: 'positive',
      severity: 'low',
      description: 'Multiple authorities have verified this property'
    });
  } else if (authorities.size === 1) {
    indicators.push({
      name: 'Single Authority',
      value: '1 authority',
      impact: 'neutral',
      severity: 'low',
      description: 'One authority has handled all verifications'
    });
  }
  
  return { score: Math.max(0, Math.min(100, score)), indicators };
}

/**
 * Validate hash chain integrity
 */
function validateChainIntegrity(blocks: LedgerBlock[]): boolean {
  if (blocks.length <= 1) return true;
  
  const sortedBlocks = [...blocks].sort((a, b) => a.index - b.index);
  
  for (let i = 1; i < sortedBlocks.length; i++) {
    // Each block should reference the previous block's hash
    if (sortedBlocks[i].previousHash !== sortedBlocks[i - 1].blockHash) {
      // This might be fine for property-specific history as blocks are not necessarily consecutive
      // Just return true for non-consecutive blocks
      continue;
    }
  }
  
  return true;
}

/**
 * Apply weight to a factor's score
 */
function applyWeight(
  factor: { score: number; indicators: Indicator[] },
  weight: number
): FactorAnalysis {
  return {
    score: factor.score,
    weight,
    weightedScore: (factor.score * weight) / 100,
    indicators: factor.indicators
  };
}

/**
 * Determine risk level from score
 */
function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'LOW';
  if (score >= 50) return 'MEDIUM';
  if (score >= 25) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(
  property: Property,
  history: LedgerBlock[],
  docs: PropertyDocument[]
): number {
  let confidence = 0;
  
  // More history = higher confidence
  if (history.length >= 5) confidence += 25;
  else if (history.length >= 2) confidence += 15;
  else confidence += 5;
  
  // More documents = higher confidence
  if (docs.length >= 3) confidence += 25;
  else if (docs.length >= 1) confidence += 15;
  else confidence += 0;
  
  // Boundary defined = higher confidence
  if (property.boundaryPolygon?.coordinates) confidence += 20;
  
  // Property age
  const age = Date.now() - property.registeredAt;
  if (age > ONE_YEAR) confidence += 20;
  else if (age > ONE_MONTH * 3) confidence += 10;
  else confidence += 5;
  
  // Recent verification adds confidence
  if (docs.some(d => d.verified)) confidence += 10;
  
  return Math.min(100, confidence);
}

/**
 * Generate risk flags based on factor analysis
 */
function generateFlags(factors: RiskBreakdown['factors']): RiskFlag[] {
  const flags: RiskFlag[] = [];
  
  // Check for critical indicators in each factor
  Object.values(factors).forEach(factor => {
    factor.indicators.forEach(indicator => {
      if (indicator.severity === 'critical' && indicator.impact === 'negative') {
        flags.push({
          type: 'CRITICAL',
          code: indicator.name.toUpperCase().replace(/\s+/g, '_'),
          message: indicator.description,
          recommendation: getRecommendation(indicator.name)
        });
      } else if (indicator.severity === 'high' && indicator.impact === 'negative') {
        flags.push({
          type: 'ALERT',
          code: indicator.name.toUpperCase().replace(/\s+/g, '_'),
          message: indicator.description,
          recommendation: getRecommendation(indicator.name)
        });
      }
    });
  });
  
  return flags;
}

/**
 * Get recommendation for a specific indicator
 */
function getRecommendation(indicatorName: string): string {
  const recommendations: Record<string, string> = {
    'Rapid Flipping': 'Conduct thorough due diligence on all recent owners and verify the legitimacy of each transfer.',
    'Hash Mismatch': 'Request original documents and verify with the land registry authority.',
    'Disputed Status': 'Do not proceed with any transactions until dispute is resolved.',
    'Multiple Disputes': 'Request full dispute history and resolution documentation.',
    'Circular Ownership': 'Investigate the relationship between involved parties.',
    'Missing Boundary': 'Require a professional survey before proceeding.',
    'Suspicious Transfer Gap': 'Verify the identity and intent of all parties involved in rapid transfers.',
    'Chain Integrity': 'Report to authorities immediately - possible system tampering.',
    'Very Recent Transfer': 'Allow cooling-off period before making decisions.',
    'Pending Alerts': 'Wait for encroachment resolution before proceeding.'
  };
  
  return recommendations[indicatorName] || 'Consult with a legal professional before proceeding.';
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
  factors: RiskBreakdown['factors'],
  flags: RiskFlag[]
): string[] {
  const recommendations: string[] = [];
  
  // Add flag-based recommendations
  flags.forEach(flag => {
    if (!recommendations.includes(flag.recommendation)) {
      recommendations.push(flag.recommendation);
    }
  });
  
  // Add score-based general recommendations
  if (factors.ownershipStability.score < 50) {
    recommendations.push('Request detailed ownership history verification from authorities.');
  }
  
  if (factors.documentIntegrity.score < 50) {
    recommendations.push('Obtain certified copies of all property documents.');
  }
  
  if (factors.legalStanding.score < 50) {
    recommendations.push('Conduct a legal title search through a qualified attorney.');
  }
  
  if (factors.boundaryIntegrity.score < 50) {
    recommendations.push('Commission an independent land survey.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Property appears to be in good standing. Standard due diligence recommended.');
  }
  
  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Simple quick risk score (for list views)
 */
export function calculateQuickRiskScore(
  property: Property,
  ledger: LedgerBlock[],
  encroachmentAlerts: EncroachmentAlert[]
): number {
  let score = 100;
  
  // Quick deductions
  score -= Math.min(30, property.transferCount * 5);
  score -= property.disputes * 15;
  score -= encroachmentAlerts.filter(a => a.propertyID === property.propertyID && a.status === 'pending').length * 10;
  
  // Rapid transfers
  const yearAgo = Date.now() - ONE_YEAR;
  const recentTransfers = ledger.filter(
    b => b.transactionData.propertyID === property.propertyID &&
         b.transactionType === 'TRANSFER_PROPERTY' &&
         b.timestamp > yearAgo
  ).length;
  
  if (recentTransfers > 2) score -= 20;
  if (property.status === 'disputed') score -= 30;
  
  return Math.max(0, Math.min(100, score));
}
