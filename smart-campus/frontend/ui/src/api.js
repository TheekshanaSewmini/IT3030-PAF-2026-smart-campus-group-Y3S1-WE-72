import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");

const api = axios.create({
    baseURL: normalizedBaseUrl,
    withCredentials: true,
});

export const getGoogleOAuthLoginUrl = () => `${normalizedBaseUrl}/oauth2/authorization/google`;

// Keep these exported for backward compatibility with existing imports.
export const getStoredAccessToken = () => "";
export const setStoredAccessToken = () => {};
export const clearStoredAccessToken = () => {};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((request) => {
        if (error) {
            request.reject(error);
            return;
        }

        request.resolve(token);
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || "";
        const isRefreshRequest = requestUrl.includes("/auth/refresh");
        const isAuthBootstrapRequest =
            requestUrl.includes("/auth/login") ||
            requestUrl.includes("/auth/register") ||
            requestUrl.includes("/auth/check-phone") ||
            requestUrl.includes("/auth/verify-code") ||
            requestUrl.includes("/auth/resend-otp");

        const responseStatus = error.response?.status;

        // Log error details for debugging
        console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${requestUrl}`, {
            status: responseStatus,
            message: error.message,
            data: error.response?.data,
        });

        const shouldTryRefresh = responseStatus === 401;

        if (
            shouldTryRefresh &&
            !originalRequest?._retry &&
            !isRefreshRequest &&
            !isAuthBootstrapRequest
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => api(originalRequest))
                    .catch((queueError) => Promise.reject(queueError));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await api.post("/auth/refresh");
                processQueue(null, "refreshed");
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                try {
                    await api.post("/auth/logout");
                } catch {
                    // Ignore logout failures here; redirect is the important action.
                }
                if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                    window.location.replace("/login");
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Resource endpoints
export const resourceApi = {
    getAll: () => api.get("/facilities"),
    getById: (id) => api.get(`/facilities/${id}`),
    search: (params) => api.get("/facilities", { params }),
    create: (formData) => api.post("/facilities", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    update: (id, formData) => api.put(`/facilities/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    updateStatus: (id, status) => api.patch(`/facilities/${id}/status`, null, {
        params: { status },
    }),
    delete: (id) => api.delete(`/facilities/${id}`),
};

// Booking endpoints
export const bookingApi = {
    create: (payload) => api.post("/booking/create", payload),
    update: (bookingId, payload) => api.put(`/booking/${bookingId}`, payload),
    cancel: (bookingId) => api.delete(`/booking/${bookingId}`),
    getMy: () => api.get("/booking/my"),
    getAll: () => api.get("/booking/all"),
    getPending: () => api.get("/booking/pending"),
    approve: (bookingId) => api.patch(`/booking/${bookingId}/approve`),
    reject: (bookingId) => api.patch(`/booking/${bookingId}/reject`),
    getAvailableResources: (params) => api.get("/booking/available-resources", { params }),
    getResourceAvailability: (facilityAssetId, params) =>
        api.get(`/booking/resources/${facilityAssetId}/availability`, { params }),
};

export const notificationApi = {
    getMy: () => api.get("/notifications"),
    getUnreadCount: () => api.get("/notifications/unread-count"),
    markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
    markAllAsRead: () => api.patch("/notifications/read-all"),
    delete: (notificationId) => api.delete(`/notifications/${notificationId}`),
};

export default api;
