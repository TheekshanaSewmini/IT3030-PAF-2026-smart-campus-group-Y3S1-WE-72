import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HiAcademicCap, HiEye, HiEyeOff, HiLockClosed, HiMail, HiSparkles } from "react-icons/hi";
import api, { getGoogleOAuthLoginUrl } from "../../api";
import { roleHomePath } from "../../utils/roleHome";
import { queueWelcomePopup } from "../../utils/welcomePopup";
import styles from "./AuthUi.module.css";
import heroImage from "../../assets/hero.png";

const getErrorMessage = (error, fallback) => {
    const payload = error?.response?.data;
    if (typeof payload === "string" && payload.trim()) return payload;
    if (payload?.message) return payload.message;
    return fallback;
};

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState({ email: "", password: "" });
    const [errors, setErrors] = useState({});
    const [notice, setNotice] = useState({ type: "", text: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const oauthError = searchParams.get("oauthError");
        if (oauthError) {
            setNotice({ type: "error", text: oauthError });
        }

        let active = true;
        const bootstrapSession = async () => {
            try {
                const session = await api.get("/auth/me");
                const userRole = session?.data?.user?.role;
                if (active && session?.data?.authenticated && userRole) {
                    navigate(roleHomePath(userRole), { replace: true });
                }
            } catch {
                // No active session; remain on login page.
            }
        };

        bootstrapSession();
        return () => {
            active = false;
        };
    }, [navigate, searchParams]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validate = () => {
        const validationErrors = {};
        if (!form.email.trim()) {
            validationErrors.email = "Email is required.";
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            validationErrors.email = "Enter a valid email address.";
        }

        if (!form.password.trim()) {
            validationErrors.password = "Password is required.";
        }
        return validationErrors;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setNotice({ type: "", text: "" });

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/auth/login", form);
            if (!response.data?.success) {
                setNotice({
                    type: "error",
                    text: response.data?.message || "Login failed. Check your credentials.",
                });
                return;
            }

            const meResponse = await api.get("/auth/me").catch(() => null);
            const user = meResponse?.data?.user;
            const role = user?.role || response.data?.role;

            queueWelcomePopup(user || { role, email: form.email });

            setNotice({ type: "success", text: "Login successful. Redirecting..." });
            navigate(roleHomePath(role), { replace: true });
        } catch (error) {
            setNotice({
                type: "error",
                text: getErrorMessage(error, "Unable to connect to server."),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (typeof window !== "undefined") {
            window.location.assign(getGoogleOAuthLoginUrl());
        }
    };

    return (
        <div className={styles.screen}>
            <main className={`${styles.shell} ${styles.split} ${styles.authRoute}`}>
                <section className={`${styles.visual} ${styles.glass}`}>
                    <div>
                        <div className={styles.brandRow}>
                            <div className={styles.brandDot}>
                                <HiAcademicCap size={22} />
                            </div>
                            <h1 className={styles.brandText}>SmartCampus</h1>
                        </div>
                        <h2 className={styles.visualTitle}>
                            One secure place for campus bookings, resources, and decisions.
                        </h2>
                        <p className={styles.visualBody}>
                            Sign in to continue with real-time booking approvals, profile tools, and personalized
                            notifications.
                        </p>
                        <div className={styles.visualStats}>
                            <div className={styles.stat}>
                                <strong>15k+</strong>
                                <span>Active users</span>
                            </div>
                            <div className={styles.stat}>
                                <strong>24/7</strong>
                                <span>Campus access</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroImageWrap}>
                        <img className={styles.heroImage} src={heroImage} alt="Smart campus visual" />
                    </div>
                </section>

                <section className={`${styles.card} ${styles.glass} ${styles.advancedPatternCard}`}>
                    <div className={styles.cardHeader}>
                        <div>
                            <p className={styles.eyebrow}>Welcome Back</p>
                            <h2 className={styles.title}>Sign In</h2>
                            <p className={styles.subtitle}>Access your account with email and password.</p>
                        </div>
                        <div className={styles.headerIcon}>
                            <HiSparkles size={22} />
                        </div>
                    </div>

                    {notice.text && (
                        <div className={`${styles.notice} ${notice.type === "error" ? styles.noticeError : styles.noticeSuccess}`}>
                            {notice.text}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        <label className={styles.field}>
                            <span className={styles.label}>Email Address</span>
                            <div className={styles.inputWrap}>
                                <HiMail className={styles.inputIcon} size={18} />
                                <input
                                    className={`${styles.input} ${styles.inputPadded}`}
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="name@university.edu"
                                />
                            </div>
                            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
                        </label>

                        <label className={styles.field}>
                            <span className={styles.label}>Password</span>
                            <div className={styles.inputWrap}>
                                <HiLockClosed className={styles.inputIcon} size={18} />
                                <input
                                    className={`${styles.input} ${styles.inputPadded}`}
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    className={styles.passwordToggle}
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <HiEyeOff size={18} /> : <HiEye size={18} />}
                                </button>
                            </div>
                            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
                        </label>

                        <div className={styles.stackActions}>
                            <button className={styles.primaryBtn} type="submit" disabled={loading}>
                                {loading ? "Authenticating..." : "Sign In"}
                            </button>
                            <button
                                className={styles.secondaryBtn}
                                type="button"
                                disabled={loading}
                                onClick={handleGoogleLogin}
                            >
                                Continue with Google
                            </button>
                        </div>
                    </form>

                    <div className={styles.footText}>
                        <p>
                            Forgot password? <Link className={styles.link} to="/forgot-password">Recover access</Link>
                        </p>
                        <p>
                            Do not have an account? <Link className={styles.link} to="/signup">Create one</Link>
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
