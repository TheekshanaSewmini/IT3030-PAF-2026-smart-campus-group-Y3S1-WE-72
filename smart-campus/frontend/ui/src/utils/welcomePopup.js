import { normalizeRole } from "./roleHome";

const WELCOME_POPUP_STORAGE_KEY = "smartcampus.login.welcome";

function buildRoleMessage(role) {
    switch (role) {
        case "ADMIN":
            return "Great to see you. Your dashboard is ready with new approvals and updates.";
        case "TECHNICIAN":
            return "Welcome back. Your technician workspace is ready for today.";
        default:
            return "Happy to have you here. Your campus dashboard is ready to go.";
    }
}

export function queueWelcomePopup(user) {
    if (typeof window === "undefined" || !window.sessionStorage) {
        return;
    }

    const role = normalizeRole(user?.role) || "USER";
    const firstName = user?.name || user?.firstname || user?.firstName || "";
    const lastName = user?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName = fullName || user?.email || "there";

    const payload = {
        role,
        displayName,
        message: buildRoleMessage(role),
        createdAt: Date.now(),
    };

    window.sessionStorage.setItem(
        WELCOME_POPUP_STORAGE_KEY,
        JSON.stringify(payload)
    );
}

export function consumeWelcomePopup() {
    if (typeof window === "undefined" || !window.sessionStorage) {
        return null;
    }

    const raw = window.sessionStorage.getItem(WELCOME_POPUP_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    window.sessionStorage.removeItem(WELCOME_POPUP_STORAGE_KEY);

    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}
