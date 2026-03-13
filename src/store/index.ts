import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  User, Property, PropertyDocument, LedgerBlock, PendingAction,
  EncroachmentAlert, Session, TransactionData, GeoPolygon, LoanInfo, CoordinateCheckResult,
  NOCTransferRequest
} from '../types';
import {
  generateCredentialID, sha256, createGenesisBlock,
  createBlock, generateIPFSCID, createTransferBlock, generateDeterministicWallet
} from '../utils/crypto';
import { calculateArea, detectEncroachment, validateSubdivision, checkPolygonOverlap } from '../utils/geo';

interface StoreState {
  // Data
  users: User[];
  properties: Property[];
  documents: PropertyDocument[];
  ledger: LedgerBlock[];
  pendingActions: PendingAction[];
  encroachmentAlerts: EncroachmentAlert[];
  nocTransferRequests: NOCTransferRequest[];
  
  // Session
  session: Session | null;
  currentUser: User | null;
  
  // WebAuthn simulation
  challenges: Map<string, { challenge: string; userID: string; expiresAt: number }>;
  
  // Actions - User Management (Authority Only)
  registerUserByAuthority: (data: { 
    name: string; 
    aadhaarNumber: string; 
    email: string; 
    phone: string;
  }) => { user: User; wallet: { privateKey: string; address: string } };
  loginUser: (userID: string) => boolean;
  logoutUser: () => void;
  verifyUser: (userID: string) => void;
  getUserByAadhaar: (aadhaarNumber: string) => User | undefined;
  searchUsersByName: (query: string) => User[];
  
  // Actions - Property Management (Authority Only)
  checkCoordinateDuplicate: (boundaryPolygon: GeoPolygon) => CoordinateCheckResult;
  registerPropertyByAuthority: (data: { 
    ownerWallet: string;
    location: string; 
    surveyNumber: string;
    areaSquareMeters: number; 
    boundaryPolygon: GeoPolygon; 
    documents: { type: string; content: string }[];
    previousOwnerWallet?: string;
    loanInfo?: LoanInfo;
  }) => Property | { error: string };
  updatePropertyLoanStatus: (propertyID: string, loanInfo: LoanInfo) => void;
  
  // Pending action approvals
  approvePropertyRegistration: (actionID: string, comments?: string) => Property | null;
  rejectAction: (actionID: string, comments: string) => void;
  
  // Actions - Property Transfer (Direct - No Authority Approval)
  directTransferProperty: (propertyID: string, buyerWallet: string, agreementDocument: string, initiatorSignature: string) => void;
  
  // Actions - NOC Transfer (For properties under loan - Requires Authority Approval)
  submitNOCTransferRequest: (propertyID: string, buyerWallet: string, nocFileData: { fileName: string; fileType: string; fileData: string; hash: string }, saleAgreement: string) => NOCTransferRequest | { error: string };
  approveNOCTransfer: (requestID: string) => void;
  rejectNOCTransfer: (requestID: string, reason: string) => void;
  getNOCTransferRequests: () => NOCTransferRequest[];
  
  // Actions - Subdivision (Requires Authority Approval)
  initiateSubdivision: (propertyID: string, childPolygons: GeoPolygon[], surveyDocument: string) => PendingAction | { error: string };
  approveSubdivision: (actionID: string, comments?: string) => Property[];
  
  // Actions - Disputes
  flagDispute: (propertyID: string, reason: string) => void;
  resolveDispute: (propertyID: string, resolution: string) => void;
  
  // Actions - Encroachment
  resolveEncroachment: (alertID: string, resolution: 'resolved' | 'dismissed') => void;
  
  // Utilities
  getPropertyHistory: (propertyID: string) => LedgerBlock[];
  calculateRiskScore: (propertyID: string) => number;
  verifyDocumentIntegrity: (documentID: string, content: string) => boolean;
  getPropertyByID: (propertyID: string) => Property | undefined;
  getUserByWallet: (walletAddress: string) => User | undefined;
  getPendingActionsForAuthority: () => PendingAction[];
  getPropertiesForUser: (walletAddress: string) => Property[];
  getOwnershipChain: (propertyID: string) => { wallet: string; name: string; timestamp: number }[];
  
  // Initialize demo data
  initializeDemoData: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      users: [],
      properties: [],
      documents: [],
      ledger: [createGenesisBlock()],
      pendingActions: [],
      encroachmentAlerts: [],
      nocTransferRequests: [],
      session: null,
      currentUser: null,
      challenges: new Map(),

      // Authority registers a new user via Aadhaar
      registerUserByAuthority: (data) => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') {
          throw new Error('Only authorities can register users');
        }

        // Check if Aadhaar already exists
        const existingUser = get().users.find(u => u.aadhaarNumber === data.aadhaarNumber);
        if (existingUser) {
          throw new Error('User with this Aadhaar number already exists');
        }

        // Validate Aadhaar format (12 digits)
        if (!/^\d{12}$/.test(data.aadhaarNumber)) {
          throw new Error('Invalid Aadhaar number format. Must be 12 digits.');
        }

        const userID = uuidv4();
        const wallet = generateDeterministicWallet(userID, data.aadhaarNumber);
        const credentialID = generateCredentialID();
        
        const user: User = {
          userID,
          name: data.name,
          nationalID: data.aadhaarNumber,
          aadhaarNumber: data.aadhaarNumber,
          email: data.email,
          phone: data.phone,
          publicKey: wallet.publicKey,
          credentialID,
          walletAddress: wallet.address,
          role: 'CITIZEN',
          createdAt: Date.now(),
          verified: true,
          registeredByAuthority: currentUser.walletAddress
        };

        const { ledger } = get();
        const previousBlock = ledger[ledger.length - 1];
        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        
        const transactionData: TransactionData = {
          userID: user.userID,
          toWallet: user.walletAddress
        };

        const newBlock = createBlock(
          previousBlock,
          'REGISTER_USER',
          transactionData,
          currentUser.walletAddress,
          currentUser.walletAddress,
          authorityPrivateKey
        );
        
        set(state => ({ 
          users: [...state.users, user],
          ledger: [...state.ledger, newBlock]
        }));
        
        return { 
          user, 
          wallet: { 
            privateKey: wallet.privateKey,
            address: wallet.address
          } 
        };
      },

      loginUser: (userID) => {
        const user = get().users.find(u => u.userID === userID);
        if (!user) return false;
        
        const session: Session = {
          userID: user.userID,
          walletAddress: user.walletAddress,
          role: user.role,
          expiresAt: Date.now() + 3600000
        };
        
        set({ session, currentUser: user });
        return true;
      },

      logoutUser: () => {
        set({ session: null, currentUser: null });
      },

      verifyUser: (userID) => {
        set(state => ({
          users: state.users.map(u =>
            u.userID === userID ? { ...u, verified: true } : u
          )
        }));
      },

      getUserByAadhaar: (aadhaarNumber) => {
        return get().users.find(u => u.aadhaarNumber === aadhaarNumber);
      },

      searchUsersByName: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().users.filter(u => 
          u.name.toLowerCase().includes(lowerQuery) ||
          u.aadhaarNumber.includes(query)
        );
      },

      checkCoordinateDuplicate: (boundaryPolygon) => {
        const { properties } = get();
        
        for (const existingProperty of properties) {
          if (existingProperty.status === 'subdivided') continue;
          
          const overlap = checkPolygonOverlap(boundaryPolygon, existingProperty.boundaryPolygon);
          if (overlap.overlaps) {
            return {
              isDuplicate: true,
              existingProperty,
              overlapPercentage: overlap.percentage
            };
          }
        }
        
        return { isDuplicate: false };
      },

      registerPropertyByAuthority: (data) => {
        const { currentUser, ledger, properties } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') {
          return { error: 'Only authorities can register properties' };
        }

        const duplicateCheck = get().checkCoordinateDuplicate(data.boundaryPolygon);
        if (duplicateCheck.isDuplicate) {
          return { 
            error: `This land is already registered as ${duplicateCheck.existingProperty?.propertyID}. Overlap: ${duplicateCheck.overlapPercentage?.toFixed(1)}%. Only transfer is allowed for existing properties.`
          };
        }

        const alerts = detectEncroachment(data.boundaryPolygon, properties);
        if (alerts.length > 0) {
          set(state => ({
            encroachmentAlerts: [...state.encroachmentAlerts, ...alerts]
          }));
        }

        const propertyID = `PROP-${Date.now()}-${uuidv4().substring(0, 8)}`;
        
        const documentHashes: { type: string; hash: string; cid: string }[] = [];
        data.documents.forEach(doc => {
          const hash = sha256(doc.content);
          const cid = generateIPFSCID(doc.content);
          documentHashes.push({ type: doc.type, hash, cid });
        });

        const property: Property = {
          propertyID,
          currentOwnerWallet: data.ownerWallet,
          areaSquareMeters: data.areaSquareMeters,
          boundaryPolygon: data.boundaryPolygon,
          documentHash: documentHashes[0]?.hash || sha256(propertyID + Date.now()),
          ipfsCID: documentHashes[0]?.cid || generateIPFSCID(propertyID + Date.now()),
          riskScore: 90,
          parentPropertyID: null,
          status: 'active',
          location: data.location,
          registeredAt: Date.now(),
          lastTransferAt: Date.now(),
          transferCount: 0,
          disputes: 0,
          loanInfo: data.loanInfo || { isUnderLoan: false },
          registeredByAuthority: currentUser.walletAddress,
          surveyNumber: data.surveyNumber,
          previousOwnerWallet: data.previousOwnerWallet
        };

        const docs: PropertyDocument[] = documentHashes.map((doc) => ({
          documentID: uuidv4(),
          propertyID,
          documentType: doc.type as PropertyDocument['documentType'],
          fileName: `${doc.type}_${propertyID}.pdf`,
          documentHash: doc.hash,
          ipfsCID: doc.cid,
          uploadedBy: currentUser.walletAddress,
          uploadedAt: Date.now(),
          verified: true
        }));

        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID,
          toWallet: data.ownerWallet,
          documentHash: property.documentHash,
          ipfsCID: property.ipfsCID
        };

        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'REGISTER_PROPERTY',
          transactionData,
          currentUser.walletAddress,
          currentUser.walletAddress,
          authorityPrivateKey
        );

        set(state => ({
          properties: [...state.properties, property],
          documents: [...state.documents, ...docs],
          ledger: [...state.ledger, newBlock]
        }));

        return property;
      },

      updatePropertyLoanStatus: (propertyID, loanInfo) => {
        const { currentUser, ledger } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;

        const updatedLoanInfo: LoanInfo = {
          ...loanInfo,
          lastUpdatedAt: Date.now(),
          lastUpdatedBy: currentUser.walletAddress
        };

        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID,
          loanInfo: updatedLoanInfo
        };

        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'UPDATE_LOAN_STATUS',
          transactionData,
          currentUser.walletAddress,
          currentUser.walletAddress,
          authorityPrivateKey
        );

        set(state => ({
          properties: state.properties.map(p =>
            p.propertyID === propertyID
              ? { ...p, loanInfo: updatedLoanInfo }
              : p
          ),
          ledger: [...state.ledger, newBlock]
        }));
      },

      approvePropertyRegistration: (actionID, comments) => {
        const { currentUser, ledger, pendingActions } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return null;
        
        const action = pendingActions.find(a => a.actionID === actionID);
        if (!action || action.status !== 'pending') return null;
        
        const propertyID = `PROP-${Date.now()}-${uuidv4().substring(0, 8)}`;
        
        const property: Property = {
          propertyID,
          currentOwnerWallet: action.requestedBy,
          areaSquareMeters: action.data.areaSquareMeters,
          boundaryPolygon: action.data.boundaryPolygon,
          documentHash: action.data.documents[0]?.hash || '',
          ipfsCID: action.data.documents[0]?.cid || '',
          riskScore: 85,
          parentPropertyID: null,
          status: 'active',
          location: action.data.location,
          registeredAt: Date.now(),
          lastTransferAt: Date.now(),
          transferCount: 0,
          disputes: 0,
          loanInfo: { isUnderLoan: false },
          registeredByAuthority: currentUser.walletAddress,
          surveyNumber: action.data.surveyNumber || `SRV-${Date.now()}`
        };
        
        const docs: PropertyDocument[] = action.data.documents.map((doc: { type: string; hash: string; cid: string }) => ({
          documentID: uuidv4(),
          propertyID,
          documentType: doc.type as PropertyDocument['documentType'],
          fileName: `${doc.type}_${propertyID}.pdf`,
          documentHash: doc.hash,
          ipfsCID: doc.cid,
          uploadedBy: action.requestedBy,
          uploadedAt: Date.now(),
          verified: true
        }));
        
        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID,
          toWallet: action.requestedBy,
          documentHash: property.documentHash,
          ipfsCID: property.ipfsCID
        };
        
        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'REGISTER_PROPERTY',
          transactionData,
          action.requestedBy,
          currentUser.walletAddress,
          authorityPrivateKey
        );
        
        set(state => ({
          properties: [...state.properties, property],
          documents: [...state.documents, ...docs],
          ledger: [...state.ledger, newBlock],
          pendingActions: state.pendingActions.map(a =>
            a.actionID === actionID
              ? { ...a, status: 'approved' as const, reviewedBy: currentUser.walletAddress, reviewedAt: Date.now(), comments }
              : a
          )
        }));
        
        return property;
      },

      rejectAction: (actionID, comments) => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;
        
        set(state => ({
          pendingActions: state.pendingActions.map(a =>
            a.actionID === actionID
              ? { ...a, status: 'rejected' as const, reviewedBy: currentUser.walletAddress, reviewedAt: Date.now(), comments }
              : a
          )
        }));
      },

      directTransferProperty: (propertyID: string, buyerWallet: string, agreementDocument: string, initiatorSignature: string) => {
        const { currentUser, properties, ledger } = get();
        if (!currentUser) throw new Error('Not authenticated');

        const property = properties.find(p => p.propertyID === propertyID);
        if (!property) throw new Error('Property not found');
        if (property.currentOwnerWallet !== currentUser.walletAddress) {
          throw new Error('Not property owner');
        }
        
        if (property.loanInfo?.isUnderLoan) {
          throw new Error('Property is under loan. Please submit NOC transfer request.');
        }

        const agreementHash = sha256(agreementDocument);
        const agreementCID = generateIPFSCID(agreementDocument);
        const previousBlock = ledger[ledger.length - 1];

        const transactionData: TransactionData = {
          propertyID,
          fromWallet: currentUser.walletAddress,
          toWallet: buyerWallet,
          documentHash: agreementHash,
          ipfsCID: agreementCID,
        };

        const newBlock = createTransferBlock(
          previousBlock,
          transactionData,
          currentUser.walletAddress,
          initiatorSignature
        );

        const doc: PropertyDocument = {
          documentID: uuidv4(),
          propertyID,
          documentType: 'transfer_agreement',
          fileName: `transfer_${propertyID}_${Date.now()}.pdf`,
          documentHash: agreementHash,
          ipfsCID: agreementCID,
          uploadedBy: currentUser.walletAddress,
          uploadedAt: Date.now(),
          verified: true,
        };

        set(state => ({
          properties: state.properties.map(p =>
            p.propertyID === propertyID
              ? {
                  ...p,
                  previousOwnerWallet: p.currentOwnerWallet,
                  currentOwnerWallet: buyerWallet,
                  lastTransferAt: Date.now(),
                  transferCount: p.transferCount + 1,
                  riskScore: Math.max(0, p.riskScore - (p.transferCount > 3 ? 10 : 5))
                }
              : p
          ),
          documents: [...state.documents, doc],
          ledger: [...state.ledger, newBlock],
        }));
      },

      // Submit NOC transfer request for properties under loan
      submitNOCTransferRequest: (propertyID: string, buyerWallet: string, nocFileData: { fileName: string; fileType: string; fileData: string; hash: string }, saleAgreement: string) => {
        const { currentUser, properties } = get();
        if (!currentUser) return { error: 'Not authenticated' };

        const property = properties.find(p => p.propertyID === propertyID);
        if (!property) return { error: 'Property not found' };
        if (property.currentOwnerWallet !== currentUser.walletAddress) {
          return { error: 'Not property owner' };
        }
        if (!property.loanInfo?.isUnderLoan) {
          return { error: 'Property is not under loan. Use direct transfer instead.' };
        }
        
        const existingRequest = get().nocTransferRequests.find(
          r => r.propertyID === propertyID && r.status === 'pending'
        );
        if (existingRequest) {
          return { error: 'A transfer request is already pending for this property.' };
        }

        const nocCID = generateIPFSCID(nocFileData.fileData);
        const agreementHash = sha256(saleAgreement);
        const agreementCID = generateIPFSCID(saleAgreement);

        const request: NOCTransferRequest = {
          requestID: uuidv4(),
          propertyID,
          fromWallet: currentUser.walletAddress,
          toWallet: buyerWallet,
          nocDocumentHash: nocFileData.hash,
          nocIPFSCID: nocCID,
          nocFileName: nocFileData.fileName,
          nocFileType: nocFileData.fileType,
          nocFileData: nocFileData.fileData,
          saleAgreementHash: agreementHash,
          saleAgreementIPFSCID: agreementCID,
          bankName: property.loanInfo.loanProvider || 'Unknown Bank',
          loanAmount: property.loanInfo.remainingAmount || 0,
          requestedAt: Date.now(),
          status: 'pending'
        };

        const nocDoc: PropertyDocument = {
          documentID: uuidv4(),
          propertyID,
          documentType: 'loan_document',
          fileName: nocFileData.fileName,
          documentHash: nocFileData.hash,
          ipfsCID: nocCID,
          uploadedBy: currentUser.walletAddress,
          uploadedAt: Date.now(),
          verified: false
        };

        set(state => ({
          nocTransferRequests: [...state.nocTransferRequests, request],
          documents: [...state.documents, nocDoc]
        }));

        return request;
      },

      // Authority approves NOC transfer - clears loan and transfers property
      approveNOCTransfer: (requestID: string) => {
        const { currentUser, ledger, nocTransferRequests, users } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;

        const request = nocTransferRequests.find(r => r.requestID === requestID);
        if (!request || request.status !== 'pending') return;

        const recipient = users.find(u => u.walletAddress === request.toWallet);

        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID: request.propertyID,
          fromWallet: request.fromWallet,
          toWallet: request.toWallet,
          documentHash: request.nocDocumentHash,
          ipfsCID: request.nocIPFSCID
        };

        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'TRANSFER_WITH_NOC',
          transactionData,
          request.fromWallet,
          currentUser.walletAddress,
          authorityPrivateKey
        );

        const transferDoc: PropertyDocument = {
          documentID: uuidv4(),
          propertyID: request.propertyID,
          documentType: 'transfer_agreement',
          fileName: `noc_transfer_${request.propertyID}_${Date.now()}.pdf`,
          documentHash: request.saleAgreementHash,
          ipfsCID: request.saleAgreementIPFSCID,
          uploadedBy: request.fromWallet,
          uploadedAt: Date.now(),
          verified: true
        };

        set(state => ({
          properties: state.properties.map(p =>
            p.propertyID === request.propertyID
              ? {
                  ...p,
                  previousOwnerWallet: p.currentOwnerWallet,
                  currentOwnerWallet: request.toWallet,
                  lastTransferAt: Date.now(),
                  transferCount: p.transferCount + 1,
                  riskScore: Math.max(0, p.riskScore - 5),
                  loanInfo: {
                    isUnderLoan: false,
                    lastUpdatedAt: Date.now(),
                    lastUpdatedBy: currentUser.walletAddress
                  }
                }
              : p
          ),
          documents: [
            ...state.documents.map(d =>
              d.documentHash === request.nocDocumentHash
                ? { ...d, verified: true }
                : d
            ),
            transferDoc
          ],
          ledger: [...state.ledger, newBlock],
          nocTransferRequests: state.nocTransferRequests.map(r =>
            r.requestID === requestID
              ? { ...r, status: 'approved' as const, reviewedBy: currentUser.walletAddress, reviewedAt: Date.now() }
              : r
          )
        }));
        
        void recipient;
      },

      // Authority rejects NOC transfer
      rejectNOCTransfer: (requestID: string, reason: string) => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;

        set(state => ({
          nocTransferRequests: state.nocTransferRequests.map(r =>
            r.requestID === requestID
              ? { ...r, status: 'rejected' as const, reviewedBy: currentUser.walletAddress, reviewedAt: Date.now(), rejectionReason: reason }
              : r
          )
        }));
      },

      // Get pending NOC transfer requests
      getNOCTransferRequests: () => {
        return get().nocTransferRequests.filter(r => r.status === 'pending');
      },

      initiateSubdivision: (propertyID, childPolygons, surveyDocument) => {
        const { currentUser, properties } = get();
        if (!currentUser) throw new Error('Not authenticated');
        
        const property = properties.find(p => p.propertyID === propertyID);
        if (!property) return { error: 'Property not found' };
        if (property.currentOwnerWallet !== currentUser.walletAddress) {
          return { error: 'Not property owner' };
        }
        
        const validation = validateSubdivision(property.boundaryPolygon, childPolygons);
        if (!validation.valid) {
          return { error: validation.errors.join('; ') };
        }
        
        const docHash = sha256(surveyDocument);
        const docCID = generateIPFSCID(surveyDocument);
        
        const action: PendingAction = {
          actionID: uuidv4(),
          actionType: 'SUBDIVIDE_PROPERTY',
          requestedBy: currentUser.walletAddress,
          requestedAt: Date.now(),
          status: 'pending',
          data: {
            parentPropertyID: propertyID,
            childPolygons,
            surveyHash: docHash,
            surveyCID: docCID
          }
        };
        
        set(state => ({
          pendingActions: [...state.pendingActions, action]
        }));
        
        return action;
      },

      approveSubdivision: (actionID, comments) => {
        const { currentUser, ledger, pendingActions, properties } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return [];
        
        const action = pendingActions.find(a => a.actionID === actionID);
        if (!action || action.status !== 'pending') return [];
        
        const parentProperty = properties.find(p => p.propertyID === action.data.parentPropertyID);
        if (!parentProperty) return [];
        
        const childProperties: Property[] = action.data.childPolygons.map((polygon: GeoPolygon, index: number) => ({
          propertyID: `${parentProperty.propertyID}-${index + 1}`,
          currentOwnerWallet: parentProperty.currentOwnerWallet,
          areaSquareMeters: calculateArea(polygon),
          boundaryPolygon: polygon,
          documentHash: action.data.surveyHash,
          ipfsCID: action.data.surveyCID,
          riskScore: Math.max(0, parentProperty.riskScore - 15),
          parentPropertyID: parentProperty.propertyID,
          status: 'active' as const,
          location: `${parentProperty.location} - Parcel ${index + 1}`,
          registeredAt: Date.now(),
          lastTransferAt: Date.now(),
          transferCount: 0,
          disputes: 0,
          loanInfo: { isUnderLoan: false },
          registeredByAuthority: currentUser.walletAddress,
          surveyNumber: `${parentProperty.surveyNumber}-${index + 1}`
        }));
        
        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID: parentProperty.propertyID,
          fromWallet: parentProperty.currentOwnerWallet,
          documentHash: action.data.surveyHash,
          ipfsCID: action.data.surveyCID,
          childProperties: childProperties.map(c => c.propertyID)
        };
        
        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'SUBDIVIDE_PROPERTY',
          transactionData,
          action.requestedBy,
          currentUser.walletAddress,
          authorityPrivateKey
        );
        
        set(state => ({
          properties: [
            ...state.properties.map(p =>
              p.propertyID === parentProperty.propertyID
                ? { ...p, status: 'subdivided' as const }
                : p
            ),
            ...childProperties
          ],
          ledger: [...state.ledger, newBlock],
          pendingActions: state.pendingActions.map(a =>
            a.actionID === actionID
              ? { ...a, status: 'approved' as const, reviewedBy: currentUser.walletAddress, reviewedAt: Date.now(), comments }
              : a
          )
        }));
        
        return childProperties;
      },

      flagDispute: (propertyID, _reason) => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;
        
        set(state => ({
          properties: state.properties.map(p =>
            p.propertyID === propertyID
              ? { ...p, status: 'disputed' as const, disputes: p.disputes + 1, riskScore: Math.max(0, p.riskScore - 20) }
              : p
          )
        }));
      },

      resolveDispute: (propertyID, resolution) => {
        const { currentUser, ledger, properties } = get();
        if (!currentUser || currentUser.role !== 'AUTHORITY') return;
        
        const property = properties.find(p => p.propertyID === propertyID);
        if (!property) return;
        
        const previousBlock = ledger[ledger.length - 1];
        const transactionData: TransactionData = {
          propertyID,
          disputeResolution: resolution
        };
        
        const authorityPrivateKey = sha256(currentUser.publicKey + 'private');
        const newBlock = createBlock(
          previousBlock,
          'DISPUTE_RESOLUTION',
          transactionData,
          currentUser.walletAddress,
          currentUser.walletAddress,
          authorityPrivateKey
        );
        
        set(state => ({
          properties: state.properties.map(p =>
            p.propertyID === propertyID
              ? { ...p, status: 'active' as const, riskScore: Math.min(100, p.riskScore + 10) }
              : p
          ),
          ledger: [...state.ledger, newBlock]
        }));
      },

      resolveEncroachment: (alertID, resolution) => {
        set(state => ({
          encroachmentAlerts: state.encroachmentAlerts.map(a =>
            a.alertID === alertID
              ? { ...a, status: resolution }
              : a
          )
        }));
      },

      getPropertyHistory: (propertyID) => {
        return get().ledger.filter(block =>
          block.transactionData.propertyID === propertyID ||
          block.transactionData.childProperties?.includes(propertyID)
        );
      },

      getOwnershipChain: (propertyID) => {
        const { ledger, users } = get();
        const chain: { wallet: string; name: string; timestamp: number }[] = [];
        
        const relevantBlocks = ledger
          .filter(block => 
            block.transactionData.propertyID === propertyID &&
            (block.transactionType === 'REGISTER_PROPERTY' || 
             block.transactionType === 'TRANSFER_PROPERTY' ||
             block.transactionType === 'TRANSFER_WITH_NOC')
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        for (const block of relevantBlocks) {
          if (block.transactionType === 'REGISTER_PROPERTY' && block.transactionData.toWallet) {
            const user = users.find(u => u.walletAddress === block.transactionData.toWallet);
            chain.push({
              wallet: block.transactionData.toWallet,
              name: user?.name || 'Unknown',
              timestamp: block.timestamp
            });
          } else if (block.transactionType === 'TRANSFER_PROPERTY' || block.transactionType === 'TRANSFER_WITH_NOC') {
            if (block.transactionData.toWallet) {
              const user = users.find(u => u.walletAddress === block.transactionData.toWallet);
              chain.push({
                wallet: block.transactionData.toWallet,
                name: user?.name || 'Unknown',
                timestamp: block.timestamp
              });
            }
          }
        }

        return chain;
      },

      calculateRiskScore: (propertyID) => {
        const { properties, ledger, encroachmentAlerts } = get();
        const property = properties.find(p => p.propertyID === propertyID);
        if (!property) return 0;
        
        let score = 100;
        
        score -= Math.min(30, property.transferCount * 5);
        score -= property.disputes * 15;
        
        const activeAlerts = encroachmentAlerts.filter(
          a => a.propertyID === propertyID && a.status === 'pending'
        );
        score -= activeAlerts.length * 10;
        
        const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
        const recentTransfers = ledger.filter(
          b => b.transactionData.propertyID === propertyID &&
               b.transactionType === 'TRANSFER_PROPERTY' &&
               b.timestamp > yearAgo
        ).length;
        if (recentTransfers > 2) {
          score -= 20;
        }

        if (property.loanInfo?.isUnderLoan) {
          score -= 10;
        }
        
        return Math.max(0, Math.min(100, score));
      },

      verifyDocumentIntegrity: (documentID, content) => {
        const doc = get().documents.find(d => d.documentID === documentID);
        if (!doc) return false;
        
        const computedHash = sha256(content);
        return computedHash === doc.documentHash;
      },

      getPropertyByID: (propertyID) => {
        return get().properties.find(p => p.propertyID === propertyID);
      },

      getUserByWallet: (walletAddress) => {
        return get().users.find(u => u.walletAddress === walletAddress);
      },

      getPendingActionsForAuthority: () => {
        return get().pendingActions.filter(a => a.status === 'pending');
      },

      getPropertiesForUser: (walletAddress) => {
        return get().properties.filter(p => p.currentOwnerWallet === walletAddress);
      },

      initializeDemoData: () => {
        const { users, ledger } = get();
        
        if (users.length > 0) return;
        
        const authorityWallet = generateDeterministicWallet('auth-001', '999999999999');
        const authority: User = {
          userID: 'auth-001',
          name: 'Land Registry Authority',
          nationalID: '999999999999',
          aadhaarNumber: '999999999999',
          email: 'authority@landregistry.gov',
          phone: '+91-9999000001',
          publicKey: authorityWallet.publicKey,
          credentialID: generateCredentialID(),
          walletAddress: authorityWallet.address,
          role: 'AUTHORITY',
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
          verified: true,
          registeredByAuthority: 'SYSTEM'
        };
        
        const citizen1Wallet = generateDeterministicWallet('user-001', '123456789012');
        const citizen1: User = {
          userID: 'user-001',
          name: 'Rajesh Kumar',
          nationalID: '123456789012',
          aadhaarNumber: '123456789012',
          email: 'rajesh.kumar@email.com',
          phone: '+91-9876543210',
          publicKey: citizen1Wallet.publicKey,
          credentialID: generateCredentialID(),
          walletAddress: citizen1Wallet.address,
          role: 'CITIZEN',
          createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000,
          verified: true,
          registeredByAuthority: authority.walletAddress
        };
        
        const citizen2Wallet = generateDeterministicWallet('user-002', '987654321098');
        const citizen2: User = {
          userID: 'user-002',
          name: 'Priya Sharma',
          nationalID: '987654321098',
          aadhaarNumber: '987654321098',
          email: 'priya.sharma@email.com',
          phone: '+91-9876543211',
          publicKey: citizen2Wallet.publicKey,
          credentialID: generateCredentialID(),
          walletAddress: citizen2Wallet.address,
          role: 'CITIZEN',
          createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
          verified: true,
          registeredByAuthority: authority.walletAddress
        };
        
        const property1: Property = {
          propertyID: 'PROP-2024-001',
          currentOwnerWallet: citizen1.walletAddress,
          areaSquareMeters: 5000,
          boundaryPolygon: {
            type: 'Polygon',
            coordinates: [[
              [77.5946, 12.9716],
              [77.5956, 12.9716],
              [77.5956, 12.9726],
              [77.5946, 12.9726],
              [77.5946, 12.9716]
            ]]
          },
          documentHash: sha256('property1-deed-content'),
          ipfsCID: generateIPFSCID('property1-deed-content'),
          riskScore: 85,
          parentPropertyID: null,
          status: 'active',
          location: '123 MG Road, Bangalore, Karnataka',
          registeredAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          lastTransferAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          transferCount: 0,
          disputes: 0,
          loanInfo: { isUnderLoan: false },
          registeredByAuthority: authority.walletAddress,
          surveyNumber: 'SRV-BLR-001'
        };
        
        const property2: Property = {
          propertyID: 'PROP-2024-002',
          currentOwnerWallet: citizen2.walletAddress,
          areaSquareMeters: 8500,
          boundaryPolygon: {
            type: 'Polygon',
            coordinates: [[
              [77.5966, 12.9716],
              [77.5976, 12.9716],
              [77.5976, 12.9726],
              [77.5966, 12.9726],
              [77.5966, 12.9716]
            ]]
          },
          documentHash: sha256('property2-deed-content'),
          ipfsCID: generateIPFSCID('property2-deed-content'),
          riskScore: 72,
          parentPropertyID: null,
          status: 'active',
          location: '456 Indiranagar, Bangalore, Karnataka',
          registeredAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          lastTransferAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          transferCount: 1,
          disputes: 0,
          loanInfo: {
            isUnderLoan: true,
            loanAmount: 5000000,
            remainingAmount: 3500000,
            loanProvider: 'State Bank of India',
            loanStartDate: Date.now() - 365 * 24 * 60 * 60 * 1000,
            loanEndDate: Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
            remainingYears: 10,
            monthlyEMI: 45000
          },
          registeredByAuthority: authority.walletAddress,
          surveyNumber: 'SRV-BLR-002'
        };
        
        const docs: PropertyDocument[] = [
          {
            documentID: 'doc-001',
            propertyID: 'PROP-2024-001',
            documentType: 'sale_deed',
            fileName: 'sale_deed_PROP-2024-001.pdf',
            documentHash: property1.documentHash,
            ipfsCID: property1.ipfsCID,
            uploadedBy: citizen1.walletAddress,
            uploadedAt: property1.registeredAt,
            verified: true
          },
          {
            documentID: 'doc-002',
            propertyID: 'PROP-2024-002',
            documentType: 'sale_deed',
            fileName: 'sale_deed_PROP-2024-002.pdf',
            documentHash: property2.documentHash,
            ipfsCID: property2.ipfsCID,
            uploadedBy: citizen2.walletAddress,
            uploadedAt: property2.registeredAt,
            verified: true
          }
        ];
        
        const authorityPrivateKey = sha256(authorityWallet.publicKey + 'private');
        
        const block1 = createBlock(
          ledger[0],
          'REGISTER_PROPERTY',
          {
            propertyID: property1.propertyID,
            toWallet: citizen1.walletAddress,
            documentHash: property1.documentHash,
            ipfsCID: property1.ipfsCID
          },
          citizen1.walletAddress,
          authority.walletAddress,
          authorityPrivateKey
        );
        
        const block2 = createBlock(
          block1,
          'REGISTER_PROPERTY',
          {
            propertyID: property2.propertyID,
            toWallet: citizen2.walletAddress,
            documentHash: property2.documentHash,
            ipfsCID: property2.ipfsCID
          },
          citizen2.walletAddress,
          authority.walletAddress,
          authorityPrivateKey
        );
        
        set({
          users: [authority, citizen1, citizen2],
          properties: [property1, property2],
          documents: docs,
          ledger: [ledger[0], block1, block2]
        });
      }
    }),
    {
      name: 'land-registry-storage',
      partialize: (state) => ({
        users: state.users,
        properties: state.properties,
        documents: state.documents,
        ledger: state.ledger,
        pendingActions: state.pendingActions,
        encroachmentAlerts: state.encroachmentAlerts,
        nocTransferRequests: state.nocTransferRequests,
        session: state.session,
        currentUser: state.currentUser
      })
    }
  )
);
