import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { roleHomePath, normalizeRole } from "../../utils/roleHome";
import AppNavbar from "../../components/AppNavbar";
import { HiPlus, HiCollection, HiOfficeBuilding, HiUsers, HiLocationMarker, HiClock, HiUpload, HiTrash, HiRefresh, HiCog, HiScissors, HiPencil } from "react-icons/hi";

const FACILITY_TYPES = [
    "LECTURE_HALL",
    "LAB",
    "MEETING_ROOM",
    "PROJECTOR",
    "CAMERA",
    "OTHER",
];

const FACILITY_STATUSES = ["ACTIVE", "OUT_OF_SERVICE", "MAINTENANCE", "UNAVAILABLE"];

const initialForm = {
    name: "",
    type: "LECTURE_HALL",
    capacity: "1",
    location: "",
    availableFrom: "08:00",
    availableTo: "17:00",
    slotDurationMinutes: "60",
    status: "ACTIVE",
};

function getErrorMessage(error, fallback) {
    const payload = error?.response?.data;
    if (typeof payload === "string" && payload.trim()) return payload;
    if (payload?.message) return payload.message;
    return fallback;
}

function buildAssetUrl(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = api.defaults.baseURL || "http://localhost:8080";
    return `${base}${path}`;
}

function formatEnumLabel(value) {
    return String(value || "")
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export default function AdminResources() {
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isAddMode, setIsAddMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {
            // Even if backend logout fails, route user to login.
        } finally {
            navigate("/login", { replace: true });
        }
    };

    const loadData = async () => {
        setError("");
        try {
            const [adminProfileResponse, resourcesResponse] = await Promise.all([
                api.get("/user/Admin/me").catch(() => api.get("/user/me")),
                api.get("/facilities"),
            ]);

            const role = normalizeRole(adminProfileResponse?.data?.role);
            if (role !== "ADMIN") {
                navigate(roleHomePath(adminProfileResponse?.data?.role), { replace: true });
                return;
            }

            setProfileData(adminProfileResponse.data);
            setResources(Array.isArray(resourcesResponse.data) ? resourcesResponse.data : []);
            setError("");
        } catch (loadError) {
            const status = loadError.response?.status;
            if (status === 401) {
                navigate("/login", { replace: true });
            } else {
                setError(getErrorMessage(loadError, "Failed to load management data."));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [navigate]);

    useEffect(() => {
        if (!imageFile) {
            setPreviewUrl("");
            return undefined;
        }
        const localPreview = URL.createObjectURL(imageFile);
        setPreviewUrl(localPreview);
        return () => URL.revokeObjectURL(localPreview);
    }, [imageFile]);

    const sortedResources = useMemo(
        () => [...resources].sort((a, b) => (b.id || 0) - (a.id || 0)),
        [resources]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(curr => ({ ...curr, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            setSubmitting(true);
            const payload = {
                ...form,
                capacity: Number(form.capacity),
                slotDurationMinutes: Number(form.slotDurationMinutes),
                availableFrom: form.availableFrom.length === 5 ? `${form.availableFrom}:00` : form.availableFrom,
                availableTo: form.availableTo.length === 5 ? `${form.availableTo}:00` : form.availableTo,
            };

            const formData = new FormData();
            formData.append("resource", new Blob([JSON.stringify(payload)], { type: "application/json" }));
            formData.append("image", imageFile);

            const response = await api.post("/facilities", formData);

            setForm(initialForm);
            setImageFile(null);
            setIsAddMode(false);
            setEditingId(null);
        } catch (err) {
            setError(getErrorMessage(err, "Operation failed."));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (res) => {
        setEditingId(res.id);
        setForm({
            name: res.name,
            type: res.type,
            capacity: String(res.capacity),
            location: res.location,
            availableFrom: res.availableFrom?.slice(0, 5) || "08:00",
            availableTo: res.availableTo?.slice(0, 5) || "17:00",
            slotDurationMinutes: String(res.slotDurationMinutes || 60),
            status: res.status,
        });
        setIsAddMode(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            setError("");
            setUpdatingId(id);
            await api.patch(`/facilities/${id}/status`, null, { params: { status: newStatus } });
            setResources(curr => curr.map(r => r.id === id ? { ...r, status: newStatus } : r));
            setSuccess(`Status updated to ${formatEnumLabel(newStatus)}`);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to update status."));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleRemove = async (id) => {
        if (!window.confirm("Permanently remove this resource? This will also delete all associated bookings.")) return;
        try {
            setError("");
            await api.delete(`/facilities/${id}`);
            setResources(curr => curr.filter(r => r.id !== id));
            setSuccess("Resource and its metadata permanently purged.");
        } catch (err) {
            setError(getErrorMessage(err, "Could not delete resource."));
        }
    };

    if (loading) {
        return (
            <div className="loading-center">
                <div className="spinner" />
                <p>Establishing secure connection...</p>
            </div>
        );
    }

    const getStatusColor = (status) => {
        switch(status) {
            case 'ACTIVE': return '#059669';
            case 'MAINTENANCE': return '#f59e0b';
            case 'UNAVAILABLE': return '#dc2626';
            case 'OUT_OF_SERVICE': return '#4b5563';
            default: return '#6b7280';
        }
    };

    return (
        <div className="page-shell">
            <div className="bg-layer bg-user" />
            <div className="panel page-panel admin-resource-panel">
                <AppNavbar 
                    title="Resource Catalog" 
                    subtitle="Management terminal for campus assets." 
                    profile={profileData}
                    onLogout={handleLogout}
                />

                <main className="dashboard-content" style={{ padding: '0 1.5rem 2.5rem' }}>
                    {error && <div className="message error glass-alert">{error}</div>}
                    {success && <div className="message success glass-alert">{success}</div>}

                    {/* Stats Summary */}
                    <div className="stats-row" style={{ marginBottom: '2rem' }}>
                        <article className="stat-card glass-card">
                            <div className="stat-icon stats-icon--blue"><HiCollection /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Total Assets</h4>
                                <p className="stat-value">{resources.length}</p>
                            </div>
                        </article>
                        <article className="stat-card glass-card">
                            <div className="stat-icon stats-icon--green"><HiOfficeBuilding /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Active Sites</h4>
                                <p className="stat-value">{resources.filter(r => r.status === 'ACTIVE').length}</p>
                            </div>
                        </article>
                        <article className="stat-card glass-card">
                            <div className="stat-icon stats-icon--purple" onClick={() => loadData()} style={{ cursor: 'pointer' }}><HiRefresh /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Service Desk</h4>
                                <p className="stat-value">Online</p>
                            </div>
                        </article>
                    </div>

                    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Campus Inventory</h3>
                            <p className="muted" style={{ margin: '0.2rem 0 0' }}>Manage asset lifecycle and availability.</p>
                        </div>
                        <button 
                            className={`btn ${isAddMode ? 'btn-ghost' : 'btn-primary'}`} 
                            onClick={() => {
                                setIsAddMode(!isAddMode);
                                if (isAddMode) {
                                    setEditingId(null);
                                    setForm(initialForm);
                                }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {isAddMode ? <HiRefresh /> : <HiPlus />}
                            {isAddMode ? "Cancel Entry" : "New Resource"}
                        </button>
                    </div>

                    {isAddMode && (
                        <section className="glass-panel" style={{ padding: '2rem', marginBottom: '2.5rem', border: '2px solid var(--brand-soft)' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand)' }}>
                                {editingId ? <HiPencil /> : <HiPlus />} 
                                {editingId ? `Update ${form.name}` : "Create New Inventory Entry"}
                            </h4>
                            <form className="form-grid" onSubmit={handleSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <span>Resource Name</span>
                                        <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Einstein Lab" required />
                                    </div>
                                    <div className="form-group">
                                        <span>Type</span>
                                        <select name="type" value={form.type} onChange={handleChange}>
                                            {FACILITY_TYPES.map(t => <option key={t} value={t}>{formatEnumLabel(t)}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <span>Capacity</span>
                                        <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <span>Location</span>
                                        <input name="location" value={form.location} onChange={handleChange} placeholder="Block C, Room 102" required />
                                    </div>
                                    <div className="form-group">
                                        <span>Available From</span>
                                        <input name="availableFrom" type="time" value={form.availableFrom} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <span>Available To</span>
                                        <input name="availableTo" type="time" value={form.availableTo} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group">
                                        <span>Slot Configuration (Min)</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <HiScissors style={{ color: 'var(--brand)' }} />
                                            <select name="slotDurationMinutes" value={form.slotDurationMinutes} onChange={handleChange}>
                                                <option value="30">30 Minutes</option>
                                                <option value="60">60 Minutes</option>
                                                <option value="90">90 Minutes</option>
                                                <option value="120">120 Minutes</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <span>Status</span>
                                        <select name="status" value={form.status} onChange={handleChange}>
                                            {FACILITY_STATUSES.map(s => <option key={s} value={s}>{formatEnumLabel(s)}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                        <span>Image Asset {editingId && "(Optional to Change)"}</span>
                                        <label className="custom-file-upload" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem', border: '1px dashed var(--line-soft)', borderRadius: '12px', cursor: 'pointer', background: '#fff' }}>
                                            <HiUpload /> {imageFile ? imageFile.name : "Choose File"}
                                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} required={!editingId} />
                                        </label>
                                    </div>
                                </div>

                                {(previewUrl || (editingId && !imageFile)) && (
                                    <div style={{ marginTop: '1.5rem', width: '200px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--brand-soft)' }}>
                                        <img 
                                            src={previewUrl || buildAssetUrl(resources.find(r => r.id === editingId)?.imageUrl)} 
                                            alt="Preview" 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                        />
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                    <button className="btn btn-primary" type="submit" disabled={submitting}>
                                        {submitting ? "Processing..." : editingId ? "Save Changes" : "Finalize Record"}
                                    </button>
                                    <button className="btn btn-ghost" type="button" onClick={() => {
                                        setIsAddMode(false);
                                        setEditingId(null);
                                        setForm(initialForm);
                                    }}>Cancel</button>
                                </div>
                            </form>
                        </section>
                    )}

                    <div className="resource-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 420px))', gap: '1.5rem', justifyContent: 'flex-start' }}>
                        {sortedResources.map(res => (
                            <article key={res.id} className="resource-card glass-card" style={{ maxWidth: '420px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '180px', position: 'relative' }}>
                                    {res.imageUrl ? (
                                        <img src={buildAssetUrl(res.imageUrl)} alt={res.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#cbd5e1', display: 'grid', placeItems: 'center' }}>No Image</div>
                                    )}
                                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#fff', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, color: getStatusColor(res.status), border: `1px solid ${getStatusColor(res.status)}`, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                                        {formatEnumLabel(res.status)}
                                    </div>
                                </div>
                                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--brand)', fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {formatEnumLabel(res.type)}
                                        </span>
                                        <button onClick={() => handleEdit(res)} style={{ border: 'none', background: 'transparent', color: 'var(--brand)', cursor: 'pointer' }} title="Edit Configuration"><HiPencil size={18} /></button>
                                    </div>
                                    <h4 style={{ margin: '0.4rem 0', fontSize: '1.1rem', fontWeight: 800 }}>{res.name}</h4>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HiUsers /> {res.capacity} Seats</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HiLocationMarker /> {res.location}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><HiClock /> {res.availableFrom?.slice(0, 5) || "--:--"} - {res.availableTo?.slice(0, 5) || "--:--"}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} title="Booking Interval"><HiScissors /> {res.slotDurationMinutes || 60}m Slots</div>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--line-soft)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <HiCog style={{ color: 'var(--text-soft)' }} />
                                                <select 
                                                    value={res.status} 
                                                    onChange={(e) => handleStatusChange(res.id, e.target.value)}
                                                    disabled={updatingId === res.id}
                                                    style={{ fontSize: '0.8rem', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--line-soft)', background: '#f8fafc', flex: 1 }}
                                                >
                                                    {FACILITY_STATUSES.map(s => <option key={s} value={s}>{formatEnumLabel(s)}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => handleRemove(res.id)}
                                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                                                >
                                                    <HiTrash /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}
