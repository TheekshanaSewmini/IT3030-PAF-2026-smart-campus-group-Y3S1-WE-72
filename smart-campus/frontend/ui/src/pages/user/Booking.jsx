import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { bookingApi, resourceApi } from "../../api";
import AppNavbar from "../../components/AppNavbar";
import { HiSearch, HiCheckCircle, HiXCircle, HiClock, HiCheck, HiX, HiTrash, HiClipboardList, HiShieldExclamation, HiBell, HiCalendar, HiPlus, HiAcademicCap, HiSparkles, HiLightningBolt } from "react-icons/hi";
import { normalizeRole } from "../../utils/roleHome";
import styles from "./Booking.module.css";

function getErrorMessage(error, fallback) {
    const payload = error?.response?.data;
    if (typeof payload === "string" && payload.trim()) return payload;
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
        const firstError = payload.errors[0];
        if (typeof firstError === "string" && firstError.trim()) return firstError;
        if (firstError?.defaultMessage) return firstError.defaultMessage;
        if (firstError?.message) return firstError.message;
    }
    if (payload?.detail) return payload.detail;
    if (payload?.message) return payload.message;
    if (payload?.error && error?.response?.status === 400) {
        return "Invalid booking data. Please check resource, date, and time.";
    }
    return fallback;
}

function getLocalDateString(date = new Date()) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
}

function toTotalMinutes(timeText) {
    if (!timeText) return null;
    const [hourText, minuteText] = String(timeText).split(":");
    const hours = Number(hourText);
    const minutes = Number(minuteText);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return (hours * 60) + minutes;
}

function safeFormatDate(dateText) {
    try {
        if (!dateText) return "-";
        const parsed = new Date(`${dateText}T00:00:00`);
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return String(dateText); }
}

function safeFormatTime(timeText) {
    try {
        if (!timeText) return "-";
        const parts = Array.isArray(timeText) ? timeText : String(timeText).split(":");
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return String(timeText);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return String(timeText); }
}

function statusClass(status) {
    const s = (status || "").toLowerCase();
    return `status-pill status-${s}`;
}

export default function Booking() {
    const navigate = useNavigate();
    const location = useLocation();

    // Data State
    const [profileData, setProfileData] = useState(null);
    const [resources, setResources] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [pendingBookings, setPendingBookings] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(!!location.state?.resourceId);
    const [viewMode, setViewMode] = useState("PE");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState({ type: "", text: "" });

    // New Booking Flow State
    const [selectedResourceId, setSelectedResourceId] = useState(location.state?.resourceId || "");
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [resourceAvailability, setResourceAvailability] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingTitle, setBookingTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);
    
    // Admin Override
    const [useManualTime, setUseManualTime] = useState(false);
    const [manualStartTime, setManualStartTime] = useState("09:00");
    const [manualEndTime, setManualEndTime] = useState("10:00");
    const [bookingDate, setBookingDate] = useState(getLocalDateString());

    const roleLabel = useMemo(() => normalizeRole(profileData?.role) || "USER", [profileData]);
    const isAdmin = roleLabel === "ADMIN";

    const loadData = async () => {
        try {
            const [p, m, r] = await Promise.all([
                api.get("/auth/me"), 
                bookingApi.getMy(), 
                resourceApi.getAll()
            ]);
            
            const user = p.data?.user || p.data;
            setProfileData(user);
            setMyBookings(Array.isArray(m.data) ? m.data : []);
            setResources(Array.isArray(r.data) ? r.data : []);
            setProfileData(p.data);
            setMyBookings(m.data);
            setResources(r.data);

            if (normalizeRole(user?.role) === "ADMIN") {
                const [pn, al] = await Promise.all([bookingApi.getPending(), bookingApi.getAll()]);
                setPendingBookings(pn.data);
                setAllBookings(al.data);
            }
        } catch (err) {
            if (err.response?.status === 401) navigate("/login");
            else setError("Infrastructure connection failed.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCheckAvailability = async () => {
        if (!selectedResourceId || !bookingDate) {
            setNotice({ type: "error", text: "Please select both resource and date." });
    useEffect(() => {
        const autoCheck = async () => {
            if (selectedResourceId && bookingDate) {
                try {
                    setCheckingAvailability(true);
                    const resp = await bookingApi.getResourceAvailability(selectedResourceId, { bookingDate });
                    setResourceAvailability(resp.data);
                    setSelectedSlot(null);
                } catch (err) {
                    setError("Availability sync interrupted.");
                } finally {
                    setCheckingAvailability(false);
                }
            }
        };
        autoCheck();
    }, [selectedResourceId, bookingDate]);

    const handleCreateBooking = async () => {
        const today = getLocalDateString();
        const finalStartTime = useManualTime ? `${manualStartTime}:00` : selectedSlot?.startTime;
        const finalEndTime = useManualTime ? `${manualEndTime}:00` : selectedSlot?.endTime;
        const startMinutes = toTotalMinutes(finalStartTime);
        const endMinutes = toTotalMinutes(finalEndTime);

        if (!selectedResourceId) {
            setNotice({ type: "error", text: "Please select a resource." });
            return;
        }

        if (!bookingTitle.trim()) {
            setNotice({ type: "error", text: "Please enter a booking title." });
            return;
        }

        if (!useManualTime && !selectedSlot) {
            setNotice({ type: "error", text: "Please select an available time slot." });
            return;
        }

        if (!bookingDate || bookingDate < today) {
            setNotice({ type: "error", text: "Booking date cannot be in the past." });
            return;
        }

        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
            setNotice({ type: "error", text: "End time must be after start time." });
            return;
        }

        if (bookingDate === today) {
            const now = new Date();
            const nowMinutes = (now.getHours() * 60) + now.getMinutes();
            if (startMinutes <= nowMinutes) {
                setNotice({ type: "error", text: "For today, start time must be in the future." });
                return;
            }
        }

        try {
            setSubmitting(true);
            await bookingApi.create({
                facilityAssetId: Number(selectedResourceId),
                title: bookingTitle,
                bookingDate,
                startTime: finalStartTime,
                endTime: finalEndTime,
            });
            setNotice({ type: "success", text: "Transaction confirmed." });
            setIsFormOpen(false);
            loadData();
        } catch (err) {
            setNotice({ type: "error", text: getErrorMessage(err, "Confirmation failed.") });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAdminAction = async (id, action) => {
        try {
            if (action === "approve") await bookingApi.approve(id);
            if (action === "reject") {
                if (!window.confirm("Are you sure you want to REJECT this reservation? This action cannot be undone.")) return;
                await bookingApi.reject(id);
            }
            if (action === "cancel") {
                if (!window.confirm("Are you sure you want to cancel/delete this record?")) return;
                await bookingApi.cancel(id);
            }
            loadData();
        } catch (err) {
            setNotice({ type: "error", text: "Operation restricted." });
        }
    };

    if (loading) return (
        <div className="loading-center">
            <div className={styles.texture} />
            <div className="spinner" />
        </div>
    );

    const stats = {
        pending: isAdmin ? pendingBookings.length : myBookings.filter(b => b.status === 'PENDING').length,
        approved: isAdmin ? allBookings.filter(b => b.status === 'APPROVED').length : myBookings.filter(b => b.status === 'APPROVED').length,
    };

    return (
        <div className="page-shell">
            <div className="bg-layer bg-user" />
            <div className="panel page-panel border-none">
                <AppNavbar title="Global Logistics" subtitle="Manage resource allocation streams." profile={profileData} />

                <main>
                    {error && <div className="message error glass-alert">{error}</div>}
                    {notice.text && <div className={`message ${notice.type} glass-alert`}>{notice.text}</div>}

                    <div className="stats-dashboard" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div className="stat-card glass-card">
                            <div className="stat-icon stats-icon--blue"><HiBell /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Queue</h4>
                                <p className="stat-value">{stats.pending}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon stats-icon--green"><HiCheckCircle /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Active</h4>
                                <p className="stat-value">{stats.approved}</p>
                            </div>
                        </div>
                        <div className="stat-card glass-card">
                            <div className="stat-icon stats-icon--purple"><HiLightningBolt /></div>
                            <div className="stat-info">
                                <h4 className="stat-label">Velocity</h4>
                                <p className="stat-value">Peak</p>
                            </div>
                        </div>
                    </div>

                    <section className="glass-panel" style={{ padding: '2rem', background: 'rgba(255,255,255,0.7)', borderRadius: '24px' }}>
                        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontWeight: 800 }}>Transaction Log</h3>
                                <p className="muted">Global campus data flow.</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}><HiPlus /> New Transaction</button>
                        </div>

                        <div className="booking-list" style={{ display: 'grid', gap: '1.25rem' }}>
                            {(isAdmin ? (viewMode === 'PE' ? pendingBookings : allBookings) : myBookings).map(b => (
                                <article key={b.bookingId} className="management-card glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '20px' }}>
                                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                        <div className="asset-icon-box" style={{ padding: '0.8rem', background: 'var(--brand-soft)', color: 'var(--brand)', borderRadius: '14px', position: 'relative' }}>
                                            <HiCalendar size={20} />
                                        </div>
                                        <div className="card-title-group">
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{b.title}</h4>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                                                    {b.facilityName} • {safeFormatDate(b.bookingDate)} at <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{safeFormatTime(b.startTime)}</span>
                                                </p>
                                                {isAdmin && (
                                                    <span className="user-email-meta" style={{ background: '#f1f5f9', padding: '0.1rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem' }}>
                                                        {b.bookedByEmail || "System"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <span className={statusClass(b.status)}>{b.status}</span>
                                        
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {isAdmin && b.status === 'PENDING' && (
                                                <>
                                                    <button 
                                                        className="btn-icon btn-approve" 
                                                        onClick={() => handleAdminAction(b.bookingId, 'approve')}
                                                        title="Approve Reservation"
                                                    >
                                                        <HiCheck /> Approve
                                                    </button>
                                                    <button 
                                                        className="btn-icon btn-reject" 
                                                        onClick={() => handleAdminAction(b.bookingId, 'reject')}
                                                        title="Reject Reservation"
                                                    >
                                                        <HiX /> Reject
                                                    </button>
                                                </>
                                            )}
                                            
                                            {(!isAdmin || b.status !== 'PENDING') && (
                                                <button 
                                                    className="btn-icon btn-cancel" 
                                                    onClick={() => handleAdminAction(b.bookingId, 'cancel')}
                                                    style={{ width: '40px', height: '40px', padding: 0 }}
                                                    title={isAdmin ? "Delete Log" : "Cancel Booking"}
                                                >
                                                    <HiTrash />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>
            </div>

            {isFormOpen && (
                <div className="modern-modal-overlay" onClick={() => setIsFormOpen(false)}>
                    <div className="modern-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Resource Allocation</h3>
                                <p className="muted" style={{ margin: 0 }}>Configure session parameters.</p>
                            </div>
                        </div>
                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                            <HiOutlineInformationCircle size={20} />
                            <span>Your request will be sent to the department admin for approval.</span>
                        </div>
                    </aside>

                    <main className={styles.formMain}>
                        <button className={styles.closeForm} onClick={() => setIsFormOpen(false)}>
                            <HiX size={24} />
                        </button>

                        <div className={styles.formContent}>
                            <header className={styles.formTitle}>
                                <h3>New Reservation</h3>
                                <p>Provide details to verify real-time availability.</p>
                            </header>

                        <div className="modal-body" style={{ padding: '0 2rem 2.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <span>Target Resource</span>
                                    <select value={selectedResourceId} onChange={e => setSelectedResourceId(e.target.value)}>
                                        <option value="">Select Asset...</option>
                                        {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <span>Date</span>
                                    <input
                                        type="date"
                                        value={bookingDate}
                                        min={getLocalDateString()}
                                        onChange={e => setBookingDate(e.target.value)}
                                    />
                                </div>
                                
                                <button 
                                    className={styles.verifyBtn} 
                                    onClick={handleCheckAvailability} 
                                    disabled={checkingAvailability || !selectedResourceId}
                                >
                                    {checkingAvailability ? (
                                        <HiClock className="spin" />
                                    ) : (
                                        <HiSearch />
                                    )}
                                    {checkingAvailability ? "Synchronizing..." : "Check Availability"}
                                </button>
                            </div>

                            {isAdmin && (
                                <div className="admin-override glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 800 }}>
                                        <input type="checkbox" checked={useManualTime} onChange={e => setUseManualTime(e.target.checked)} />
                                        Override Slots (Manual Entry)
                                    </label>
                                    {useManualTime && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                                            <div className="form-group">
                                                <span>Start</span>
                                                <input type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <span>End</span>
                                                <input type="time" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!useManualTime && (
                                <div className="slot-management">
                                    <h4 style={{ marginBottom: '1rem' }}>Available Slots</h4>
                                    {checkingAvailability ? (
                                        <div style={{ textAlign: 'center', padding: '2rem' }}><HiClock className="spin" size={32} /></div>
                                    ) : (
                                        <div className="slot-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                                            {(resourceAvailability?.availableSlots || []).map((slot, i) => (
                                                <button 
                                                    key={i} 
                                                    className={`slot-chip ${selectedSlot === slot ? 'active' : ''}`}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    style={{ border: '1px solid var(--line-soft)', padding: '0.75rem', borderRadius: '12px', background: selectedSlot === slot ? 'var(--brand)' : '#fff', color: selectedSlot === slot ? '#fff' : 'inherit', cursor: 'pointer', fontWeight: 700 }}
                                                >
                                                    {safeFormatTime(slot.startTime)}
                                                </button>
                                            ))}
                                            {(resourceAvailability?.availableSlots || []).length === 0 && (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', opacity: 0.5 }}>No slots found. Try another date or resource.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="form-group" style={{ marginTop: '2rem' }}>
                                <span>Reservation Title</span>
                                <input value={bookingTitle} onChange={e => setBookingTitle(e.target.value)} placeholder="Main Session Identification" />
                            </div>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', padding: '1.5rem 2rem', borderTop: '1px solid var(--line-soft)' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsFormOpen(false)}>Discard</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreateBooking} disabled={submitting || (!useManualTime && !selectedSlot)}>
                                {submitting ? "Processing..." : "Confirm & Commit"}
                            </button>
                        </div>
                    </main>
                </div>
            )}
        </div>
    );
}
