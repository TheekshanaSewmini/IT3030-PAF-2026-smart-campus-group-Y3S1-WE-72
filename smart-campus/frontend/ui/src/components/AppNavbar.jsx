import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { normalizeRole, roleHomePath } from "../utils/roleHome";
import { HiAcademicCap, HiBell, HiCheck, HiLogout, HiTrash } from "react-icons/hi";
import api, { notificationApi } from "../api";
import { consumeWelcomePopup } from "../utils/welcomePopup";

function getUserDisplayName(profile) {
    const fullName = `${profile?.name || ""} ${profile?.lastName || ""}`.trim();
    if (fullName) {
        return fullName;
    }

    if (profile?.email) {
        return profile.email;
    }

    return "Campus User";
}

function buildAssetUrl(path) {
    if (!path) {
        return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return `${api.defaults.baseURL}${path}`;
}

function formatDateTime(value) {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    return parsed.toLocaleString();
}

export default function AppNavbar({ title, subtitle, profile, onLogout }) {
    const navigate = useNavigate();
    const notificationPanelRef = useRef(null);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [welcomePopup, setWelcomePopup] = useState(null);

    const loadUnreadCount = async () => {
        try {
            const response = await notificationApi.getUnreadCount();
            setUnreadCount(Number(response?.data?.unreadCount || 0));
        } catch (error) {
            if (error?.response?.status !== 401 && error?.response?.status !== 403) {
                console.log("Unread notification count error:", error.message);
            }
        }
    };

    const loadNotifications = async () => {
        setNotificationLoading(true);
        setNotificationError("");

        try {
            const response = await notificationApi.getMy();
            const data = Array.isArray(response.data) ? response.data : [];
            setNotifications(data);
            setUnreadCount(data.filter((notification) => !notification.isRead).length);
        } catch (error) {
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                setNotificationOpen(false);
                return;
            }
            setNotificationError("Failed to load notifications.");
        } finally {
            setNotificationLoading(false);
        }
    };

    useEffect(() => {
        if (!profile?.email) {
            return;
        }
        void loadUnreadCount();
    }, [profile?.email]);

    useEffect(() => {
        const pendingWelcome = consumeWelcomePopup();
        if (!pendingWelcome) {
            return undefined;
        }

        setWelcomePopup(pendingWelcome);
        const timeoutId = window.setTimeout(() => {
            setWelcomePopup(null);
        }, 5500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        if (!notificationOpen) {
            return undefined;
        }

        const handleOutsideClick = (event) => {
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [notificationOpen]);

    const toggleNotifications = () => {
        const nextState = !notificationOpen;
        setNotificationOpen(nextState);
        if (nextState) {
            void loadNotifications();
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await notificationApi.markAsRead(notificationId);

            setNotifications((current) => {
                let changed = false;
                const updated = current.map((notification) => {
                    if (notification.notificationId !== notificationId || notification.isRead) {
                        return notification;
                    }
                    changed = true;
                    return { ...notification, isRead: true };
                });

                if (changed) {
                    setUnreadCount((count) => Math.max(0, count - 1));
                }

                return updated;
            });
        } catch (error) {
            setNotificationError("Failed to mark notification as read.");
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            setNotificationError("Failed to mark all notifications as read.");
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await notificationApi.delete(notificationId);

            setNotifications((current) => {
                const target = current.find((item) => item.notificationId === notificationId);
                if (target && !target.isRead) {
                    setUnreadCount((count) => Math.max(0, count - 1));
                }
                return current.filter((item) => item.notificationId !== notificationId);
            });
        } catch (error) {
            setNotificationError("Failed to delete notification.");
        }
    };

    const handleLogout = async () => {
        if (onLogout) {
            await onLogout();
            return;
        }

        try {
            await api.post("/auth/logout", {}, { withCredentials: true });
        } catch (err) {
            console.log("Logout error:", err.message);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const roleLabel = normalizeRole(profile?.role) || "USER";
    const homePath = roleHomePath(profile?.role);
    const displayName = getUserDisplayName(profile);
    const initials = (profile?.name?.[0] || displayName[0] || "U").toUpperCase();
    const avatarImage = buildAssetUrl(profile?.profileImageUrl || profile?.imageUrl);
    const isAdmin = roleLabel === "ADMIN";

    return (
        <header className="top-nav top-nav--glass professional-header">
            <div className="brand-section">
                <Link to={homePath} className="brand-logo">
                    <span className="logo-icon">
                        <HiAcademicCap />
                    </span>
                    <div>
                        <h1 className="brand-text">SmartCampus</h1>
                        <p className="subtitle-text">{title}</p>
                    </div>
                </Link>
            </div>

            <nav className="nav-center">
                <div className="nav-group professional-nav">
                    <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to={homePath} end>
                        Dashboard
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/resources">
                        Resources
                    </NavLink>
                    <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} to="/booking">
                        My Bookings
                    </NavLink>
                    {isAdmin && (
                        <NavLink
                            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                            to="/admin/resources"
                        >
                            Management
                        </NavLink>
                    )}
                </div>
            </nav>

            <div className="nav-end">
                <div className="nav-user-section">
                    <div className="notification-wrap" ref={notificationPanelRef}>
                        <button
                            className="notification-btn"
                            type="button"
                            onClick={toggleNotifications}
                            title="Notifications"
                        >
                            <HiBell size={18} />
                            {unreadCount > 0 && (
                                <span className="notification-count">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {notificationOpen && (
                            <div className="notification-panel">
                                <div className="notification-panel__head">
                                    <h4>Notifications</h4>
                                    <button
                                        className="notification-link-btn"
                                        type="button"
                                        onClick={markAllAsRead}
                                        disabled={notifications.length === 0}
                                    >
                                        Mark all as read
                                    </button>
                                </div>

                                {notificationLoading && <p className="notification-empty">Loading...</p>}

                                {!notificationLoading && notificationError && (
                                    <p className="notification-error">{notificationError}</p>
                                )}

                                {!notificationLoading && !notificationError && notifications.length === 0 && (
                                    <p className="notification-empty">No notifications yet.</p>
                                )}

                                {!notificationLoading && !notificationError && notifications.length > 0 && (
                                    <div className="notification-list">
                                        {notifications.map((notification) => (
                                            <article
                                                key={notification.notificationId}
                                                className={`notification-item${notification.isRead ? "" : " unread"}`}
                                            >
                                                <h5>{notification.title}</h5>
                                                <p>{notification.message}</p>
                                                <span>{formatDateTime(notification.createdAt)}</span>
                                                <div className="notification-actions">
                                                    {!notification.isRead && (
                                                        <button
                                                            className="notification-link-btn"
                                                            type="button"
                                                            onClick={() => markAsRead(notification.notificationId)}
                                                        >
                                                            <HiCheck size={14} />
                                                            Read
                                                        </button>
                                                    )}
                                                    <button
                                                        className="notification-link-btn danger"
                                                        type="button"
                                                        onClick={() => deleteNotification(notification.notificationId)}
                                                    >
                                                        <HiTrash size={14} />
                                                        Delete
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <NavLink className="user-profile-pill" to="/profile">
                        <div className={`avatar-circle${avatarImage ? " avatar-circle--photo" : ""}`}>
                            {avatarImage ? <img src={avatarImage} alt={displayName} /> : initials}
                        </div>
                        <div className="user-info-hint">
                            <span className="user-name-text">{displayName}</span>
                            <span className="user-role-badge">{roleLabel}</span>
                        </div>
                    </NavLink>
                    <button className="logout-icon-btn" type="button" onClick={handleLogout} title="Logout">
                        <HiLogout size={18} /> <span>Logout</span>
                    </button>
                </div>
            </div>

            {welcomePopup && (
                <div className="welcome-popup" role="status" aria-live="polite">
                    <button
                        className="welcome-popup__close"
                        type="button"
                        onClick={() => setWelcomePopup(null)}
                        aria-label="Close welcome message"
                    >
                        x
                    </button>
                    <p className="welcome-popup__eyebrow">{welcomePopup.role}</p>
                    <h4>Hello, {welcomePopup.displayName}!</h4>
                    <p>{welcomePopup.message}</p>
                </div>
            )}
        </header>
    );
}
