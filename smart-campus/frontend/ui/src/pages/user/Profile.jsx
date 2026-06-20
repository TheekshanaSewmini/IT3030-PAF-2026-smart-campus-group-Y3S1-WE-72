import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { bookingApi } from "../../api";
import { normalizeRole } from "../../utils/roleHome";
import AppNavbar from "../../components/AppNavbar";
import "./Profile.css";

const YEAR_OPTIONS = ["FIRST", "SECOND", "THIRD", "FOURTH"];
const SEMESTER_OPTIONS = ["SEM1", "SEM2"];

function buildAssetUrl(path) {
    if (!path) {
        return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    return `${api.defaults.baseURL}${path}`;
}

function formatDate(dateText) {
    if (!dateText) {
        return "-";
    }

    const parsed = new Date(`${dateText}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? dateText : parsed.toLocaleDateString();
}

function formatTime(timeText) {
    if (!timeText) {
        return "-";
    }

    const [hours, minutes] = String(timeText).split(":");
    if (hours === undefined || minutes === undefined) {
        return timeText;
    }

    const parsed = new Date();
    parsed.setHours(Number(hours), Number(minutes), 0, 0);
    return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function statusClass(status) {
    return `status-badge booking-status ${(status || "").toLowerCase()}`;
}

function getErrorMessage(error, fallback) {
    const payload = error?.response?.data;

    if (typeof payload === "string" && payload.trim()) {
        return payload;
    }

    if (payload?.message) {
        return payload.message;
    }

    return fallback;
}

export default function Profile() {
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState({ type: "", text: "" });
    const [detailsForm, setDetailsForm] = useState({
        phoneNumber: "",
        year: "",
        semester: "",
    });
    const [savingDetails, setSavingDetails] = useState(false);
    const [isEditingDetails, setIsEditingDetails] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [profileResponse, bookingsResponse] = await Promise.all([
                    api.get("/user/me"),
                    bookingApi.getMy(),
                ]);

                const profileData = profileResponse.data;
                setProfile(profileData);
                setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
                setDetailsForm({
                    phoneNumber: profileData?.phoneNumber || "",
                    year: profileData?.year || "",
                    semester: profileData?.semester || "",
                });
            } catch (loadError) {
                const status = loadError.response?.status;

                if (status === 401 || status === 403) {
                    navigate("/login", { replace: true });
                    return;
                }

                setError(getErrorMessage(loadError, "Failed to load profile."));
            }
        };

        loadData();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout", {}, { withCredentials: true });
        } catch (logoutError) {
            console.log("Logout error:", logoutError.message);
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const completionStats = useMemo(() => {
        const checks = [
            { label: "First Name", value: profile?.name },
            { label: "Last Name", value: profile?.lastName },
            { label: "Email", value: profile?.email },
            { label: "Phone Number", value: profile?.phoneNumber },
            { label: "Academic Year", value: profile?.year },
            { label: "Semester", value: profile?.semester },
            { label: "Profile Image", value: profile?.profileImageUrl },
            { label: "Cover Image", value: profile?.coverImageUrl },
        ];

        const filled = checks.filter((item) => String(item.value || "").trim()).length;
        const total = checks.length;
        const percentage = Math.round((filled / total) * 100);
        const missing = checks.filter((item) => !String(item.value || "").trim());

        return { filled, total, percentage, missing };
    }, [profile]);

    const syncDetailsFormWithProfile = () => {
        setDetailsForm({
            phoneNumber: profile?.phoneNumber || "",
            year: profile?.year || "",
            semester: profile?.semester || "",
        });
    };

    const startEditingDetails = () => {
        syncDetailsFormWithProfile();
        setNotice({ type: "", text: "" });
        setIsEditingDetails(true);
    };

    const cancelEditingDetails = () => {
        syncDetailsFormWithProfile();
        setNotice({ type: "", text: "" });
        setIsEditingDetails(false);
    };

    const saveAcademicDetails = async () => {
        setNotice({ type: "", text: "" });
        setSavingDetails(true);

        try {
            const payload = {
                phoneNumber: detailsForm.phoneNumber.trim() || null,
                year: detailsForm.year || null,
                semester: detailsForm.semester || null,
            };

            const response = await api.put("/user/update-profile-details", payload);
            const updatedProfile = response?.data;

            setProfile((prev) => ({ ...prev, ...updatedProfile }));
            setNotice({ type: "success", text: "Academic and contact details updated." });
            setIsEditingDetails(false);
        } catch (saveError) {
            setNotice({ type: "error", text: getErrorMessage(saveError, "Failed to update details.") });
        } finally {
            setSavingDetails(false);
        }
    };

    if (!profile && !error) {
        return (
            <div className="loading-center">
                <div className="spinner" />
                <p>Loading profile...</p>
            </div>
        );
    }

    const profileImage = buildAssetUrl(profile?.profileImageUrl);
    const coverImage = buildAssetUrl(profile?.coverImageUrl);
    const roleLabel = normalizeRole(profile?.role) || "USER";
    const initials = (profile?.name?.[0] || "U").toUpperCase();
    const fullName = `${profile?.name || ""} ${profile?.lastName || ""}`.trim();

    return (
        <div className="page-shell profile-page">
            <div className="bg-layer bg-user" />
            <div className="panel page-panel">
                <AppNavbar
                    title="Profile"
                    subtitle="Your account details and booking history."
                    profile={profile}
                    onLogout={handleLogout}
                />

                {error && <p className="message error">{error}</p>}
                {notice.text && <p className={`message ${notice.type}`}>{notice.text}</p>}

                {!error && (
                    <>
                        <section className="profile-card">
                            <div className="cover-image">
                                {coverImage ? <img src={coverImage} alt="Cover" /> : <div className="cover-fallback" />}
                            </div>

                            <div className="profile-main">
                                <div className="avatar-wrap">
                                    <div className="avatar">
                                        {profileImage ? <img src={profileImage} alt="Profile" /> : <span>{initials}</span>}
                                    </div>
                                </div>

                                <div className="profile-header-row">
                                    <div className="profile-details">
                                        <h2>{fullName || "User"}</h2>
                                        <p>{profile?.email}</p>
                                        <span className="chip">{roleLabel}</span>
                                    </div>

                                    <div className="profile-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => navigate("/settings")}
                                        >
                                            Edit In Settings
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-meta-grid">
                                <div className="profile-completion-card">
                                    <div className="profile-completion-head">
                                        <h3>Profile Completion</h3>
                                        <strong>{completionStats.percentage}%</strong>
                                    </div>
                                    <div className="profile-completion-track">
                                        <div
                                            className="profile-completion-fill"
                                            style={{ width: `${completionStats.percentage}%` }}
                                        />
                                    </div>
                                    <p className="muted">
                                        {completionStats.filled}/{completionStats.total} details completed
                                    </p>
                                    {completionStats.missing.length > 0 && (
                                        <p className="muted profile-missing-text">
                                            Missing: {completionStats.missing.map((item) => item.label).join(", ")}
                                        </p>
                                    )}
                                </div>

                                <div className="profile-list">
                                    <div className="list-row">
                                        <span>Phone</span>
                                        <strong>{profile?.phoneNumber || "-"}</strong>
                                    </div>
                                    <div className="list-row">
                                        <span>Recovery Email</span>
                                        <strong>{profile?.tempEmail || "-"}</strong>
                                    </div>
                                    <div className="list-row">
                                        <span>Year</span>
                                        <strong>{profile?.year || "-"}</strong>
                                    </div>
                                    <div className="list-row">
                                        <span>Semester</span>
                                        <strong>{profile?.semester || "-"}</strong>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="section">
                            <div className="section-head">
                                <div>
                                    <h3>Academic & Contact Details</h3>
                                    <p className="muted">Update phone number, year, and semester directly from profile.</p>
                                </div>
                                {!isEditingDetails && (
                                    <button type="button" className="btn btn-secondary" onClick={startEditingDetails}>
                                        Edit Details
                                    </button>
                                )}
                            </div>

                            {!isEditingDetails ? (
                                <div className="profile-read-grid">
                                    <div className="profile-read-card">
                                        <span>Phone Number</span>
                                        <strong>{profile?.phoneNumber || "-"}</strong>
                                    </div>
                                    <div className="profile-read-card">
                                        <span>Academic Year</span>
                                        <strong>{profile?.year || "-"}</strong>
                                    </div>
                                    <div className="profile-read-card">
                                        <span>Semester</span>
                                        <strong>{profile?.semester || "-"}</strong>
                                    </div>
                                </div>
                            ) : (
                                <div className="profile-form-grid">
                                    <label className="field">
                                        <span>Phone Number</span>
                                        <input
                                            value={detailsForm.phoneNumber}
                                            onChange={(event) =>
                                                setDetailsForm((prev) => ({
                                                    ...prev,
                                                    phoneNumber: event.target.value,
                                                }))
                                            }
                                            placeholder="07XXXXXXXX"
                                        />
                                    </label>

                                    <label className="field">
                                        <span>Academic Year</span>
                                        <select
                                            value={detailsForm.year}
                                            onChange={(event) =>
                                                setDetailsForm((prev) => ({
                                                    ...prev,
                                                    year: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">Select year</option>
                                            {YEAR_OPTIONS.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="field">
                                        <span>Semester</span>
                                        <select
                                            value={detailsForm.semester}
                                            onChange={(event) =>
                                                setDetailsForm((prev) => ({
                                                    ...prev,
                                                    semester: event.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">Select semester</option>
                                            {SEMESTER_OPTIONS.map((semester) => (
                                                <option key={semester} value={semester}>
                                                    {semester}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <div className="profile-form-actions">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={cancelEditingDetails}
                                            disabled={savingDetails}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary profile-save-btn"
                                            onClick={saveAcademicDetails}
                                            disabled={savingDetails}
                                        >
                                            {savingDetails ? "Saving..." : "Save Details"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="section">
                            <h3>My Booking Details</h3>
                            {bookings.length > 0 ? (
                                <div className="booking-list">
                                    {bookings.map((booking) => (
                                        <article key={booking.bookingId} className="booking-card">
                                            <div className="booking-card__head">
                                                <h4>{booking.title}</h4>
                                                <span className={statusClass(booking.status)}>{booking.status}</span>
                                            </div>
                                            <p className="muted">
                                                {booking.facilityName || "Resource"} - {booking.location}
                                            </p>
                                            <p className="muted">
                                                {formatDate(booking.bookingDate)} | {formatTime(booking.startTime)} -{" "}
                                                {formatTime(booking.endTime)}
                                            </p>
                                            {booking.description && <p>{booking.description}</p>}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted">No booking details available yet.</p>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
