// User Types
export type UserRole = 'CITIZEN' | 'AUTHORITY';

export interface User {
  userID: string;
  name: string;
  nationalID: string; // Aadhaar number for Indian context
  aadhaarNumber: string; // 12-digit Aadhaar
  email: string;
  phone: string;
  publicKey: string;
  credentialID: string;
  walletAddress: string;
  role: UserRole;
  createdAt: number;
  verified: boolean;
  registeredByAuthority: string; // Authority who registered this user
}

// Property Types
export type PropertyStatus = 'active' | 'subdivided' | 'disputed' | 'pending';

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

// Loan Information
export interface LoanInfo {
  isUnderLoan: boolean;
  loanAmount?: number; // in currency units
  remainingAmount?: number;
  loanProvider?: string; // Bank or institution name
  loanStartDate?: number;
  loanEndDate?: number; // Expected end date
  remainingYears?: number;
  monthlyEMI?: number;
  lastUpdatedAt?: number;
  lastUpdatedBy?: string; // Authority wallet who updated
}

export interface Property {
  propertyID: string;
  currentOwnerWallet: string;
  areaSquareMeters: number;
  boundaryPolygon: GeoPolygon;
  documentHash: string;
  ipfsCID: string;
  riskScore: number;
  parentPropertyID: string | null;
  status: PropertyStatus;
  location: string;
  registeredAt: number;
  lastTransferAt: number;
  transferCount: number;
  disputes: number;
  loanInfo: LoanInfo;
  registeredByAuthority: string; // Authority who registered this property
  surveyNumber: string; // Unique survey number
  previousOwnerWallet?: string; // For showing suggestions
}

// Document Types
export type DocumentType = 'sale_deed' | 'survey_map' | 'property_certificate' | 'transfer_agreement' | 'loan_document';

export interface PropertyDocument {
  documentID: string;
  propertyID: string;
  documentType: DocumentType;
  fileName: string;
  documentHash: string;
  ipfsCID: string;
  uploadedBy: string;
  uploadedAt: number;
  verified: boolean;
}

// Transaction Types
export type TransactionType = 
  | 'REGISTER_PROPERTY'
  | 'TRANSFER_PROPERTY'
  | 'TRANSFER_WITH_NOC'
  | 'SUBDIVIDE_PROPERTY'
  | 'CORRECT_RECORD'
  | 'DISPUTE_RESOLUTION'
  | 'REGISTER_USER'
  | 'UPDATE_LOAN_STATUS';

// NOC Transfer Request
export interface NOCTransferRequest {
  requestID: string;
  propertyID: string;
  fromWallet: string;
  toWallet: string;
  nocDocumentHash: string;
  nocIPFSCID: string;
  nocFileName: string; // Original file name
  nocFileType: string; // MIME type
  nocFileData: string; // Base64 encoded file data
  saleAgreementHash: string;
  saleAgreementIPFSCID: string;
  bankName: string;
  loanAmount: number;
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
}

export interface TransactionData {
  propertyID?: string;
  fromWallet?: string;
  toWallet?: string;
  documentHash?: string;
  ipfsCID?: string;
  childProperties?: string[];
  correctionDetails?: string;
  disputeResolution?: string;
  userID?: string;
  loanInfo?: LoanInfo;
}

// Ledger Block
export interface LedgerBlock {
  index: number;
  timestamp: number;
  previousHash: string;
  transactionType: TransactionType;
  transactionData: TransactionData;
  initiatorWalletAddress: string;
  initiatorSignature?: string; // ECDSA signature from initiator's private key
  authoritySignature: string;
  authorityWallet: string;
  blockHash: string;
}

// Pending Actions
export type ActionStatus = 'pending' | 'approved' | 'rejected';

export interface PendingAction {
  actionID: string;
  actionType: TransactionType;
  requestedBy: string;
  requestedAt: number;
  status: ActionStatus;
  data: any;
  reviewedBy?: string;
  reviewedAt?: number;
  comments?: string;
}

// Risk Factors
export interface RiskFactors {
  transferCount: number;
  documentInconsistencies: number;
  legalDisputes: number;
  boundaryConflicts: number;
  recentSubdivisions: number;
}

// Encroachment Alert
export interface EncroachmentAlert {
  alertID: string;
  propertyID: string;
  conflictingPropertyID: string;
  overlapArea: number;
  detectedAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
}

// Session
export interface Session {
  userID: string;
  walletAddress: string;
  role: UserRole;
  expiresAt: number;
}

// Wallet
export interface Wallet {
  address: string;
  publicKey: string;
  privateKey: string; // In real app, stored only on device
}

// Coordinate Check Result
export interface CoordinateCheckResult {
  isDuplicate: boolean;
  existingProperty?: Property;
  overlapPercentage?: number;
}
