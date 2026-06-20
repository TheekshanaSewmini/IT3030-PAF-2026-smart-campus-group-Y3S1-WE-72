import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiAcademicCap, HiLockClosed, HiMail, HiRefresh, HiShieldCheck, HiSparkles } from "react-icons/hi";
import api from "../../api";
import heroImage from "../../assets/hero.png";
import styles from "../auth/AuthUi.module.css";

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        email: "",
        otp: "",
        password: "",
        repeatPassword: "",
    });

    useEffect(() => {
        if (timer <= 0) {
            return undefined;
        }

        const timeout = setTimeout(() => setTimer((prev) => prev - 1), 1000);
        return () => clearTimeout(timeout);
    }, [timer]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const sendOtp = async () => {
        setError("");
        setMessage("");

        if (!form.email.trim()) {
            setError("Email is required.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/forgotpass/send-otp", {
                email: form.email.trim(),
            });

            setMessage(response.data || "OTP sent.");
            setStep(2);
            setTimer(60);
        } catch (err) {
            setError(err.response?.data || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        setError("");
        setMessage("");

        if (!form.otp.trim()) {
            setError("OTP is required.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/forgotpass/verify-otp", {
                otp: form.otp.trim(),
            });

            setMessage(response.data || "OTP verified.");
            setStep(3);
        } catch (err) {
            setError(err.response?.data || "OTP verification failed.");
        } finally {
            setLoading(false);
        }
    };

    const resendOtp = async () => {
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const response = await api.post("/forgotpass/resend-otp");
            setMessage(response.data || "OTP resent.");
            setTimer(60);
        } catch (err) {
            setError(err.response?.data || "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        setError("");
        setMessage("");

        if (!form.password || form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (form.password !== form.repeatPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/forgotpass/change-password", {
                password: form.password,
                repeatPassword: form.repeatPassword,
            });

            setMessage(response.data || "Password changed successfully.");
            setTimeout(() => navigate("/login"), 900);
        } catch (err) {
            setError(err.response?.data || "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    const stepLabel = step === 1 ? "Step 1: Email" : step === 2 ? "Step 2: Verify OTP" : "Step 3: New Password";

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
                        <h2 className={styles.visualTitle}>Securely recover your account and continue in minutes.</h2>
                        <p className={styles.visualBody}>
                            Follow the recovery flow: email verification, OTP confirmation, and password reset.
                        </p>
                        <div className={styles.visualStats}>
                            <div className={styles.stat}>
                                <strong>3 Steps</strong>
                                <span>Simple recovery</span>
                            </div>
                            <div className={styles.stat}>
                                <strong>Safe</strong>
                                <span>OTP protected</span>
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
                            <p className={styles.eyebrow}>Recover Account</p>
                            <h1 className={styles.title}>Forgot Password</h1>
                            <p className={styles.subtitle}>{stepLabel}</p>
                        </div>
                        <div className={styles.headerIcon}>
                            {step === 1 ? <HiMail size={22} /> : step === 2 ? <HiShieldCheck size={22} /> : <HiSparkles size={22} />}
                        </div>
                    </div>

                    {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}
                    {message && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{message}</div>}

                    {step === 1 && (
                        <div className={styles.form}>
                            <label className={styles.field}>
                                <span className={styles.label}>Email Address</span>
                                <div className={styles.inputWrap}>
                                    <HiMail className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="email"
                                        type="email"
                                        placeholder="your-email@my.sliit.lk"
                                        value={form.email}
                                        onChange={handleChange}
                                    />
                                </div>
                            </label>

                            <button className={styles.primaryBtn} type="button" onClick={sendOtp} disabled={loading}>
                                {loading ? "Sending..." : "Send OTP"}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.form}>
                            <label className={styles.field}>
                                <span className={styles.label}>OTP Code</span>
                                <div className={styles.inputWrap}>
                                    <HiShieldCheck className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="otp"
                                        placeholder="Enter OTP"
                                        value={form.otp}
                                        onChange={handleChange}
                                    />
                                </div>
                            </label>

                            <button className={styles.primaryBtn} type="button" onClick={verifyOtp} disabled={loading}>
                                {loading ? "Verifying..." : "Verify OTP"}
                            </button>

                            <button
                                className={styles.secondaryBtn}
                                type="button"
                                onClick={resendOtp}
                                disabled={loading || timer > 0}
                            >
                                <HiRefresh style={{ marginRight: "0.4rem", verticalAlign: "middle" }} />
                                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className={styles.form}>
                            <label className={styles.field}>
                                <span className={styles.label}>New Password</span>
                                <div className={styles.inputWrap}>
                                    <HiLockClosed className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="password"
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Repeat Password</span>
                                <div className={styles.inputWrap}>
                                    <HiLockClosed className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="repeatPassword"
                                        type="password"
                                        value={form.repeatPassword}
                                        onChange={handleChange}
                                    />
                                </div>
                            </label>

                            <button className={styles.primaryBtn} type="button" onClick={resetPassword} disabled={loading}>
                                {loading ? "Saving..." : "Change Password"}
                            </button>
                        </div>
                    )}

                    <div className={styles.footText}>
                        Back to <Link className={styles.link} to="/login">login</Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
