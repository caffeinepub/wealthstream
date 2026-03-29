import type { Principal } from "@icp-sdk/core/principal";
import type {
  BankDetails,
  DepositRequest,
  IFSCResult,
  InvestmentSlot,
  UserProfile,
  UserRole,
  WithdrawalRequest,
} from "./actorTypes";

declare module "./backend" {
  interface backendInterface {
    getServerTime(): Promise<bigint>;
    getMyProfile(): Promise<UserProfile>;
    purchaseSlot(
      amount: bigint,
      termsAccepted: boolean,
    ): Promise<{ ok: bigint } | { err: string }>;
    claimReward(slotId: bigint): Promise<{ ok: bigint } | { err: string }>;
    requestWithdrawal(
      amount: bigint,
    ): Promise<{ ok: bigint } | { err: string }>;
    setBankDetails(
      ifsc: string,
      bankName: string,
      branchName: string,
      accountNumber: string,
      holderName: string,
      phone: string,
    ): Promise<{ ok: string } | { err: string }>;
    lookupIFSC(ifsc: string): Promise<{ ok: IFSCResult } | { err: string }>;
    getMySlots(): Promise<InvestmentSlot[]>;
    getMyWithdrawals(): Promise<WithdrawalRequest[]>;
    getBankDetails(): Promise<[] | [BankDetails]>;
    getPendingDeposits(): Promise<{ ok: DepositRequest[] } | { err: string }>;
    approveDeposit(
      depositId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    rejectDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    getFlaggedUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    unflagUser(target: Principal): Promise<{ ok: string } | { err: string }>;
    completeWithdrawal(
      withdrawalId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    addFunds(
      target: Principal,
      amount: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    getAllWithdrawals(): Promise<{ ok: WithdrawalRequest[] } | { err: string }>;
    getAllDeposits(): Promise<{ ok: DepositRequest[] } | { err: string }>;
    rejectWithdrawal(
      withdrawalId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    getAllUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    isCallerAdmin(): Promise<boolean>;
    getCallerUserRole(): Promise<UserRole>;
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
  }

  interface Backend {
    getServerTime(): Promise<bigint>;
    getMyProfile(): Promise<UserProfile>;
    purchaseSlot(
      amount: bigint,
      termsAccepted: boolean,
    ): Promise<{ ok: bigint } | { err: string }>;
    claimReward(slotId: bigint): Promise<{ ok: bigint } | { err: string }>;
    requestWithdrawal(
      amount: bigint,
    ): Promise<{ ok: bigint } | { err: string }>;
    setBankDetails(
      ifsc: string,
      bankName: string,
      branchName: string,
      accountNumber: string,
      holderName: string,
      phone: string,
    ): Promise<{ ok: string } | { err: string }>;
    lookupIFSC(ifsc: string): Promise<{ ok: IFSCResult } | { err: string }>;
    getMySlots(): Promise<InvestmentSlot[]>;
    getMyWithdrawals(): Promise<WithdrawalRequest[]>;
    getBankDetails(): Promise<[] | [BankDetails]>;
    getPendingDeposits(): Promise<{ ok: DepositRequest[] } | { err: string }>;
    approveDeposit(
      depositId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    rejectDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    getFlaggedUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    unflagUser(target: Principal): Promise<{ ok: string } | { err: string }>;
    completeWithdrawal(
      withdrawalId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    addFunds(
      target: Principal,
      amount: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    getAllWithdrawals(): Promise<{ ok: WithdrawalRequest[] } | { err: string }>;
    getAllDeposits(): Promise<{ ok: DepositRequest[] } | { err: string }>;
    rejectWithdrawal(
      withdrawalId: bigint,
    ): Promise<{ ok: string } | { err: string }>;
    getAllUsers(): Promise<{ ok: UserProfile[] } | { err: string }>;
    isCallerAdmin(): Promise<boolean>;
    getCallerUserRole(): Promise<UserRole>;
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
  }
}
