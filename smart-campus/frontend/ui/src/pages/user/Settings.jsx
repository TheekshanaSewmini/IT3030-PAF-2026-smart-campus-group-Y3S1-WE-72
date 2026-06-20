import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import "./Settings.css";
import { normalizeRole } from "../../utils/roleHome";
import AppNavbar from "../../components/AppNavbar";

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

export default function Settings() {
    const navigate = useNavigate();
    const [initialLoading, setInitialLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [activeEditor, setActiveEditor] = useState("");
    const [notice, setNotice] = useState({ type: "", text: "" });

    const [user, setUser] = useState({
        firstName: "",
        lastName: "",
        email: "",
        role: "",
        phoneNumber: "",
        year: "",
        semester: "",
        profileImageUrl: "",
        coverImageUrl: "",
    });

    const [nameForm, setNameForm] = useState({ firstName: "", lastName: "" });
    const [detailsForm, setDetailsForm] = useState({ phoneNumber: "", year: "", semester: "" });
    const [emailForm, setEmailForm] = useState({ newEmail: "", otp: "" });
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [deletePassword, setDeletePassword] = useState("");
    const [profileFile, setProfileFile] = useState(null);
    const [coverFile, setCoverFile] = useState(null);

    const setErrorNotice = (error, fallback) => {
        setNotice({ type: "error", text: getErrorMessage(error, fallback) });
    };

    const resetNotice = () => {
        setNotice({ type: "", text: "" });
    };

    const syncNameFormWithUser = (sourceUser) => {
        setNameForm({
            firstName: sourceUser.firstName || "",
            lastName: sourceUser.lastName || "",
        });
    };

    const syncDetailsFormWithUser = (sourceUser) => {
        setDetailsForm({
            phoneNumber: sourceUser.phoneNumber || "",
            year: sourceUser.year || "",
            semester: sourceUser.semester || "",
        });
    };

    const openEditor = (editorKey) => {
        resetNotice();

        if (editorKey === "basic") {
            syncNameFormWithUser(user);
        }

        if (editorKey === "details") {
            syncDetailsFormWithUser(user);
        }

        if (editorKey === "email") {
            setEmailForm({ newEmail: "", otp: "" });
        }

        if (editorKey === "password") {
            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }

        if (editorKey === "delete") {
            setDeletePassword("");
        }

        setActiveEditor(editorKey);
    };

    const closeEditor = () => {
        setActiveEditor("");
    };

    useEffect(() => {
        let cancelled = false;

        const timerId = window.setTimeout(() => {
            const run = async () => {
                try {
                    const response = await api.get("/user/me");

                    if (cancelled) {
                        return;
                    }

                    const data = response.data;
                    const firstName = data.name || data.firstname || "";
                    const lastName = data.lastName || "";

                    const nextUser = {
                        firstName,
                        lastName,
                        email: data.email || "",
                        role: normalizeRole(data.role),
                        phoneNumber: data.phoneNumber || "",
                        year: data.year || "",
                        semester: data.semester || "",
                        profileImageUrl: data.profileImageUrl || "",
                        coverImageUrl: data.coverImageUrl || "",
                    };

                    setUser(nextUser);
                    syncNameFormWithUser(nextUser);
                    syncDetailsFormWithUser(nextUser);
                } catch (error) {
                    if (cancelled) {
                        return;
                    }

                    const status = error.response?.status;
                    if (status === 401 || status === 403) {
                        navigate("/login", { replace: true });
                        return;
                    }

                    setNotice({
                        type: "error",
                        text: getErrorMessage(error, "Failed to load settings."),
                    });
                } finally {
                    if (!cancelled) {
                        setInitialLoading(false);
                    }
                }
            };

            void run();
        }, 0);

        return () => {
            cancelled = true;
            window.clearTimeout(timerId);
        };
    }, [navigate]);

    const updateName = async () => {
        resetNotice();

        if (!nameForm.firstName.trim() || !nameForm.lastName.trim()) {
            setNotice({ type: "error", text: "First name and last name are required." });
            return;
        }

        setWorking(true);
        try {
            const response = await api.put("/user/update-name", {
                name: nameForm.firstName.trim(),
                lastName: nameForm.lastName.trim(),
            });

            setUser((prev) => ({
                ...prev,
                firstName: nameForm.firstName.trim(),
                lastName: nameForm.lastName.trim(),
            }));
            setNotice({
                type: "success",
                text: typeof response.data === "string" ? response.data : "Name updated successfully.",
            });
            setActiveEditor("");
        } catch (error) {
            setErrorNotice(error, "Failed to update name.");
        } finally {
            setWorking(false);
        }
    };

    const updateProfileDetails = async () => {
        resetNotice();
        setWorking(true);

        try {
            const payload = {
                phoneNumber: detailsForm.phoneNumber.trim() || null,
                year: detailsForm.year || null,
                semester: detailsForm.semester || null,
            };

            const response = await api.put("/user/update-profile-details", payload);
            const updatedProfile = response?.data || {};

            setUser((prev) => ({
                ...prev,
                phoneNumber: updatedProfile.phoneNumber || payload.phoneNumber || "",
                year: updatedProfile.year || payload.year || "",
                semester: updatedProfile.semester || payload.semester || "",
            }));
            setNotice({ type: "success", text: "Academic and contact details updated." });
            setActiveEditor("");
        } catch (error) {
            setErrorNotice(error, "Failed to update details.");
        } finally {
            setWorking(false);
        }
    };

    const requestEmailChange = async () => {
        resetNotice();

        if (!emailForm.newEmail.trim()) {
            setNotice({ type: "error", text: "New email is required." });
            return;
        }

        setWorking(true);
        try {
            const response = await api.put("/user/update-email", {
                newEmail: emailForm.newEmail.trim(),
            });
            setNotice({
                type: "success",
                text: typeof response.data === "string" ? response.data : "OTP sent to your new email.",
            });
        } catch (error) {
            setErrorNotice(error, "Failed to send OTP.");
        } finally {
            setWorking(false);
        }
    };

    const verifyEmailChange = async () => {
        resetNotice();

        if (!emailForm.otp.trim()) {
            setNotice({ type: "error", text: "OTP is required." });
            return;
        }

        setWorking(true);
        try {
            const response = await api.post("/user/verify-new-email", null, {
                params: { otp: emailForm.otp.trim() },
            });

            setNotice({
                type: "success",
                text: typeof response.data === "string" ? response.data : "Email updated successfully.",
            });

            await api.post("/auth/logout");
            navigate("/login", { replace: true });
        } catch (error) {
            setErrorNotice(error, "Failed to verify OTP.");
        } finally {
            setWorking(false);
        }
    };

    const updatePassword = async () => {
        resetNotice();

        if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
            setNotice({ type: "error", text: "All password fields are required." });
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setNotice({ type: "error", text: "New password and confirm password must match." });
            return;
        }

        setWorking(true);
        try {
            const response = await api.put("/user/update-password", passwordForm);
            setNotice({
                type: "success",
                text: typeof response.data === "string" ? response.data : "Password updated successfully.",
            });

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setActiveEditor("");
        } catch (error) {
            setErrorNotice(error, "Failed to update password.");
        } finally {
            setWorking(false);
        }
    };

    const deleteAccount = async () => {
        resetNotice();

        if (!deletePassword) {
            setNotice({ type: "error", text: "Current password is required." });
            return;
        }

        setWorking(true);
        try {
            const response = await api.delete("/user/delete", {
                data: { currentPassword: deletePassword },
            });

            setNotice({
                type: "success",
                text: typeof response.data === "string" ? response.data : "Account deleted.",
            });

            await api.post("/auth/logout");
            navigate("/login", { replace: true });
        } catch (error) {
            setErrorNotice(error, "Failed to delete account.");
        } finally {
            setWorking(false);
        }
    };

    const uploadImage = async (type) => {
        resetNotice();
        const file = type === "profile" ? profileFile : coverFile;

        if (!file) {
            setNotice({ type: "error", text: "Choose an image first." });
            return;
        }

        setWorking(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const endpoint =
                type === "profile" ? "/user/upload-profile-image" : "/user/upload-cover-image";

            const response = await api.post(endpoint, formData);
            const imagePath = typeof response.data === "string" ? response.data : "";

            if (type === "profile") {
                setUser((prev) => ({ ...prev, profileImageUrl: imagePath }));
                setProfileFile(null);
            } else {
                setUser((prev) => ({ ...prev, coverImageUrl: imagePath }));
                setCoverFile(null);
            }

            setNotice({ type: "success", text: "Image uploaded successfully." });
        } catch (error) {
            setErrorNotice(error, "Image upload failed.");
        } finally {
            setWorking(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } finally {
            navigate("/login", { replace: true });
        }
    };

    if (initialLoading) {
        return (
            <div className="loading-center">
                <div className="spinner" />
                <p>Loading settings...</p>
            </div>
        );
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const profileImage = buildAssetUrl(user.profileImageUrl);
    const coverImage = buildAssetUrl(user.coverImageUrl);
    const initials = (user.firstName?.[0] || "U").toUpperCase();
    const profileFileName = profileFile?.name || "No file selected";
    const coverFileName = coverFile?.name || "No file selected";

    return (
        <div className="page-shell settings-page">
            <div className="bg-layer bg-user" />
            <div className="panel page-panel">
                <AppNavbar
                    title="Settings"
                    subtitle="Manage profile, credentials, and account security."
                    profile={{
                        role: user.role,
                        name: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        profileImageUrl: user.profileImageUrl,
                    }}
                    onLogout={handleLogout}
                />

                {notice.text && <p className={`message ${notice.type}`}>{notice.text}</p>}

                <section className="settings-hero-card">
                    <div className="settings-cover">
                        {coverImage ? (
                            <img src={coverImage} alt="Cover" />
                        ) : (
                            <div className="settings-cover-fallback" />
                        )}
                    </div>
                    <div className="settings-hero-main">
                        <div className="settings-avatar">
                            {profileImage ? <img src={profileImage} alt="Profile" /> : <span>{initials}</span>}
                        </div>
                        <div className="settings-hero-text">
                            <h2>{fullName || "User"}</h2>
                            <p>{user.email}</p>
                            <span className="chip">{user.role || "USER"}</span>
                        </div>
                    </div>
                </section>

                <section className="settings-grid">
                    <article className="settings-card">
                        <div className="settings-card-head">
                            <div>
                                <h3>Basic Profile</h3>
                                <p className="muted">Role: {user.role || "USER"}</p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() =>
                                    activeEditor === "basic" ? closeEditor() : openEditor("basic")
                                }
                                disabled={working}
                            >
                                {activeEditor === "basic" ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        {activeEditor === "basic" ? (
                            <div className="form-grid">
                                <label className="field">
                                    <span>First Name</span>
                                    <input
                                        value={nameForm.firstName}
                                        onChange={(event) =>
                                            setNameForm((prev) => ({
                                                ...prev,
                                                firstName: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="field">
                                    <span>Last Name</span>
                                    <input
                                        value={nameForm.lastName}
                                        onChange={(event) =>
                                            setNameForm((prev) => ({
                                                ...prev,
                                                lastName: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={updateName}
                                    disabled={working}
                                >
                                    Save Name
                                </button>
                            </div>
                        ) : (
                            <div className="settings-read-grid">
                                <div className="settings-read-item">
                                    <span>First Name</span>
                                    <strong>{user.firstName || "-"}</strong>
                                </div>
                                <div className="settings-read-item">
                                    <span>Last Name</span>
                                    <strong>{user.lastName || "-"}</strong>
                                </div>
                            </div>
                        )}
                    </article>

                    <article className="settings-card">
                        <div className="settings-card-head">
                            <div>
                                <h3>Academic & Contact</h3>
                                <p className="muted">Phone, year, and semester details.</p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() =>
                                    activeEditor === "details" ? closeEditor() : openEditor("details")
                                }
                                disabled={working}
                            >
                                {activeEditor === "details" ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        {activeEditor === "details" ? (
                            <div className="form-grid">
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
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={updateProfileDetails}
                                    disabled={working}
                                >
                                    Save Details
                                </button>
                            </div>
                        ) : (
                            <div className="settings-read-grid">
                                <div className="settings-read-item">
                                    <span>Phone Number</span>
                                    <strong>{user.phoneNumber || "-"}</strong>
                                </div>
                                <div className="settings-read-item">
                                    <span>Academic Year</span>
                                    <strong>{user.year || "-"}</strong>
                                </div>
                                <div className="settings-read-item">
                                    <span>Semester</span>
                                    <strong>{user.semester || "-"}</strong>
                                </div>
                            </div>
                        )}
                    </article>

                    <article className="settings-card">
                        <div className="settings-card-head">
                            <div>
                                <h3>Email Update</h3>
                                <p className="muted">Current email: {user.email || "-"}</p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() =>
                                    activeEditor === "email" ? closeEditor() : openEditor("email")
                                }
                                disabled={working}
                            >
                                {activeEditor === "email" ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        {activeEditor === "email" ? (
                            <div className="form-grid">
                                <label className="field">
                                    <span>New Email</span>
                                    <input
                                        type="email"
                                        value={emailForm.newEmail}
                                        onChange={(event) =>
                                            setEmailForm((prev) => ({
                                                ...prev,
                                                newEmail: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    className="btn btn-secondary"
                                    type="button"
                                    onClick={requestEmailChange}
                                    disabled={working}
                                >
                                    Send OTP
                                </button>
                                <label className="field">
                                    <span>Email OTP</span>
                                    <input
                                        value={emailForm.otp}
                                        onChange={(event) =>
                                            setEmailForm((prev) => ({
                                                ...prev,
                                                otp: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={verifyEmailChange}
                                    disabled={working}
                                >
                                    Verify New Email
                                </button>
                            </div>
                        ) : (
                            <div className="settings-read-grid">
                                <div className="settings-read-item">
                                    <span>New Email</span>
                                    <strong>Click Edit to request OTP</strong>
                                </div>
                                <div className="settings-read-item">
                                    <span>Verification</span>
                                    <strong>OTP required to apply changes</strong>
                                </div>
                            </div>
                        )}
                    </article>

                    <article className="settings-card">
                        <div className="settings-card-head">
                            <div>
                                <h3>Password</h3>
                                <p className="muted">For security, fields are hidden by default.</p>
                            </div>
                            <button
                                className="btn btn-secondary"
                                type="button"
                                onClick={() =>
                                    activeEditor === "password" ? closeEditor() : openEditor("password")
                                }
                                disabled={working}
                            >
                                {activeEditor === "password" ? "Cancel" : "Edit"}
                            </button>
                        </div>

                        {activeEditor === "password" ? (
                            <div className="form-grid">
                                <label className="field">
                                    <span>Current Password</span>
                                    <input
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        onChange={(event) =>
                                            setPasswordForm((prev) => ({
                                                ...prev,
                                                currentPassword: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="field">
                                    <span>New Password</span>
                                    <input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(event) =>
                                            setPasswordForm((prev) => ({
                                                ...prev,
                                                newPassword: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <label className="field">
                                    <span>Confirm Password</span>
                                    <input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(event) =>
                                            setPasswordForm((prev) => ({
                                                ...prev,
                                                confirmPassword: event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={updatePassword}
                                    disabled={working}
                                >
                                    Update Password
                                </button>
                            </div>
                        ) : (
                            <div className="settings-read-grid">
                                <div className="settings-read-item">
                                    <span>Password</span>
                                    <strong>Not shown for security</strong>
                                </div>
                            </div>
                        )}
                    </article>

                    <article className="settings-card">
                        <div className="settings-card-head">
                            <div>
                                <h3>Profile Images</h3>
                                <p className="muted">Use a clear profile photo and a clean cover image.</p>
                            </div>
                        </div>

                        <div className="upload-grid">
                            <div className="upload-card">
                                <div className="upload-card-head">
                                    <h4>Profile Photo</h4>
                                    <p>Recommended: square image (1:1), JPG/PNG.</p>
                                </div>
                                <div className="image-preview profile-photo">
                                    {user.profileImageUrl ? (
                                        <img src={buildAssetUrl(user.profileImageUrl)} alt="Profile preview" />
                                    ) : (
                                        <span>No profile image</span>
                                    )}
                                </div>
                                <div className="file-input-row">
                                    <input
                                        className="file-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => setProfileFile(event.target.files?.[0] || null)}
                                    />
                                    <span className="file-name">{profileFileName}</span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={() => uploadImage("profile")}
                                    disabled={working}
                                >
                                    Save Profile Photo
                                </button>
                            </div>

                            <div className="upload-card">
                                <div className="upload-card-head">
                                    <h4>Cover Photo</h4>
                                    <p>Recommended: wide image (16:5), JPG/PNG.</p>
                                </div>
                                <div className="image-preview cover-photo">
                                    {user.coverImageUrl ? (
                                        <img src={buildAssetUrl(user.coverImageUrl)} alt="Cover preview" />
                                    ) : (
                                        <span>No cover image</span>
                                    )}
                                </div>
                                <div className="file-input-row">
                                    <input
                                        className="file-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                                    />
                                    <span className="file-name">{coverFileName}</span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={() => uploadImage("cover")}
                                    disabled={working}
                                >
                                    Save Cover Photo
                                </button>
                            </div>
                        </div>
                    </article>

                    <article className="settings-card danger-zone">
                        <div className="settings-card-head">
                            <div>
                                <h3>Delete Account</h3>
                                <p className="muted">This action cannot be undone.</p>
                            </div>
                            <button
                                className="btn btn-danger-soft"
                                type="button"
                                onClick={() =>
                                    activeEditor === "delete" ? closeEditor() : openEditor("delete")
                                }
                                disabled={working}
                            >
                                {activeEditor === "delete" ? "Cancel" : "Enable Delete"}
                            </button>
                        </div>

                        {activeEditor === "delete" ? (
                            <div className="form-grid">
                                <label className="field">
                                    <span>Current Password</span>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(event) => setDeletePassword(event.target.value)}
                                    />
                                </label>
                                <button
                                    className="btn btn-danger"
                                    type="button"
                                    onClick={deleteAccount}
                                    disabled={working}
                                >
                                    Delete Account
                                </button>
                            </div>
                        ) : (
                            <div className="settings-read-grid">
                                <div className="settings-read-item">
                                    <span>Delete Status</span>
                                    <strong>Disabled until you click Enable Delete</strong>
                                </div>
                            </div>
                        )}
                    </article>
                </section>
            </div>
        </div>
    );
}
