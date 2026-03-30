# WealthStream

## Current State

The app has a fully-built glassmorphism UI with an admin panel and user app. The Motoko backend stores all data: users, deposits, withdrawals, investment slots, and UPI config. All backend API methods exist and are wired into `backend.ts`.

**Root problems identified:**
1. `AdminPage` has zero auto-refresh — admin only sees new data after a manual tab click or page reload
2. `PaymentHistoryPage` reads exclusively from `localStorage` — it never queries the backend, so deposit status (Approved/Rejected) from admin actions never reaches the user
3. `AddFundsPage.handleSubmitProof()` calls `onSuccess()` (profile refresh) BEFORE calling `actor.purchaseSlot()` — race condition, and the deposit ID is never stored for later status lookup
4. No backend endpoint for users to fetch their own deposit records by status
5. No polling on the user side — balance and status changes from admin actions don't appear without manual navigation

## Requested Changes (Diff)

### Add
- `getMyDeposits()` backend method — returns all DepositRequests for the calling user
- Auto-refresh polling (30-second interval) in AdminPage when PIN is verified
- Backend-driven status sync in PaymentHistoryPage — polls `getMyDeposits()` every 30s and updates status from backend
- User-side profile polling in App.tsx — refreshes profile every 60s to reflect admin-approved balance changes

### Modify
- `AddFundsPage.handleSubmitProof()` — call `actor.purchaseSlot()` first, store returned deposit ID in localStorage entry, then call `onSuccess()` after success
- `PaymentHistoryPage` localStorage entries — add `depositId` field to each entry so backend sync can match records
- `AdminPage` — add `setInterval(load, 30000)` guarded by `pinVerified && actor`

### Remove
- Time-based "detecting" status logic in PaymentHistoryPage (replaced by backend-driven status)

## Implementation Plan

1. Add `getMyDeposits()` to `src/backend/main.mo` — query func collecting all deposits where `userId == caller`
2. Add `getMyDeposits()` to `backend.d.ts` and `backend.ts` interfaces
3. Fix `AddFundsPage.handleSubmitProof()` — reorder: purchaseSlot → store depositId in localStorage → onSuccess
4. Add auto-refresh `setInterval` to AdminPage (30s, guarded by pinVerified)
5. Update PaymentHistoryPage to poll `getMyDeposits()` every 30s and map status from backend onto localStorage entries
6. Add 60s profile polling in App.tsx via `setInterval(() => refreshProfile(), 60000)`
