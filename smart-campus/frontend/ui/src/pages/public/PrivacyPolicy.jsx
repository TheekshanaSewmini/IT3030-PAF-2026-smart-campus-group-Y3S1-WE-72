import { Link } from "react-router-dom";
import {
    HiAcademicCap,
    HiBell,
    HiDatabase,
    HiFolderOpen,
    HiMail,
    HiShieldCheck,
    HiUserGroup
} from "react-icons/hi";
import styles from "./PrivacyPolicy.module.css";

const sections = [
    {
        icon: HiDatabase,
        title: "Data We Store",
        points: [
            "Account profile details such as name, email, role, phone number, year, and semester.",
            "Booking data including resource, date, time range, status, and booking owner.",
            "Notification records generated from booking approval or rejection decisions."
        ]
    },
    {
        icon: HiUserGroup,
        title: "Access and Visibility",
        points: [
            "Users can view and manage only data that belongs to their account scope.",
            "Admin and user views are separated by role and feature permissions.",
            "The system enforces protected access for booking and profile operations."
        ]
    },
    {
        icon: HiMail,
        title: "Email Communication",
        points: [
            "Email is used for important account and booking-related communication flows.",
            "Operational messages are sent only for relevant user actions and decisions."
        ]
    },
    {
        icon: HiBell,
        title: "Notifications Scope",
        points: [
            "Notifications are created only for booking approval and booking rejection decisions.",
            "Users can view only their own notifications in the notification panel."
        ]
    },
    {
        icon: HiFolderOpen,
        title: "User Controls",
        points: [
            "Users can update profile details based on available profile/settings forms.",
            "Users can request account deletion through the implemented account-management flow."
        ]
    }
];

export default function PrivacyPolicy() {
    return (
        <div className={styles.page}>
            <div className={styles.grain} />

            <header className={styles.header}>
                <Link to="/" className={styles.brand}>
                    <span className={styles.brandIcon}>
                        <HiAcademicCap />
                    </span>
                    <span>SmartCampus</span>
                </Link>

                <div className={styles.headerActions}>
                    <Link to="/">Launch Page</Link>
                    <Link to="/login">Login</Link>
                    <Link to="/signup" className={styles.signupBtn}>
                        Sign Up
                    </Link>
                </div>
            </header>

            <main className={styles.main}>
                <section className={styles.hero}>
                    <p className={styles.kicker}>Policy</p>
                    <h1>Privacy Policy</h1>
                    <p>
                        This policy explains how the SmartCampus web application handles account data, booking
                        information, and security-related records.
                    </p>
                    <div className={styles.meta}>Last updated: April 24, 2026</div>
                </section>

                <section className={styles.content}>
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <article key={section.title} className={styles.card}>
                                <div className={styles.cardIcon}>
                                    <Icon />
                                </div>
                                <div>
                                    <h2>{section.title}</h2>
                                    <ul>
                                        {section.points.map((point) => (
                                            <li key={point}>{point}</li>
                                        ))}
                                    </ul>
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className={styles.footerCta}>
                    <h2>Continue to SmartCampus</h2>
                    <p>Use your existing account or create a new account to access the system.</p>
                    <div className={styles.footerActions}>
                        <Link to="/login" className={styles.primaryBtn}>
                            Go to Login
                        </Link>
                        <Link to="/signup" className={styles.secondaryBtn}>
                            Create Account
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
