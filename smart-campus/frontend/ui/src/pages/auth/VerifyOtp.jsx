import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { HiArrowRight, HiLockClosed, HiRefresh, HiShieldCheck } from "react-icons/hi";
import api from "../../api";
import styles from "./AuthUi.module.css";

export default function VerifyOtp() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const otpFromUrl = searchParams.get("code") || "";
    const emailHint = searchParams.get("email") || location.state?.email || "";

    const [otp, setOtp] = useState(otpFromUrl);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleVerify = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!otp.trim()) {
            setError("OTP is required.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post("/auth/verify-code", {
                verifyCode: otp.trim(),
            });

            if (!response.data?.success) {
                setError(response.data?.message || "Verification failed.");
                return;
            }

            setSuccess("Account verified successfully.");
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Verification failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setSuccess("");
        setResending(true);

        try {
            const response = await api.post("/auth/resend-otp");

            if (!response.data?.success) {
                setError(response.data?.message || "Failed to resend OTP.");
                return;
            }

            setSuccess(response.data?.message || "OTP resent.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend OTP.");
        } finally {
            setResending(false);
        }
    };

    return (
        <div className={styles.screen}>
            <main className={`${styles.shell} ${styles.centered} ${styles.authRoute}`}>
                <section className={`${styles.card} ${styles.cardCompact} ${styles.glass}`}>
                    <div className={styles.centerText}>
                        <div className={styles.headerIcon} style={{ margin: "0 auto 0.9rem" }}>
                            <HiShieldCheck size={24} />
                        </div>
                        <p className={styles.eyebrow}>Security Verify</p>
                        <h1 className={styles.title}>Confirm OTP</h1>
                        <p className={styles.subtitle}>
                            Enter the 6-digit code sent to <strong>{emailHint || "your email"}</strong>.
                        </p>
                    </div>

                    {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}
                    {success && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{success}</div>}

                    <form className={styles.form} onSubmit={handleVerify}>
                        <label className={styles.field}>
                            <span className={styles.label}>One-Time Password</span>
                            <div className={styles.inputWrap}>
                                <HiLockClosed className={styles.inputIcon} size={18} />
                                <input
                                    className={`${styles.input} ${styles.inputPadded} ${styles.otpInput}`}
                                    value={otp}
                                    onChange={(event) => setOtp(event.target.value)}
                                    placeholder="000000"
                                    required
                                    maxLength={6}
                                />
                            </div>
                        </label>

                        <button className={styles.primaryBtn} type="submit" disabled={loading}>
                            {loading ? "Verifying..." : "Verify Account"}
                        </button>
                    </form>

                    <div className={styles.stackActions} style={{ marginTop: "0.9rem" }}>
                        <button
                            className={styles.secondaryBtn}
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                        >
                            <HiRefresh style={{ marginRight: "0.4rem", verticalAlign: "middle" }} />
                            {resending ? "Resending..." : "Resend OTP"}
                        </button>
                        <div className={styles.footText}>
                            <Link className={styles.link} to="/login">Back to login</Link>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
