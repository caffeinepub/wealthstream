# WealthStream

## Current State
- Backend data (users, deposits, withdrawals, slots) is stored in non-stable Maps that are wiped on every deployment
- `upiConfig` is a non-stable var that resets to defaults on every deployment
- Counters (depositCounter, slotCounter, etc.) are non-stable, resetting to 0 on deployment
- `UserRecord` and `UserProfile` have no `isFrozen` field; freeze/unfreeze is frontend-only local state
- Backend has no `freezeUser`/`unfreezeUser` methods
- `getMyDeposits` is missing from the Candid IDL factory, causing payment history to fail silently
- `useInternetIdentity.ts` has `authClient` in effect deps, causing a brief double-init that can reset AdminPage `pinVerified` state
- AdminPage `toggleFreeze` uses local Set<string> state — resets on page refresh, not synced to backend
- UPI config in AdminPage uses `(actor as any).getUpiConfig()` unnecessarily and admin-saved changes are wiped by each deployment

## Requested Changes (Diff)

### Add
- `isFrozen: Bool` field to `UserRecord` and `UserProfile` (backend + IDL + frontend types)
- `system func preupgrade()` — serializes all runtime Maps to stable backing arrays
- `system func postupgrade()` — deserializes stable arrays back into runtime Maps
- Stable backing arrays for all Maps: `_usersStable`, `_depositsStable`, `_slotsStable`, `_withdrawalsStable`, `_userUniqueIdsStable`, `_userClaimAttemptsStable`
- `stable var` counters: `depositCounter`, `slotCounter`, `withdrawalCounter`, `userCounter`
- `stable var upiConfig` — persists across deployments
- Backend method `freezeUser(target: Principal): async R<Text>` (admin only)
- Backend method `unfreezeUser(target: Principal): async R<Text>` (admin only)
- `getMyDeposits` added to IDL factory
- `freezeUser`/`unfreezeUser` added to IDL factory, backend.d.ts, backend.ts, actorTypes.ts

### Modify
- `getOrCreateRecord` — initialize new users with `isFrozen = false`
- `toProfile` — include `isFrozen` from UserRecord
- `claimReward` and `requestWithdrawal` — check `isFrozen` before allowing operation
- `useInternetIdentity.ts` — remove `authClient` from useEffect dependency array to prevent double-init loop
- `AdminPage.tsx` toggleFreeze — replace local Set state with actual `actor.freezeUser`/`actor.unfreezeUser` calls; read `isFrozen` from UserProfile returned by backend
- `AdminPage.tsx` UPI section — use typed `actor.getUpiConfig()` instead of `(actor as any)`, add retry/reload button

### Remove
- Local `frozenUsers: Set<string>` state in AdminPage — replaced by backend isFrozen field

## Implementation Plan
1. Rewrite `src/backend/main.mo` with stable storage hooks, isFrozen field, freezeUser/unfreezeUser methods
2. Update `src/frontend/src/declarations/backend.did.js` with new IDL entries
3. Update `src/frontend/src/backend.d.ts` and `src/frontend/src/backend.ts` with new method signatures
4. Update `src/frontend/src/actorTypes.ts` to include isFrozen and new methods
5. Fix `src/frontend/src/hooks/useInternetIdentity.ts` auth loop
6. Update `src/frontend/src/components/AdminPage.tsx` with real backend freeze/unfreeze and fixed UPI config
