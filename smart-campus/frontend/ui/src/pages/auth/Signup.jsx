import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    HiAcademicCap,
    HiCalendar,
    HiIdentification,
    HiLockClosed,
    HiMail,
    HiPhone,
    HiSparkles,
    HiUser
} from "react-icons/hi";
import api from "../../api";
import heroImage from "../../assets/hero.png";
import styles from "./AuthUi.module.css";

const yearOptions = ["FIRST", "SECOND", "THIRD", "FOURTH"];
const semesterOptions = ["SEM1", "SEM2"];

export default function Signup() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        tempEmail: "",
        phoneNumber: "",
        year: "FIRST",
        semester: "SEM1",
        password: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const phoneCheck = await api.post("/auth/check-phone", {
                phoneNumber: form.phoneNumber.trim(),
            });

            if (!phoneCheck.data?.available) {
                setError("Phone number already exists.");
                return;
            }

            const response = await api.post("/auth/register", {
                firstname: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                tempEmail: form.tempEmail.trim(),
                phoneNumber: form.phoneNumber.trim(),
                role: "USER",
                year: form.year,
                semester: form.semester,
                password: form.password,
            });

            if (!response.data?.success) {
                setError(response.data?.message || "Signup failed.");
                return;
            }

            setSuccess("Registration successful. Enter OTP to verify your account.");
            navigate("/verify", { state: { email: form.email.trim() } });
        } catch (err) {
            setError(err.response?.data?.message || "Signup failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.screen}>
            <main className={`${styles.shell} ${styles.split} ${styles.authRoute} ${styles.signupRoute}`}>
                <section className={`${styles.visual} ${styles.glass}`}>
                    <div>
                        <div className={styles.brandRow}>
                            <div className={styles.brandDot}>
                                <HiAcademicCap size={22} />
                            </div>
                            <h1 className={styles.brandText}>SmartCampus</h1>
                        </div>
                        <h2 className={styles.visualTitle}>Create your account and activate full campus access.</h2>
                        <p className={styles.visualBody}>
                            Register once to access booking approvals, role-based dashboards, and secure account tools.
                        </p>
                        <div className={styles.visualStats}>
                            <div className={styles.stat}>
                                <strong>Fast</strong>
                                <span>OTP verification flow</span>
                            </div>
                            <div className={styles.stat}>
                                <strong>Safe</strong>
                                <span>Token + cookie security</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroImageWrap}>
                        <img className={styles.heroImage} src={heroImage} alt="Smart campus visual" />
                    </div>
                </section>

                <section className={`${styles.cardWide} ${styles.glass} ${styles.signupCard} ${styles.advancedPatternCard}`}>
                    <div className={styles.cardHeader}>
                        <div>
                            <p className={styles.eyebrow}>Create Account</p>
                            <h2 className={styles.title}>Student Registration</h2>
                            <p className={styles.subtitle}>Fill the details below. Logic is unchanged, only UI is redesigned.</p>
                        </div>
                        <div className={styles.headerIcon}>
                            <HiIdentification size={22} />
                        </div>
                    </div>

                    {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}
                    {success && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{success}</div>}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGridTwo}>
                            <label className={styles.field}>
                                <span className={styles.label}>First Name</span>
                                <div className={styles.inputWrap}>
                                    <HiUser className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="firstName"
                                        value={form.firstName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Last Name</span>
                                <div className={styles.inputWrap}>
                                    <HiUser className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="lastName"
                                        value={form.lastName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>University Email</span>
                                <div className={styles.inputWrap}>
                                    <HiMail className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="email"
                                        type="email"
                                        placeholder="name@my.sliit.lk"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Recovery Email</span>
                                <div className={styles.inputWrap}>
                                    <HiMail className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="tempEmail"
                                        type="email"
                                        placeholder="backup@email.com"
                                        value={form.tempEmail}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Phone Number</span>
                                <div className={styles.inputWrap}>
                                    <HiPhone className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="phoneNumber"
                                        placeholder="07XXXXXXXX"
                                        value={form.phoneNumber}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Academic Year</span>
                                <div className={styles.inputWrap}>
                                    <HiCalendar className={styles.inputIcon} size={18} />
                                    <select
                                        className={`${styles.select} ${styles.inputPadded}`}
                                        name="year"
                                        value={form.year}
                                        onChange={handleChange}
                                    >
                                        {yearOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Semester</span>
                                <div className={styles.inputWrap}>
                                    <HiSparkles className={styles.inputIcon} size={18} />
                                    <select
                                        className={`${styles.select} ${styles.inputPadded}`}
                                        name="semester"
                                        value={form.semester}
                                        onChange={handleChange}
                                    >
                                        {semesterOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Password</span>
                                <div className={styles.inputWrap}>
                                    <HiLockClosed className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="password"
                                        type="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span className={styles.label}>Confirm Password</span>
                                <div className={styles.inputWrap}>
                                    <HiLockClosed className={styles.inputIcon} size={18} />
                                    <input
                                        className={`${styles.input} ${styles.inputPadded}`}
                                        name="confirmPassword"
                                        type="password"
                                        value={form.confirmPassword}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </label>
                        </div>

                        <button className={styles.primaryBtn} type="submit" disabled={loading}>
                            {loading ? "Creating account..." : "Complete Registration"}
                        </button>
                    </form>

                    <div className={styles.footText}>
                        Already have an account? <Link className={styles.link} to="/login">Sign in</Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
