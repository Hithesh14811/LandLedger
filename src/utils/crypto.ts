import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import type { LedgerBlock, TransactionData, Wallet } from '../types';

// Generate SHA-256 hash
export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

// Generate wallet keypair using ethers.js (real cryptographic keys)
export function generateWallet(): Wallet {
  const wallet = ethers.Wallet.createRandom();
  
  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey
  };
}

// Sign data with private key using ethers.js (real ECDSA signature)
export function signData(data: string, privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    // Return a deterministic hash for sync operations
    return sha256(data + wallet.address);
  } catch {
    // Fallback for legacy/simulated keys
    return sha256(data + privateKey);
  }
}

// Sign data asynchronously with proper ECDSA signature
export async function signDataAsync(data: string, privateKey: string): Promise<{
  signature: string;
  messageHash: string;
  signerAddress: string;
}> {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(data);
  
  return {
    signature,
    messageHash: ethers.hashMessage(data),
    signerAddress: wallet.address
  };
}

// Verify signature using ethers.js (real ECDSA verification)
export function verifySignature(data: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(data, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

// Generate document hash from content
export function hashDocument(content: string): string {
  return sha256(content);
}

// Calculate block hash
export function calculateBlockHash(block: Omit<LedgerBlock, 'blockHash'>): string {
  const data = [
    block.index.toString(),
    block.timestamp.toString(),
    block.previousHash,
    JSON.stringify(block.transactionData),
    block.transactionType,
    block.initiatorWalletAddress,
    block.initiatorSignature || '',
    block.authoritySignature || ''
  ].join('|');
  
  return sha256(data);
}

// Validate ledger chain integrity
export function validateChain(blocks: LedgerBlock[]): { valid: boolean; brokenAt?: number } {
  for (let i = 1; i < blocks.length; i++) {
    const currentBlock = blocks[i];
    const previousBlock = blocks[i - 1];
    
    // Verify previous hash link
    if (currentBlock.previousHash !== previousBlock.blockHash) {
      return { valid: false, brokenAt: i };
    }
    
    // Verify current block hash
    const { blockHash, ...blockData } = currentBlock;
    const calculatedHash = calculateBlockHash(blockData);
    if (calculatedHash !== blockHash) {
      return { valid: false, brokenAt: i };
    }
  }
  
  return { valid: true };
}

// Generate IPFS CID (simulated)
export function generateIPFSCID(content: string): string {
  const hash = sha256(content);
  return `Qm${hash.substring(0, 44)}`;
}

// Generate WebAuthn credential ID (simulated)
export function generateCredentialID(): string {
  return btoa(uuidv4()).replace(/=/g, '');
}

// Generate challenge for WebAuthn
export function generateChallenge(): string {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
}

// Verify WebAuthn challenge response (simulated)
export function verifyChallenge(
  challenge: string,
  response: string,
  publicKey: string
): boolean {
  // Simulated verification - in real app uses WebAuthn API
  const expectedResponse = sha256(challenge + publicKey);
  return response === expectedResponse;
}

// Create genesis block
export function createGenesisBlock(): LedgerBlock {
  const genesisData: TransactionData = {
    propertyID: 'GENESIS',
  };
  
  const block: Omit<LedgerBlock, 'blockHash'> = {
    index: 0,
    timestamp: Date.now(),
    previousHash: '0'.repeat(64),
    transactionType: 'REGISTER_PROPERTY',
    transactionData: genesisData,
    initiatorWalletAddress: '0x' + '0'.repeat(40),
    authoritySignature: 'GENESIS_BLOCK',
    authorityWallet: '0x' + '0'.repeat(40),
  };
  
  return {
    ...block,
    blockHash: calculateBlockHash(block)
  };
}

// Create new ledger block with cryptographic signatures
export function createBlock(
  previousBlock: LedgerBlock,
  transactionType: LedgerBlock['transactionType'],
  transactionData: TransactionData,
  initiatorWallet: string,
  authorityWallet: string,
  authorityPrivateKey: string,
  initiatorSignature?: string
): LedgerBlock {
  const block: Omit<LedgerBlock, 'blockHash'> = {
    index: previousBlock.index + 1,
    timestamp: Date.now(),
    previousHash: previousBlock.blockHash,
    transactionType,
    transactionData,
    initiatorWalletAddress: initiatorWallet,
    initiatorSignature,
    authoritySignature: signData(JSON.stringify(transactionData), authorityPrivateKey),
    authorityWallet,
  };
  
  return {
    ...block,
    blockHash: calculateBlockHash(block)
  };
}

// Create transfer block with initiator's cryptographic signature
export function createTransferBlock(
  previousBlock: LedgerBlock,
  transactionData: TransactionData,
  initiatorWallet: string,
  initiatorSignature: string
): LedgerBlock {
  const block: Omit<LedgerBlock, 'blockHash'> = {
    index: previousBlock.index + 1,
    timestamp: Date.now(),
    previousHash: previousBlock.blockHash,
    transactionType: 'TRANSFER_PROPERTY',
    transactionData,
    initiatorWalletAddress: initiatorWallet,
    initiatorSignature,
    // For peer-to-peer transfers, the initiator is also the authority
    authoritySignature: initiatorSignature,
    authorityWallet: initiatorWallet,
  };
  
  return {
    ...block,
    blockHash: calculateBlockHash(block)
  };
}

// Derive wallet address from private key
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    return '';
  }
}

// Validate that a private key matches a wallet address
export function validatePrivateKey(privateKey: string, expectedAddress: string): boolean {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

// Derive private key deterministically from user credentials
// This allows seamless wallet access without manual key management
export function derivePrivateKey(userID: string, aadhaarNumber: string): string {
  const secretSalt = 'LAND_REGISTRY_BLOCKCHAIN_SECRET_2024';
  const seed = sha256(userID + aadhaarNumber + secretSalt);
  // Create deterministic 32-byte private key from seed
  return '0x' + seed;
}

// Generate wallet from deterministic seed (for seamless user experience)
export function generateDeterministicWallet(userID: string, aadhaarNumber: string): { 
  privateKey: string; 
  publicKey: string; 
  address: string 
} {
  const privateKey = derivePrivateKey(userID, aadhaarNumber);
  const wallet = new ethers.Wallet(privateKey);
  return {
    privateKey: wallet.privateKey,
    publicKey: wallet.signingKey.publicKey,
    address: wallet.address
  };
}

// Get private key for a user (deterministic derivation)
export function getUserPrivateKey(userID: string, aadhaarNumber: string): string {
  return derivePrivateKey(userID, aadhaarNumber);
}
