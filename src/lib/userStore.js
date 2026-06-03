import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const storeName = "interview-users";
const localDataPath = path.join(process.cwd(), ".local-data", "interview-users.json");

export const defaultProfile = {
    userId: "",
    email: "",
    displayName: "",
    background: "",
    experiences: "",
    projects: "",
    targetRole: "",
    extraNotes: "",
    balanceMinutes: 0,
    totalDepositedMinutes: 0,
    totalUsedMinutes: 0,
    createdAt: "",
    updatedAt: ""
};

function safeUserId(userId) {
    return String(userId || "")
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .slice(0, 96);
}

function makeProfile(userId, existing = {}, authUser = {}) {
    const now = new Date().toISOString();

    return {
        ...defaultProfile,
        ...existing,
        userId,
        email: authUser.email || existing.email || "",
        displayName: existing.displayName || authUser.name || "",
        balanceMinutes: Number(existing.balanceMinutes || 0),
        totalDepositedMinutes: Number(existing.totalDepositedMinutes || 0),
        totalUsedMinutes: Number(existing.totalUsedMinutes || 0),
        createdAt: existing.createdAt || now,
        updatedAt: now
    };
}

async function readLocalData() {
    try {
        return JSON.parse(await readFile(localDataPath, "utf8"));
    } catch {
        return {};
    }
}

async function writeLocalData(data) {
    await mkdir(path.dirname(localDataPath), { recursive: true });
    await writeFile(localDataPath, JSON.stringify(data, null, 2));
}

function shouldUseLocalStore() {
    return !process.env.NETLIFY && !process.env.NETLIFY_BLOBS_CONTEXT;
}

async function readBlobProfile(userId) {
    const store = getStore(storeName);
    return store.get(`profiles/${userId}`, {
        consistency: "strong",
        type: "json"
    });
}

async function writeBlobProfile(userId, profile) {
    const store = getStore(storeName);
    await store.setJSON(`profiles/${userId}`, profile);
}

export async function getUserProfile(userIdInput, authUser = {}) {
    const userId = safeUserId(userIdInput);

    if (!userId) {
        throw new Error("Missing user id.");
    }

    if (shouldUseLocalStore()) {
        const data = await readLocalData();
        const profile = makeProfile(userId, data[userId], authUser);

        if (!data[userId]) {
            data[userId] = profile;
            await writeLocalData(data);
        }

        return profile;
    }

    const storedProfile = await readBlobProfile(userId);
    const profile = makeProfile(userId, storedProfile || {}, authUser);

    if (!storedProfile) {
        await writeBlobProfile(userId, profile);
    }

    return profile;
}

export async function saveUserProfile(userIdInput, updates, authUser = {}) {
    const userId = safeUserId(userIdInput);
    const current = await getUserProfile(userId, authUser);
    const profile = makeProfile(userId, {
        ...current,
        ...updates,
        balanceMinutes: current.balanceMinutes,
        totalDepositedMinutes: current.totalDepositedMinutes,
        totalUsedMinutes: current.totalUsedMinutes
    }, authUser);

    if (shouldUseLocalStore()) {
        const data = await readLocalData();
        data[userId] = profile;
        await writeLocalData(data);
        return profile;
    }

    await writeBlobProfile(userId, profile);
    return profile;
}

export async function addBalanceMinutes(userIdInput, minutesInput, authUser = {}) {
    const userId = safeUserId(userIdInput);
    const minutes = Math.max(0, Number(minutesInput || 0));
    const current = await getUserProfile(userId, authUser);
    const profile = makeProfile(userId, {
        ...current,
        balanceMinutes: current.balanceMinutes + minutes,
        totalDepositedMinutes: current.totalDepositedMinutes + minutes
    }, authUser);

    if (shouldUseLocalStore()) {
        const data = await readLocalData();
        data[userId] = profile;
        await writeLocalData(data);
        return profile;
    }

    await writeBlobProfile(userId, profile);
    return profile;
}

export async function spendBalanceMinutes(userIdInput, minutesInput, authUser = {}) {
    const userId = safeUserId(userIdInput);
    const minutes = Math.max(0, Number(minutesInput || 0));
    const current = await getUserProfile(userId, authUser);

    if (current.balanceMinutes <= 0) {
        return {
            profile: current,
            chargedMinutes: 0,
            hasBalance: false
        };
    }

    const chargedMinutes = Math.min(current.balanceMinutes, minutes);
    const profile = makeProfile(userId, {
        ...current,
        balanceMinutes: Math.max(0, current.balanceMinutes - chargedMinutes),
        totalUsedMinutes: current.totalUsedMinutes + chargedMinutes
    }, authUser);

    if (shouldUseLocalStore()) {
        const data = await readLocalData();
        data[userId] = profile;
        await writeLocalData(data);
        return {
            profile,
            chargedMinutes,
            hasBalance: profile.balanceMinutes > 0
        };
    }

    await writeBlobProfile(userId, profile);
    return {
        profile,
        chargedMinutes,
        hasBalance: profile.balanceMinutes > 0
    };
}
