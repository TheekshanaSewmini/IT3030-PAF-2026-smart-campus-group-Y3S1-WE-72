import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api";
import { normalizeRole, roleHomePath } from "../../utils/roleHome";
import AppNavbar from "../../components/AppNavbar";

export default function Dashboard() {
    const navigate = useNavigate();

    const [homeData, setHomeData] = useState(null);
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const [dashboardResponse, profileResponse] = await Promise.all([
                    api.get("/user/Admin/dashboard"),
                    api.get("/user/Admin/me"),
                ]);

                setHomeData(dashboardResponse.data);
                setProfile(profileResponse.data);
            } catch (adminError) {
                const status = adminError.response?.status;

                if (status === 401) {
                    navigate("/login", { replace: true });
                    return;
                }

                if (status === 403) {
                    try {
                        const profileResponse = await api.get("/user/me");
                        const redirectPath = roleHomePath(profileResponse.data?.role);

                        if (redirectPath !== "/dashboard") {
                            navigate(redirectPath, { replace: true });
                            return;
                        }
                    } catch (profileError) {
                        if (profileError.response?.status === 401) {
                            navigate("/login", { replace: true });
                            return;
                        }
                    }
                }

                setError(adminError.response?.data?.message || "Failed to load dashboard.");
            }
        };

        loadDashboard();
    }, [navigate]);
    if (!homeData && !error) {
        return (
            <div className="loading-center">
                <div className="spinner" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const roleLabel = normalizeRole(profile?.role) || "ADMIN";

    return (
        <div className="page-shell">
            <div className="bg-layer bg-user" />
            <div className="panel page-panel">
                <AppNavbar
                    title="Dashboard"
                    subtitle={homeData?.welcomeMessage || "Overview panel."}
                    profile={profile}
                />

                {error && <p className="message error">{error}</p>}

                {!error && (
                    <>
                        <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <article className="stat-card glass-card">
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: '0 0 0.5rem' }}>Notifications</h3>
                                <p className="value" style={{ fontSize: '2rem', fontWeight: 800 }}>{homeData?.notifications ?? 0}</p>
                            </article>
                            <article className="stat-card glass-card">
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: '0 0 0.5rem' }}>Tasks</h3>
                                <p className="value" style={{ fontSize: '2rem', fontWeight: 800 }}>{homeData?.tasks ?? 0}</p>
                            </article>
                            <article className="stat-card glass-card">
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: '0 0 0.5rem' }}>Current Role</h3>
                                <p className="value" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--brand)' }}>{roleLabel}</p>
                            </article>
                        </div>

                        <section className="dashboard-actions glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Admin Quick Actions</h3>
                            <div className="actions-row" style={{ display: 'flex', gap: '1rem' }}>
                                <Link className="btn btn-primary" to="/admin/resources">Add Resource</Link>
                                <Link className="btn btn-secondary" to="/profile">Manage Profile</Link>
                                <Link className="btn btn-secondary" to="/settings">User Settings</Link>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
