/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export type DepositStatus = { 'Pending': null } | { 'Approved': null } | { 'Rejected': null };
export type WithdrawalStatus = { 'Pending': null } | { 'Completed': null } | { 'Rejected': null };
export type SlotStatus = { 'Active': null } | { 'Closed': null };
export type UserRole = { 'admin': null } | { 'user': null } | { 'guest': null };

export interface BankDetails {
  ifsc: string;
  bankName: string;
  branchName: string;
  accountNumber: string;
  holderName: string;
  phone: string;
  updateCount: bigint;
  lastUpdateYear: bigint;
  lastUpdateMonth: bigint;
}

export interface UserProfile {
  userId: Principal;
  uniqueId: string;
  depositedBalance: bigint;
  withdrawableBalance: bigint;
  frozenBalance: bigint;
  isAdmin: boolean;
  isFlagged: boolean;
  bankDetails: [] | [BankDetails];
}

export interface DepositRequest {
  id: bigint;
  userId: Principal;
  amount: bigint;
  status: DepositStatus;
  createdAt: bigint;
}

export interface ClaimWindow {
  hourIndex: bigint;
  windowOpenTime: bigint;
  claimedAt: [] | [bigint];
  expired: boolean;
}

export interface InvestmentSlot {
  id: bigint;
  userId: Principal;
  amount: bigint;
  totalReturn: bigint;
  startTime: bigint;
  claimWindows: ClaimWindow[];
  status: SlotStatus;
}

export interface WithdrawalRequest {
  id: bigint;
  userId: Principal;
  amount: bigint;
  bankSnapshot: [] | [BankDetails];
  status: WithdrawalStatus;
  createdAt: bigint;
}

export interface IFSCResult {
  bankName: string;
  branchName: string;
  address: string;
  city: string;
  state: string;
}

export interface UpiConfig {
  upiId: string;
  accountName: string;
  displayName: string;
  customQrUrl: [] | [string];
}

export interface _SERVICE {
  getServerTime: ActorMethod<[], bigint>;
  getUpiConfig: ActorMethod<[], UpiConfig>;
  setUpiConfig: ActorMethod<[string, string, string, [] | [string]], { ok: string } | { err: string }>;
  getMyProfile: ActorMethod<[], UserProfile>;
  purchaseSlot: ActorMethod<[bigint, boolean], { ok: bigint } | { err: string }>;
  claimReward: ActorMethod<[bigint], { ok: bigint } | { err: string }>;
  requestWithdrawal: ActorMethod<[bigint], { ok: bigint } | { err: string }>;
  setBankDetails: ActorMethod<[string, string, string, string, string, string], { ok: string } | { err: string }>;
  lookupIFSC: ActorMethod<[string], { ok: IFSCResult } | { err: string }>;
  getMySlots: ActorMethod<[], InvestmentSlot[]>;
  getMyWithdrawals: ActorMethod<[], WithdrawalRequest[]>;
  getBankDetails: ActorMethod<[], [] | [BankDetails]>;
  getPendingDeposits: ActorMethod<[], { ok: DepositRequest[] } | { err: string }>;
  getAllDeposits: ActorMethod<[], { ok: DepositRequest[] } | { err: string }>;
  approveDeposit: ActorMethod<[bigint], { ok: string } | { err: string }>;
  rejectDeposit: ActorMethod<[bigint], { ok: string } | { err: string }>;
  getFlaggedUsers: ActorMethod<[], { ok: UserProfile[] } | { err: string }>;
  unflagUser: ActorMethod<[Principal], { ok: string } | { err: string }>;
  completeWithdrawal: ActorMethod<[bigint], { ok: string } | { err: string }>;
  rejectWithdrawal: ActorMethod<[bigint], { ok: string } | { err: string }>;
  addFunds: ActorMethod<[Principal, bigint], { ok: string } | { err: string }>;
  getAllWithdrawals: ActorMethod<[], { ok: WithdrawalRequest[] } | { err: string }>;
  getAllUsers: ActorMethod<[], { ok: UserProfile[] } | { err: string }>;
  _initializeAccessControlWithSecret: ActorMethod<[string], undefined>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  isCallerAdmin: ActorMethod<[], boolean>;
}

export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
