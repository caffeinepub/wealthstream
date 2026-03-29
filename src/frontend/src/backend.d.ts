import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export type DepositStatus = { Pending: null } | { Approved: null } | { Rejected: null };
export type WithdrawalStatus = { Pending: null } | { Completed: null } | { Rejected: null };
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

export type UserRole = { admin: null } | { user: null } | { guest: null };

export interface backendInterface {
    getServerTime(): Promise<bigint>;
    getMyProfile(): Promise<UserProfile>;
    purchaseSlot(amount: bigint, termsAccepted: boolean): Promise<{ ok: bigint } | { err: string }>;
    claimReward(slotId: bigint): Promise<{ ok: bigint } | { err: string }>;
    requestWithdrawal(amount: bigint): Promise<{ ok: bigint } | { err: string }>;
    setBankDetails(ifsc: string, bankName: string, branchName: string, accountNumber: string, holderName: string, phone: string): Promise<{ ok: string } | { err: string }>;
    lookupIFSC(ifsc: string): Promise<{ ok: IFSCResult } | { err: string }>;
    getMySlots(): Promise<InvestmentSlot[]>;
    getMyWithdrawals(): Promise<WithdrawalRequest[]>;
    getBankDetails(): Promise<[] | [BankDetails]>;
    getPendingDeposits(): Promise<{ ok: DepositRequest[] } | { err: string }>;
    approveDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    rejectDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    getFlaggedUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    unflagUser(target: Principal): Promise<{ ok: string } | { err: string }>;
    completeWithdrawal(withdrawalId: bigint): Promise<{ ok: string } | { err: string }>;
    addFunds(target: Principal, amount: bigint): Promise<{ ok: string } | { err: string }>;
    getAllWithdrawals(): Promise<{ ok: WithdrawalRequest[] } | { err: string }>;
    getAllUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    isCallerAdmin(): Promise<boolean>;
}
