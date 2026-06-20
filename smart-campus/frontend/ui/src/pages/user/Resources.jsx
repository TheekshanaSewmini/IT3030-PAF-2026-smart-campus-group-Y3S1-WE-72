import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api, { resourceApi } from "../../api";
import AppNavbar from "../../components/AppNavbar";
import { 
    HiSearch, 
    HiFilter, 
    HiLocationMarker, 
    HiUsers, 
    HiCheckCircle, 
    HiX, 
    HiAcademicCap, 
    HiCube, 
    HiRefresh 
} from "react-icons/hi";
import styles from "./Resources.module.css";

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

const FACILITY_TYPES = ["LECTURE_HALL", "LAB", "MEETING_ROOM", "PROJECTOR", "CAMERA", "OTHER"];
const FACILITY_STATUSES = ["ACTIVE", "MAINTENANCE", "UNAVAILABLE", "OUT_OF_SERVICE"];

export default function Resources() {
    const navigate = useNavigate();
    const [resources, setResources] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const [selectedResource, setSelectedResource] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [resResp, profResp] = await Promise.all([
                    resourceApi.getAll(),
                    api.get("/auth/me"),
                ]);
                setResources(Array.isArray(resResp.data) ? resResp.data : []);
                setProfileData(profResp.data?.user || profResp.data);
            } catch (err) {
                if (err.response?.status === 401) navigate("/login");
                else setError(getErrorMessage(err, "Catalog unavailable."));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [navigate]);

    const filteredResources = useMemo(() => {
        return resources.filter((res) => {
            const matchesSearch = 
                res.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                res.location.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = !selectedType || res.type === selectedType;
            const matchesStatus = !selectedStatus || res.status === selectedStatus;
            return matchesSearch && matchesType && matchesStatus;
        });
    }, [resources, searchTerm, selectedType, selectedStatus]);

    const getStatusConfig = (status) => {
        switch(status) {
            case 'ACTIVE': return { color: '#10b981', label: 'Available', dot: '#10b981' };
            case 'MAINTENANCE': return { color: '#f59e0b', label: 'Maintenance', dot: '#f59e0b' };
            case 'UNAVAILABLE': return { color: '#ef4444', label: 'Unavailable', dot: '#ef4444' };
            default: return { color: '#64748b', label: formatEnumLabel(status), dot: '#94a3b8' };
        }
    };

    if (loading) return (
        <div className="loading-center">
            <div className={styles.texture} />
            <div className="spinner" />
        </div>
    );

    return (
        <div className={styles.page}>
            <div className={styles.texture} />
            
            <div className={styles.container}>
                <AppNavbar 
                    title="Resources" 
                    subtitle="Management System"
                    profile={profileData} 
                />

                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <h1>Resource Directory</h1>
                    </div>
                    <p className={styles.subtitle}>Explore and discover campus facilities, labs, and equipment assets.</p>
                </header>

                {error && <div className="message error glass-alert">{error}</div>}

                <section className={styles.filterBar}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}><HiSearch /> Search</label>
                        <div className={styles.searchWrapper}>
                            <HiSearch className={styles.searchIcon} />
                            <input 
                                className={styles.searchInput}
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by name or location..."
                            />
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}><HiFilter /> Category</label>
                        <select 
                            className={styles.select}
                            value={selectedType} 
                            onChange={e => setSelectedType(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {FACILITY_TYPES.map(t => <option key={t} value={t}>{formatEnumLabel(t)}</option>)}
                        </select>
                    </div>

                    <div className={styles.inputGroup}>
                        <label className={styles.label}><HiCheckCircle /> Availability</label>
                        <select 
                            className={styles.select}
                            value={selectedStatus} 
                            onChange={e => setSelectedStatus(e.target.value)}
                        >
                            <option value="">Any Status</option>
                            {FACILITY_STATUSES.map(s => <option key={s} value={s}>{formatEnumLabel(s)}</option>)}
                        </select>
                    </div>

                    <button className={styles.resetBtn} onClick={() => { setSearchTerm(""); setSelectedType(""); setSelectedStatus(""); }}>
                        <HiRefresh style={{ marginRight: '0.4rem' }} /> Reset
                    </button>
                </section>

                <div className={styles.resultsInfo}>
                    Showing <span className={styles.count}>{filteredResources.length}</span> resources found in campus
                </div>

                <div className={styles.grid}>
                    {filteredResources.map(res => {
                        const status = getStatusConfig(res.status);
                        return (
                            <article 
                                key={res.id} 
                                className={styles.card}
                                onClick={() => { setSelectedResource(res); setShowModal(true); }}
                            >
                                <div className={styles.cardImage}>
                                    {res.imageUrl ? (
                                        <img src={buildAssetUrl(res.imageUrl)} alt={res.name} className={styles.image} />
                                    ) : (
                                        <div className={styles.imagePlaceholder}>
                                            <HiCube size={48} />
                                        </div>
                                    )}
                                    <div className={styles.typeBadge}>{formatEnumLabel(res.type)}</div>
                                </div>
                                <div className={styles.cardBody}>
                                    <h3>{res.name}</h3>
                                    <div className={styles.location}>
                                        <HiLocationMarker /> {res.location}
                                    </div>
                                    <div className={styles.cardFooter}>
                                        <div className={styles.stat}>
                                            <HiUsers /> {res.capacity} Seats
                                        </div>
                                        <div className={styles.statusIndicator} style={{ color: status.color }}>
                                            <div className={styles.dot} style={{ background: status.dot }} />
                                            {status.label}
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                {filteredResources.length === 0 && (
                    <div className={styles.emptyState}>
                        <HiSearch size={64} className={styles.emptyIcon} />
                        <h3>No Resources Found</h3>
                        <p>We couldn't find any resources matching your current search or filters.</p>
                    </div>
                )}
            </div>

            {/* FULL DISPLAY RESOURCE DETAIL */}
            {showModal && selectedResource && (
                <div className={styles.detailOverlay}>
                    <header className={styles.detailHeader}>
                        <button className={styles.backBtn} onClick={() => setShowModal(false)}>
                            <HiArrowRight style={{ transform: 'rotate(180deg)' }} /> Back to Directory
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Smart Campus Asset Management</span>
                            <HiAcademicCap size={24} style={{ color: '#2563eb' }} />
                        </div>
                    </header>

                    <main className={styles.detailMain}>
                        <div className={styles.detailCard}>
                            <div className={styles.detailImageSection}>
                                {selectedResource.imageUrl ? (
                                    <img src={buildAssetUrl(selectedResource.imageUrl)} alt={selectedResource.name} className={styles.detailImage} />
                                ) : (
                                    <div className={styles.imagePlaceholder}>
                                        <HiCube size={120} />
                                    </div>
                                )}
                                <div className={styles.imageOverlay} />
                                <div className={styles.detailBadge}>{formatEnumLabel(selectedResource.type)}</div>
                            </div>

                            <div className={styles.detailInfoSection}>
                                <span className={styles.detailId}>RESOURCE ID: #{selectedResource.id}</span>
                                <h2 className={styles.detailTitle}>{selectedResource.name}</h2>
                                
                                <div 
                                    className={styles.statusPill} 
                                    style={{ 
                                        background: `${getStatusConfig(selectedResource.status).dot}15`, 
                                        color: getStatusConfig(selectedResource.status).color 
                                    }}
                                >
                                    <div className={styles.dot} style={{ background: getStatusConfig(selectedResource.status).dot }} />
                                    {getStatusConfig(selectedResource.status).label}
                                </div>

                                <div className={styles.infoBlockGrid}>
                                    <div className={styles.infoBlock}>
                                        <span className={styles.infoLabel}>Campus Location</span>
                                        <span className={styles.infoValue}>{selectedResource.location}</span>
                                    </div>
                                    <div className={styles.infoBlock}>
                                        <span className={styles.infoLabel}>Max Capacity</span>
                                        <span className={styles.infoValue}>{selectedResource.capacity} Person(s)</span>
                                    </div>
                                    <div className={styles.infoBlock}>
                                        <span className={styles.infoLabel}>Available Hours</span>
                                        <span className={styles.infoValue}>
                                            {selectedResource.availableFrom?.slice(0, 5)} - {selectedResource.availableTo?.slice(0, 5)}
                                        </span>
                                    </div>
                                    <div className={styles.infoBlock}>
                                        <span className={styles.infoLabel}>Status Category</span>
                                        <span className={styles.infoValue}>{formatEnumLabel(selectedResource.status)}</span>
                                    </div>
                                </div>

                                <div className={styles.detailActions}>
                                    <button 
                                        className={styles.bookBtn} 
                                        onClick={() => navigate("/booking")} 
                                        disabled={selectedResource.status !== 'ACTIVE'}
                                    >
                                        {selectedResource.status === 'ACTIVE' ? "Proceed to Booking" : "Currently Unavailable"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', padding: '1.5rem 2rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Close View</button>
                            <button className="btn btn-primary" onClick={() => navigate("/booking", { state: { resourceId: selectedResource.id } })} disabled={selectedResource.status !== 'ACTIVE'}>
                                {selectedResource.status === 'ACTIVE' ? "Book Now" : "Currently Unavailable"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
