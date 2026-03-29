import Time "mo:core/Time";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Option "mo:core/Option";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Outcall "http-outcalls/outcall";

actor class WealthStream() = this {

  type R<T> = { #ok: T; #err: Text };
  type DepositStatus = { #Pending; #Approved; #Rejected };
  type WithdrawalStatus = { #Pending; #Completed; #Rejected };
  type SlotStatus = { #Active; #Closed };

  public type BankDetails = {
    ifsc: Text;
    bankName: Text;
    branchName: Text;
    accountNumber: Text;
    holderName: Text;
    phone: Text;
    updateCount: Nat;
    lastUpdateYear: Int;
    lastUpdateMonth: Nat;
  };

  // Stored type — no uniqueId (backward-compatible with existing stable data)
  public type UserRecord = {
    userId: Principal;
    depositedBalance: Nat;
    withdrawableBalance: Nat;
    frozenBalance: Nat;
    isAdmin: Bool;
    isFlagged: Bool;
    bankDetails: ?BankDetails;
  };

  // Full type returned to clients — includes uniqueId
  public type UserProfile = {
    userId: Principal;
    uniqueId: Text;
    depositedBalance: Nat;
    withdrawableBalance: Nat;
    frozenBalance: Nat;
    isAdmin: Bool;
    isFlagged: Bool;
    bankDetails: ?BankDetails;
  };

  public type DepositRequest = {
    id: Nat;
    userId: Principal;
    amount: Nat;
    status: DepositStatus;
    createdAt: Int;
  };

  public type ClaimWindow = {
    hourIndex: Nat;
    windowOpenTime: Int;
    claimedAt: ?Int;
    expired: Bool;
  };

  public type InvestmentSlot = {
    id: Nat;
    userId: Principal;
    amount: Nat;
    totalReturn: Nat;
    startTime: Int;
    claimWindows: [ClaimWindow];
    status: SlotStatus;
  };

  public type WithdrawalRequest = {
    id: Nat;
    userId: Principal;
    amount: Nat;
    bankSnapshot: ?BankDetails;
    status: WithdrawalStatus;
    createdAt: Int;
  };

  public type IFSCResult = {
    bankName: Text;
    branchName: Text;
    address: Text;
    city: Text;
    state: Text;
  };

  public type UpiConfig = {
    upiId: Text;
    accountName: Text;
    displayName: Text;
    customQrUrl: ?Text;
  };

  let accessControlState = AccessControl.initState();

  // Existing stable map — type unchanged, no migration error
  var users = Map.empty<Principal, UserRecord>();
  // Separate stable map for unique IDs — new, starts empty on upgrade (ok)
  var userUniqueIds = Map.empty<Principal, Text>();
  var userClaimAttempts = Map.empty<Principal, [Int]>();
  var deposits = Map.empty<Nat, DepositRequest>();
  var slots = Map.empty<Nat, InvestmentSlot>();
  var withdrawals = Map.empty<Nat, WithdrawalRequest>();

  var depositCounter : Nat = 0;
  var slotCounter : Nat = 0;
  var withdrawalCounter : Nat = 0;
  var userCounter : Nat = 0;

  var upiConfig : UpiConfig = {
    upiId = "turbohacker4-2@okaxis";
    accountName = "Iqlas Dar";
    displayName = "WealthStream";
    customQrUrl = null;
  };

  let VALID_AMOUNTS : [Nat] = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 3200];
  let HOUR_NS : Int = 3_600_000_000_000;
  let WINDOW_NS : Int = 300_000_000_000;
  let MIN_WITHDRAWAL : Nat = 200;

  let CHARS : [Text] = ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R","S","T","U","V","W","X","Y","Z","2","3","4","5","6","7","8","9"];

  include MixinAuthorization(accessControlState);

  func generateUniqueId(counter : Nat) : Text {
    let now = Int.abs(Time.now());
    let seed = now + counter * 999983;
    var result = "WS-";
    var n = seed;
    var i = 0;
    while (i < 8) {
      let idx = n % 32;
      result := result # CHARS[idx];
      n := n / 32 + (n % 7) * 1000003;
      i += 1;
    };
    result
  };

  func getOrCreateUniqueId(caller : Principal) : Text {
    switch (userUniqueIds.get(caller)) {
      case (?uid) uid;
      case null {
        userCounter += 1;
        let uid = generateUniqueId(userCounter);
        userUniqueIds.add(caller, uid);
        uid
      };
    }
  };

  func toProfile(rec : UserRecord) : UserProfile {
    {
      userId = rec.userId;
      uniqueId = getOrCreateUniqueId(rec.userId);
      depositedBalance = rec.depositedBalance;
      withdrawableBalance = rec.withdrawableBalance;
      frozenBalance = rec.frozenBalance;
      isAdmin = rec.isAdmin;
      isFlagged = rec.isFlagged;
      bankDetails = rec.bankDetails;
    }
  };

  func getOrCreateRecord(caller : Principal) : UserRecord {
    switch (users.get(caller)) {
      case (?u) u;
      case null {
        ignore getOrCreateUniqueId(caller);
        let u : UserRecord = {
          userId = caller;
          depositedBalance = 0;
          withdrawableBalance = 0;
          frozenBalance = 0;
          isAdmin = false;
          isFlagged = false;
          bankDetails = null;
        };
        users.add(caller, u);
        u
      };
    }
  };

  func isAdminCaller(caller : Principal) : Bool {
    AccessControl.isAdmin(accessControlState, caller)
  };

  func isValidAmount(amount : Nat) : Bool {
    VALID_AMOUNTS.find(func(a : Nat) : Bool { a == amount }).isSome()
  };

  func buildClaimWindows(startTime : Int) : [ClaimWindow] {
    Array.tabulate<ClaimWindow>(10, func(i) {
      {
        hourIndex = i;
        windowOpenTime = startTime + (i * HOUR_NS);
        claimedAt = null;
        expired = false;
      }
    })
  };

  func updateSlotStatus(slot : InvestmentSlot) : InvestmentSlot {
    let now = Time.now();
    let updatedWindows = slot.claimWindows.map(func(w : ClaimWindow) : ClaimWindow {
      if (w.claimedAt.isSome() or w.expired) return w;
      if (now > w.windowOpenTime + WINDOW_NS) {
        { w with expired = true }
      } else { w }
    });
    let allDone = updatedWindows.all(func(w : ClaimWindow) : Bool {
      w.claimedAt.isSome() or w.expired
    });
    { slot with claimWindows = updatedWindows; status = if (allDone) #Closed else #Active }
  };

  func extractJsonField(json : Text, field : Text) : Text {
    let key = "\"" # field # "\":\"";
    let parts = json.split(#text(key)).toArray();
    if (parts.size() > 1) {
      let valueParts = parts[1].split(#text("\"")).toArray();
      if (valueParts.size() > 0) return valueParts[0];
    };
    ""
  };

  func getCurrentYearMonth() : (Int, Nat) {
    let nowSec = Time.now() / 1_000_000_000;
    let days = nowSec / 86400;
    let year = days / 365 + 1970;
    let dayOfYear = Int.abs(days) % 365;
    let month = dayOfYear / 30 + 1;
    (year, month)
  };

  func collectSlots(caller : Principal) : [InvestmentSlot] {
    var result : [InvestmentSlot] = [];
    for ((_, slot) in slots.entries()) {
      if (Principal.equal(slot.userId, caller)) {
        result := result.concat([updateSlotStatus(slot)]);
      };
    };
    result
  };

  func collectWithdrawals(caller : Principal) : [WithdrawalRequest] {
    var result : [WithdrawalRequest] = [];
    for ((_, w) in withdrawals.entries()) {
      if (Principal.equal(w.userId, caller)) {
        result := result.concat([w]);
      };
    };
    result
  };

  func collectPendingDeposits() : [DepositRequest] {
    var result : [DepositRequest] = [];
    for ((_, d) in deposits.entries()) {
      switch (d.status) {
        case (#Pending) { result := result.concat([d]); };
        case _ {};
      };
    };
    result
  };

  func collectAllDeposits() : [DepositRequest] {
    var result : [DepositRequest] = [];
    for ((_, d) in deposits.entries()) {
      result := result.concat([d]);
    };
    result
  };

  func collectAllWithdrawals() : [WithdrawalRequest] {
    var result : [WithdrawalRequest] = [];
    for ((_, w) in withdrawals.entries()) {
      result := result.concat([w]);
    };
    result
  };

  func collectFlaggedUsers() : [UserProfile] {
    var result : [UserProfile] = [];
    for ((_, u) in users.entries()) {
      if (u.isFlagged) result := result.concat([toProfile(u)]);
    };
    result
  };

  func collectAllUsers() : [UserProfile] {
    var result : [UserProfile] = [];
    for ((_, u) in users.entries()) {
      result := result.concat([toProfile(u)]);
    };
    result
  };

  public query func getServerTime() : async Int {
    Time.now()
  };

  public query func getUpiConfig() : async UpiConfig {
    upiConfig
  };

  public shared(msg) func setUpiConfig(
    newUpiId : Text,
    newAccountName : Text,
    newDisplayName : Text,
    newCustomQrUrl : ?Text
  ) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    upiConfig := {
      upiId = newUpiId;
      accountName = newAccountName;
      displayName = newDisplayName;
      customQrUrl = newCustomQrUrl;
    };
    #ok("UPI config updated")
  };

  public shared(msg) func getMyProfile() : async UserProfile {
    toProfile(getOrCreateRecord(msg.caller))
  };

  public shared(msg) func purchaseSlot(amount : Nat, termsAccepted : Bool) : async R<Nat> {
    if (not termsAccepted) return #err("Must accept terms and conditions");
    if (not isValidAmount(amount)) return #err("Invalid investment amount");
    let caller = msg.caller;
    ignore getOrCreateRecord(caller);
    depositCounter += 1;
    let req : DepositRequest = {
      id = depositCounter;
      userId = caller;
      amount = amount;
      status = #Pending;
      createdAt = Time.now();
    };
    deposits.add(depositCounter, req);
    let user = getOrCreateRecord(caller);
    users.add(caller, { user with frozenBalance = user.frozenBalance + amount });
    #ok(depositCounter)
  };

  public shared(msg) func claimReward(slotId : Nat) : async R<Nat> {
    let caller = msg.caller;
    let user = switch (users.get(caller)) {
      case (?u) u;
      case null return #err("User not found");
    };
    if (user.isFlagged) return #err("Account flagged. Contact support.");
    var slot = switch (slots.get(slotId)) {
      case (?s) s;
      case null return #err("Slot not found");
    };
    if (not Principal.equal(slot.userId, caller)) return #err("Not your slot");
    slot := updateSlotStatus(slot);
    if (slot.status == #Closed) return #err("Slot is closed");

    let now = Time.now();
    let prevAttempts = switch (userClaimAttempts.get(caller)) {
      case (?a) a; case null []
    };
    let recentAttempts = prevAttempts.filter(func(t : Int) : Bool { now - t < 60_000_000_000 });
    if (recentAttempts.size() > 5) {
      users.add(caller, { user with isFlagged = true });
      return #err("Suspicious activity detected. Account flagged.");
    };
    userClaimAttempts.add(caller, recentAttempts.concat([now]));

    var claimAmount : ?Nat = null;
    let updatedWindows = slot.claimWindows.map(func(w : ClaimWindow) : ClaimWindow {
      if (claimAmount.isSome()) return w;
      if (w.claimedAt.isSome() or w.expired) return w;
      if (now >= w.windowOpenTime and now <= w.windowOpenTime + WINDOW_NS) {
        claimAmount := ?(slot.totalReturn / 10);
        { w with claimedAt = ?now }
      } else { w }
    });

    switch (claimAmount) {
      case null return #err("No claim window currently open");
      case (?amt) {
        let allDone = updatedWindows.all(func(w : ClaimWindow) : Bool {
          w.claimedAt.isSome() or w.expired
        });
        slots.add(slotId, { slot with claimWindows = updatedWindows; status = if (allDone) #Closed else #Active });
        users.add(caller, { user with withdrawableBalance = user.withdrawableBalance + amt });
        #ok(amt)
      };
    }
  };

  public shared(msg) func requestWithdrawal(amount : Nat) : async R<Nat> {
    let caller = msg.caller;
    let user = switch (users.get(caller)) {
      case (?u) u; case null return #err("User not found");
    };
    if (user.isFlagged) return #err("Account is flagged. Contact support.");
    if (amount < MIN_WITHDRAWAL) return #err("Minimum withdrawal is 200");
    if (user.withdrawableBalance < amount) return #err("Insufficient withdrawable balance");
    withdrawalCounter += 1;
    let req : WithdrawalRequest = {
      id = withdrawalCounter;
      userId = caller;
      amount = amount;
      bankSnapshot = user.bankDetails;
      status = #Pending;
      createdAt = Time.now();
    };
    withdrawals.add(withdrawalCounter, req);
    users.add(caller, { user with withdrawableBalance = user.withdrawableBalance - amount });
    #ok(withdrawalCounter)
  };

  public shared(msg) func setBankDetails(
    ifsc : Text, bankName : Text, branchName : Text,
    accountNumber : Text, holderName : Text, phone : Text
  ) : async R<Text> {
    let caller = msg.caller;
    let user = getOrCreateRecord(caller);
    let (year, month) = getCurrentYearMonth();
    let (updateCount, canUpdate) = switch (user.bankDetails) {
      case null (0, true);
      case (?bd) {
        if (bd.lastUpdateYear == year and bd.lastUpdateMonth == month) {
          (bd.updateCount, bd.updateCount < 3)
        } else { (0, true) }
      };
    };
    if (not canUpdate) return #err("Bank details can only be updated 3 times per month");
    let newBank : BankDetails = {
      ifsc; bankName; branchName; accountNumber; holderName; phone;
      updateCount = updateCount + 1;
      lastUpdateYear = year;
      lastUpdateMonth = month;
    };
    users.add(caller, { user with bankDetails = ?newBank });
    #ok("Bank details updated")
  };

  public func lookupIFSC(ifsc : Text) : async R<IFSCResult> {
    try {
      let url = "https://ifsc.razorpay.com/api/v1/" # ifsc;
      let body = await Outcall.httpGetRequest(url, [], transform);
      #ok({
        bankName = extractJsonField(body, "BANK");
        branchName = extractJsonField(body, "BRANCH");
        address = extractJsonField(body, "ADDRESS");
        city = extractJsonField(body, "CITY");
        state = extractJsonField(body, "STATE");
      })
    } catch (_) {
      #err("Failed to lookup IFSC code")
    }
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input)
  };

  public shared(msg) func getMySlots() : async [InvestmentSlot] {
    collectSlots(msg.caller)
  };

  public shared(msg) func getMyWithdrawals() : async [WithdrawalRequest] {
    collectWithdrawals(msg.caller)
  };

  public shared(msg) func getBankDetails() : async ?BankDetails {
    switch (users.get(msg.caller)) {
      case (?u) u.bankDetails; case null null
    }
  };

  public shared(msg) func getPendingDeposits() : async R<[DepositRequest]> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    #ok(collectPendingDeposits())
  };

  public shared(msg) func getAllDeposits() : async R<[DepositRequest]> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    #ok(collectAllDeposits())
  };

  public shared(msg) func approveDeposit(depositId : Nat) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    switch (deposits.get(depositId)) {
      case null return #err("Deposit not found");
      case (?dep) {
        switch (dep.status) {
          case (#Pending) {
            deposits.add(depositId, { dep with status = #Approved });
            let user = getOrCreateRecord(dep.userId);
            let startTime = Time.now();
            slotCounter += 1;
            let slot : InvestmentSlot = {
              id = slotCounter;
              userId = dep.userId;
              amount = dep.amount;
              totalReturn = dep.amount * 17 / 10;
              startTime = startTime;
              claimWindows = buildClaimWindows(startTime);
              status = #Active;
            };
            slots.add(slotCounter, slot);
            let frozen = if (user.frozenBalance >= dep.amount) user.frozenBalance - dep.amount else 0;
            users.add(dep.userId, { user with depositedBalance = user.depositedBalance + dep.amount; frozenBalance = frozen });
            #ok("Deposit approved")
          };
          case _ return #err("Not pending");
        }
      };
    }
  };

  public shared(msg) func rejectDeposit(depositId : Nat) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    switch (deposits.get(depositId)) {
      case null return #err("Deposit not found");
      case (?dep) {
        deposits.add(depositId, { dep with status = #Rejected });
        let user = getOrCreateRecord(dep.userId);
        let frozen = if (user.frozenBalance >= dep.amount) user.frozenBalance - dep.amount else 0;
        users.add(dep.userId, { user with frozenBalance = frozen });
        #ok("Deposit rejected")
      };
    }
  };

  public shared(msg) func getFlaggedUsers() : async R<[UserProfile]> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    #ok(collectFlaggedUsers())
  };

  public shared(msg) func unflagUser(target : Principal) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    switch (users.get(target)) {
      case null return #err("User not found");
      case (?u) { users.add(target, { u with isFlagged = false }); #ok("Unflagged") };
    }
  };

  public shared(msg) func completeWithdrawal(withdrawalId : Nat) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    switch (withdrawals.get(withdrawalId)) {
      case null return #err("Not found");
      case (?w) { withdrawals.add(withdrawalId, { w with status = #Completed }); #ok("Done") };
    }
  };

  public shared(msg) func rejectWithdrawal(withdrawalId : Nat) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    switch (withdrawals.get(withdrawalId)) {
      case null return #err("Not found");
      case (?w) {
        switch (w.status) {
          case (#Pending) {
            let user = getOrCreateRecord(w.userId);
            withdrawals.add(withdrawalId, { w with status = #Rejected });
            users.add(w.userId, { user with withdrawableBalance = user.withdrawableBalance + w.amount });
            #ok("Withdrawal rejected and amount refunded")
          };
          case _ return #err("Not pending");
        }
      };
    }
  };

  public shared(msg) func addFunds(target : Principal, amount : Nat) : async R<Text> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    let user = getOrCreateRecord(target);
    users.add(target, { user with depositedBalance = user.depositedBalance + amount });
    #ok("Funds added")
  };

  public shared(msg) func getAllWithdrawals() : async R<[WithdrawalRequest]> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    #ok(collectAllWithdrawals())
  };

  public shared(msg) func getAllUsers() : async R<[UserProfile]> {
    if (not isAdminCaller(msg.caller)) return #err("Not authorized");
    #ok(collectAllUsers())
  };
}
