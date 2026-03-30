import type { Principal } from "@icp-sdk/core/principal";

export type DepositStatus =
  | { Pending: null }
  | { Approved: null }
  | { Rejected: null };
export type WithdrawalStatus =
  | { Pending: null }
  | { Completed: null }
  | { Rejected: null };
export type SlotStatus = { Active: null } | { Closed: null };

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

export type UserRole = { admin: null } | { user: null } | { guest: null };

import type { backendInterface } from "./backend";
export interface WealthActorExtended extends backendInterface {
  getMyDeposits(): Promise<DepositRequest[]>;
  getUpiConfig(): Promise<UpiConfig>;
  setUpiConfig(
    upiId: string,
    accountName: string,
    displayName: string,
    customQrUrl: [] | [string],
  ): Promise<{ ok: string } | { err: string }>;
}
export type WealthActor = WealthActorExtended;
