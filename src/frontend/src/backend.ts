/* eslint-disable */

// @ts-nocheck

import { Actor, HttpAgent, type HttpAgentOptions, type ActorConfig, type Agent, type ActorSubclass } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { idlFactory, type _SERVICE } from "./declarations/backend.did";

export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export class ExternalBlob {
    _blob?: Uint8Array<ArrayBuffer> | null;
    directURL: string;
    onProgress?: (percentage: number) => void = undefined;
    private constructor(directURL: string, blob: Uint8Array<ArrayBuffer> | null) {
        if (blob) { this._blob = blob; }
        this.directURL = directURL;
    }
    static fromURL(url: string): ExternalBlob {
        return new ExternalBlob(url, null);
    }
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob {
        const url = URL.createObjectURL(new Blob([new Uint8Array(blob)], { type: 'application/octet-stream' }));
        return new ExternalBlob(url, blob);
    }
    public async getBytes(): Promise<Uint8Array<ArrayBuffer>> {
        if (this._blob) return this._blob;
        const response = await fetch(this.directURL);
        const blob = await response.blob();
        this._blob = new Uint8Array(await blob.arrayBuffer());
        return this._blob;
    }
    public getDirectURL(): string { return this.directURL; }
    public withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
        this.onProgress = onProgress;
        return this;
    }
}

export interface backendInterface {
    getServerTime(): Promise<bigint>;
    getUpiConfig(): Promise<any>;
    setUpiConfig(upiId: string, accountName: string, displayName: string, customQrUrl: [] | [string]): Promise<{ ok: string } | { err: string }>;
    getMyProfile(): Promise<any>;
    purchaseSlot(amount: bigint, termsAccepted: boolean): Promise<{ ok: bigint } | { err: string }>;
    claimReward(slotId: bigint): Promise<{ ok: bigint } | { err: string }>;
    requestWithdrawal(amount: bigint): Promise<{ ok: bigint } | { err: string }>;
    setBankDetails(ifsc: string, bankName: string, branchName: string, accountNumber: string, holderName: string, phone: string): Promise<{ ok: string } | { err: string }>;
    lookupIFSC(ifsc: string): Promise<{ ok: any } | { err: string }>;
    getMySlots(): Promise<any[]>;
    getMyWithdrawals(): Promise<any[]>;
    getBankDetails(): Promise<[] | [any]>;
    getPendingDeposits(): Promise<{ ok: any[] } | { err: string }>;
    getAllDeposits(): Promise<{ ok: any[] } | { err: string }>;
    approveDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    rejectDeposit(depositId: bigint): Promise<{ ok: string } | { err: string }>;
    getFlaggedUsers(): Promise<{ ok: any[] } | { err: string }>;
    unflagUser(target: Principal): Promise<{ ok: string } | { err: string }>;
    completeWithdrawal(withdrawalId: bigint): Promise<{ ok: string } | { err: string }>;
    rejectWithdrawal(withdrawalId: bigint): Promise<{ ok: string } | { err: string }>;
    addFunds(target: Principal, amount: bigint): Promise<{ ok: string } | { err: string }>;
    getAllWithdrawals(): Promise<{ ok: any[] } | { err: string }>;
    getAllUsers(): Promise<{ ok: any[] } | { err: string }>;
    getMyDeposits(): Promise<any[]>;
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    getCallerUserRole(): Promise<any>;
    isCallerAdmin(): Promise<boolean>;
}

export class Backend implements backendInterface {
    constructor(
        private actor: ActorSubclass<_SERVICE>,
        private _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
        private _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
        private processError?: (error: unknown) => never
    ) {}

    private async call<T>(fn: () => Promise<T>): Promise<T> {
        try { return await fn(); }
        catch (e) { if (this.processError) return this.processError(e); throw e; }
    }

    getServerTime() { return this.call(() => this.actor.getServerTime()); }
    getUpiConfig() { return this.call(() => this.actor.getUpiConfig()); }
    setUpiConfig(upiId: string, accountName: string, displayName: string, customQrUrl: [] | [string]) {
        return this.call(() => this.actor.setUpiConfig(upiId, accountName, displayName, customQrUrl));
    }
    getMyProfile() { return this.call(() => this.actor.getMyProfile()); }
    purchaseSlot(amount: bigint, termsAccepted: boolean) {
        return this.call(() => this.actor.purchaseSlot(amount, termsAccepted));
    }
    claimReward(slotId: bigint) { return this.call(() => this.actor.claimReward(slotId)); }
    requestWithdrawal(amount: bigint) { return this.call(() => this.actor.requestWithdrawal(amount)); }
    setBankDetails(ifsc: string, bankName: string, branchName: string, accountNumber: string, holderName: string, phone: string) {
        return this.call(() => this.actor.setBankDetails(ifsc, bankName, branchName, accountNumber, holderName, phone));
    }
    lookupIFSC(ifsc: string) { return this.call(() => this.actor.lookupIFSC(ifsc)); }
    getMySlots() { return this.call(() => this.actor.getMySlots()); }
    getMyWithdrawals() { return this.call(() => this.actor.getMyWithdrawals()); }
    getBankDetails() { return this.call(() => this.actor.getBankDetails()); }
    getPendingDeposits() { return this.call(() => this.actor.getPendingDeposits()); }
    getAllDeposits() { return this.call(() => this.actor.getAllDeposits()); }
    approveDeposit(depositId: bigint) { return this.call(() => this.actor.approveDeposit(depositId)); }
    rejectDeposit(depositId: bigint) { return this.call(() => this.actor.rejectDeposit(depositId)); }
    getFlaggedUsers() { return this.call(() => this.actor.getFlaggedUsers()); }
    unflagUser(target: Principal) { return this.call(() => this.actor.unflagUser(target)); }
    completeWithdrawal(withdrawalId: bigint) { return this.call(() => this.actor.completeWithdrawal(withdrawalId)); }
    rejectWithdrawal(withdrawalId: bigint) { return this.call(() => this.actor.rejectWithdrawal(withdrawalId)); }
    addFunds(target: Principal, amount: bigint) { return this.call(() => this.actor.addFunds(target, amount)); }
    getAllWithdrawals() { return this.call(() => this.actor.getAllWithdrawals()); }
    getAllUsers() { return this.call(() => this.actor.getAllUsers()); }
    getMyDeposits(): Promise<any[]> { return this.call(() => (this.actor as any).getMyDeposits()); }
    _initializeAccessControlWithSecret(secret: string) {
        return this.call(() => this.actor._initializeAccessControlWithSecret(secret));
    }
    getCallerUserRole() { return this.call(() => this.actor.getCallerUserRole()); }
    isCallerAdmin() { return this.call(() => this.actor.isCallerAdmin()); }
}

export interface CreateActorOptions {
    agent?: Agent;
    agentOptions?: HttpAgentOptions;
    actorOptions?: ActorConfig;
    processError?: (error: unknown) => never;
}

export function createActor(
    canisterId: string,
    _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>,
    _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>,
    options: CreateActorOptions = {}
): Backend {
    const agent = options.agent || HttpAgent.createSync({ ...options.agentOptions });
    if (options.agent && options.agentOptions) {
        console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
    }
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId,
        ...options.actorOptions
    });
    return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
