/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

const DepositStatus = IDL.Variant({
  Pending: IDL.Null,
  Approved: IDL.Null,
  Rejected: IDL.Null,
});

const WithdrawalStatus = IDL.Variant({
  Pending: IDL.Null,
  Completed: IDL.Null,
  Rejected: IDL.Null,
});

const SlotStatus = IDL.Variant({
  Active: IDL.Null,
  Closed: IDL.Null,
});

const BankDetails = IDL.Record({
  ifsc: IDL.Text,
  bankName: IDL.Text,
  branchName: IDL.Text,
  accountNumber: IDL.Text,
  holderName: IDL.Text,
  phone: IDL.Text,
  updateCount: IDL.Nat,
  lastUpdateYear: IDL.Int,
  lastUpdateMonth: IDL.Nat,
});

const UserProfile = IDL.Record({
  userId: IDL.Principal,
  uniqueId: IDL.Text,
  depositedBalance: IDL.Nat,
  withdrawableBalance: IDL.Nat,
  frozenBalance: IDL.Nat,
  isAdmin: IDL.Bool,
  isFlagged: IDL.Bool,
  bankDetails: IDL.Opt(BankDetails),
});

const DepositRequest = IDL.Record({
  id: IDL.Nat,
  userId: IDL.Principal,
  amount: IDL.Nat,
  status: DepositStatus,
  createdAt: IDL.Int,
});

const ClaimWindow = IDL.Record({
  hourIndex: IDL.Nat,
  windowOpenTime: IDL.Int,
  claimedAt: IDL.Opt(IDL.Int),
  expired: IDL.Bool,
});

const InvestmentSlot = IDL.Record({
  id: IDL.Nat,
  userId: IDL.Principal,
  amount: IDL.Nat,
  totalReturn: IDL.Nat,
  startTime: IDL.Int,
  claimWindows: IDL.Vec(ClaimWindow),
  status: SlotStatus,
});

const WithdrawalRequest = IDL.Record({
  id: IDL.Nat,
  userId: IDL.Principal,
  amount: IDL.Nat,
  bankSnapshot: IDL.Opt(BankDetails),
  status: WithdrawalStatus,
  createdAt: IDL.Int,
});

const IFSCResult = IDL.Record({
  bankName: IDL.Text,
  branchName: IDL.Text,
  address: IDL.Text,
  city: IDL.Text,
  state: IDL.Text,
});

const UpiConfig = IDL.Record({
  upiId: IDL.Text,
  accountName: IDL.Text,
  displayName: IDL.Text,
  customQrUrl: IDL.Opt(IDL.Text),
});

const UserRole = IDL.Variant({
  admin: IDL.Null,
  user: IDL.Null,
  guest: IDL.Null,
});

const R_Text = IDL.Variant({ ok: IDL.Text, err: IDL.Text });
const R_Nat = IDL.Variant({ ok: IDL.Nat, err: IDL.Text });
const R_Deposits = IDL.Variant({ ok: IDL.Vec(DepositRequest), err: IDL.Text });
const R_Users = IDL.Variant({ ok: IDL.Vec(UserProfile), err: IDL.Text });
const R_Withdrawals = IDL.Variant({ ok: IDL.Vec(WithdrawalRequest), err: IDL.Text });
const R_IFSC = IDL.Variant({ ok: IFSCResult, err: IDL.Text });

const serviceDefinition = {
  getServerTime: IDL.Func([], [IDL.Int], ['query']),
  getUpiConfig: IDL.Func([], [UpiConfig], ['query']),
  setUpiConfig: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [R_Text], []),
  getMyProfile: IDL.Func([], [UserProfile], []),
  purchaseSlot: IDL.Func([IDL.Nat, IDL.Bool], [R_Nat], []),
  claimReward: IDL.Func([IDL.Nat], [R_Nat], []),
  requestWithdrawal: IDL.Func([IDL.Nat], [R_Nat], []),
  setBankDetails: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [R_Text], []),
  lookupIFSC: IDL.Func([IDL.Text], [R_IFSC], []),
  getMySlots: IDL.Func([], [IDL.Vec(InvestmentSlot)], []),
  getMyWithdrawals: IDL.Func([], [IDL.Vec(WithdrawalRequest)], []),
  getBankDetails: IDL.Func([], [IDL.Opt(BankDetails)], []),
  getPendingDeposits: IDL.Func([], [R_Deposits], []),
  getAllDeposits: IDL.Func([], [R_Deposits], []),
  approveDeposit: IDL.Func([IDL.Nat], [R_Text], []),
  rejectDeposit: IDL.Func([IDL.Nat], [R_Text], []),
  getFlaggedUsers: IDL.Func([], [R_Users], []),
  unflagUser: IDL.Func([IDL.Principal], [R_Text], []),
  completeWithdrawal: IDL.Func([IDL.Nat], [R_Text], []),
  rejectWithdrawal: IDL.Func([IDL.Nat], [R_Text], []),
  addFunds: IDL.Func([IDL.Principal, IDL.Nat], [R_Text], []),
  getAllWithdrawals: IDL.Func([], [R_Withdrawals], []),
  getAllUsers: IDL.Func([], [R_Users], []),
  _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
  getCallerUserRole: IDL.Func([], [UserRole], []),
  isCallerAdmin: IDL.Func([], [IDL.Bool], []),
};

export const idlService = IDL.Service(serviceDefinition);

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const DepositStatus = IDL.Variant({
    Pending: IDL.Null,
    Approved: IDL.Null,
    Rejected: IDL.Null,
  });
  const WithdrawalStatus = IDL.Variant({
    Pending: IDL.Null,
    Completed: IDL.Null,
    Rejected: IDL.Null,
  });
  const SlotStatus = IDL.Variant({
    Active: IDL.Null,
    Closed: IDL.Null,
  });
  const BankDetails = IDL.Record({
    ifsc: IDL.Text,
    bankName: IDL.Text,
    branchName: IDL.Text,
    accountNumber: IDL.Text,
    holderName: IDL.Text,
    phone: IDL.Text,
    updateCount: IDL.Nat,
    lastUpdateYear: IDL.Int,
    lastUpdateMonth: IDL.Nat,
  });
  const UserProfile = IDL.Record({
    userId: IDL.Principal,
    uniqueId: IDL.Text,
    depositedBalance: IDL.Nat,
    withdrawableBalance: IDL.Nat,
    frozenBalance: IDL.Nat,
    isAdmin: IDL.Bool,
    isFlagged: IDL.Bool,
    bankDetails: IDL.Opt(BankDetails),
  });
  const DepositRequest = IDL.Record({
    id: IDL.Nat,
    userId: IDL.Principal,
    amount: IDL.Nat,
    status: DepositStatus,
    createdAt: IDL.Int,
  });
  const ClaimWindow = IDL.Record({
    hourIndex: IDL.Nat,
    windowOpenTime: IDL.Int,
    claimedAt: IDL.Opt(IDL.Int),
    expired: IDL.Bool,
  });
  const InvestmentSlot = IDL.Record({
    id: IDL.Nat,
    userId: IDL.Principal,
    amount: IDL.Nat,
    totalReturn: IDL.Nat,
    startTime: IDL.Int,
    claimWindows: IDL.Vec(ClaimWindow),
    status: SlotStatus,
  });
  const WithdrawalRequest = IDL.Record({
    id: IDL.Nat,
    userId: IDL.Principal,
    amount: IDL.Nat,
    bankSnapshot: IDL.Opt(BankDetails),
    status: WithdrawalStatus,
    createdAt: IDL.Int,
  });
  const IFSCResult = IDL.Record({
    bankName: IDL.Text,
    branchName: IDL.Text,
    address: IDL.Text,
    city: IDL.Text,
    state: IDL.Text,
  });
  const UpiConfig = IDL.Record({
    upiId: IDL.Text,
    accountName: IDL.Text,
    displayName: IDL.Text,
    customQrUrl: IDL.Opt(IDL.Text),
  });
  const UserRole = IDL.Variant({
    admin: IDL.Null,
    user: IDL.Null,
    guest: IDL.Null,
  });
  const R_Text = IDL.Variant({ ok: IDL.Text, err: IDL.Text });
  const R_Nat = IDL.Variant({ ok: IDL.Nat, err: IDL.Text });
  const R_Deposits = IDL.Variant({ ok: IDL.Vec(DepositRequest), err: IDL.Text });
  const R_Users = IDL.Variant({ ok: IDL.Vec(UserProfile), err: IDL.Text });
  const R_Withdrawals = IDL.Variant({ ok: IDL.Vec(WithdrawalRequest), err: IDL.Text });
  const R_IFSC = IDL.Variant({ ok: IFSCResult, err: IDL.Text });
  return IDL.Service({
    getServerTime: IDL.Func([], [IDL.Int], ['query']),
    getUpiConfig: IDL.Func([], [UpiConfig], ['query']),
    setUpiConfig: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)], [R_Text], []),
    getMyProfile: IDL.Func([], [UserProfile], []),
    purchaseSlot: IDL.Func([IDL.Nat, IDL.Bool], [R_Nat], []),
    claimReward: IDL.Func([IDL.Nat], [R_Nat], []),
    requestWithdrawal: IDL.Func([IDL.Nat], [R_Nat], []),
    setBankDetails: IDL.Func([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Text], [R_Text], []),
    lookupIFSC: IDL.Func([IDL.Text], [R_IFSC], []),
    getMySlots: IDL.Func([], [IDL.Vec(InvestmentSlot)], []),
    getMyWithdrawals: IDL.Func([], [IDL.Vec(WithdrawalRequest)], []),
    getBankDetails: IDL.Func([], [IDL.Opt(BankDetails)], []),
    getPendingDeposits: IDL.Func([], [R_Deposits], []),
    getAllDeposits: IDL.Func([], [R_Deposits], []),
    approveDeposit: IDL.Func([IDL.Nat], [R_Text], []),
    rejectDeposit: IDL.Func([IDL.Nat], [R_Text], []),
    getFlaggedUsers: IDL.Func([], [R_Users], []),
    unflagUser: IDL.Func([IDL.Principal], [R_Text], []),
    completeWithdrawal: IDL.Func([IDL.Nat], [R_Text], []),
    rejectWithdrawal: IDL.Func([IDL.Nat], [R_Text], []),
    addFunds: IDL.Func([IDL.Principal, IDL.Nat], [R_Text], []),
    getAllWithdrawals: IDL.Func([], [R_Withdrawals], []),
    getAllUsers: IDL.Func([], [R_Users], []),
    _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
    getCallerUserRole: IDL.Func([], [UserRole], []),
    isCallerAdmin: IDL.Func([], [IDL.Bool], []),
  });
};

export const init = ({ IDL }) => { return []; };
