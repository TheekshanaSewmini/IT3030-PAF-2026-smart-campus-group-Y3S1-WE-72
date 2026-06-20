import { Link } from "react-router-dom";
import {
    HiAcademicCap,
    HiArrowRight,
    HiBell,
    HiCalendar,
    HiCheckCircle,
    HiLockClosed,
    HiOfficeBuilding,
    HiSparkles,
    HiUser
} from "react-icons/hi";
import heroImage from "../../assets/hero.png";
import styles from "./LaunchPage.module.css";

const modules = [
    {
        icon: HiOfficeBuilding,
        title: "Resource Directory",
        description: "Search labs, halls, and equipment with location, status, and availability details."
    },
    {
        icon: HiCalendar,
        title: "Booking Workflow",
        description: "Create bookings, pick slots, and track request status from pending to approved/rejected."
    },
    {
        icon: HiBell,
        title: "Notification Panel",
        description: "Users receive notifications when bookings are approved or rejected by admins."
    },
    {
        icon: HiUser,
        title: "Role-Based Access",
        description: "Different flows and dashboards for users, admins, and technicians."
    }
];

const platformHighlights = [
    "Role-based dashboards for users, admins, and technicians",
    "Booking history and decision tracking in one view",
    "Notification panel for booking approval/rejection updates",
    "Profile and account management from the web UI"
];

const processFlow = [
    {
        title: "Request",
        description: "User submits a booking request for a resource."
    },
    {
        title: "Review",
        description: "Admin reviews pending bookings in the management view."
    },
    {
        title: "Decision",
        description: "Booking is approved or rejected and status is updated."
    },
    {
        title: "Notify",
        description: "System creates notification for the booking owner in the UI panel."
    }
];

export default function LaunchPage() {
    return (
        <div className={styles.page}>
            <div className={styles.texture} />

            <header className={styles.navbar}>
                <Link to="/" className={styles.brand}>
                    <span className={styles.brandIcon}>
                        <HiAcademicCap />
                    </span>
                    <span>SmartCampus</span>
                </Link>

                <nav className={styles.navLinks}>
                    <Link to="/privacy-policy">Privacy Policy</Link>
                    <Link to="/login">Login</Link>
                    <Link to="/signup" className={styles.navCta}>
                        Sign Up
                    </Link>
                </nav>
            </header>

            <main className={styles.content}>
                <section className={styles.hero}>
                    <div className={styles.heroText}>
                        <p className={styles.eyebrow}>Campus Platform</p>
                        <h1>Manage resources, bookings, and decisions in one secure web experience.</h1>
                        <p className={styles.lead}>
                            This system handles campus resource discovery, booking requests, admin approvals/rejections,
                            and user notifications with role-based access and practical day-to-day workflows.
                        </p>

                        <div className={styles.heroActions}>
                            <Link to="/login" className={`${styles.button} ${styles.primaryButton}`}>
                                Go to Login <HiArrowRight />
                            </Link>
                            <Link to="/signup" className={`${styles.button} ${styles.secondaryButton}`}>
                                Create New Account
                            </Link>
                        </div>

                        <div className={styles.securityStrip}>
                            <HiCheckCircle />
                            <span>Secure, role-based campus operations</span>
                        </div>
                    </div>

                    <aside className={styles.heroCard}>
                        <div className={styles.heroCardGlow} />
                        <img src={heroImage} alt="SmartCampus visual" className={styles.heroImage} />
                        <div className={styles.heroBadge}>
                            <HiSparkles />
                            <span>Booking-Centered Workflow</span>
                        </div>
                    </aside>
                </section>

                <section className={styles.modulesSection}>
                    <div className={styles.sectionHead}>
                        <h2>What This Website Does</h2>
                        <p>Your current implementation centers around these modules.</p>
                    </div>

                    <div className={styles.moduleGrid}>
                        {modules.map((module) => {
                            const Icon = module.icon;
                            return (
                                <article key={module.title} className={styles.moduleCard}>
                                    <span className={styles.moduleIcon}>
                                        <Icon />
                                    </span>
                                    <h3>{module.title}</h3>
                                    <p>{module.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className={styles.flowSection}>
                    <div className={styles.sectionHead}>
                        <h2>Booking Decision Flow</h2>
                        <p>Aligned with your assignment scope for notifications.</p>
                    </div>
                    <div className={styles.flowGrid}>
                        {processFlow.map((step, index) => (
                            <article key={step.title} className={styles.flowCard}>
                                <span className={styles.flowNumber}>{index + 1}</span>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.securitySection}>
                    <div className={styles.sectionHead}>
                        <h2>Platform Highlights</h2>
                        <p>Key behaviors available in your current implementation.</p>
                    </div>

                    <div className={styles.securityGrid}>
                        {platformHighlights.map((item) => (
                            <div key={item} className={styles.securityItem}>
                                <HiCheckCircle />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={styles.privacyCta}>
                    <div>
                        <h2>Read Data Handling and Privacy Details</h2>
                        <p>
                            View how account data, booking decisions, and notification records are handled in this
                            project.
                        </p>
                    </div>
                    <div className={styles.privacyActions}>
                        <Link to="/privacy-policy" className={`${styles.button} ${styles.secondaryButton}`}>
                            Open Privacy Policy
                        </Link>
                        <Link to="/login" className={`${styles.button} ${styles.primaryButton}`}>
                            Continue to Login <HiLockClosed />
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
