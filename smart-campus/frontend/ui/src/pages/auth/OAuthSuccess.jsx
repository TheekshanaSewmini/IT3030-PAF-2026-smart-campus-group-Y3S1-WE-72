import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiSparkles } from "react-icons/hi";
import api from "../../api";
import { roleHomePath } from "../../utils/roleHome";
import { queueWelcomePopup } from "../../utils/welcomePopup";
import styles from "./AuthUi.module.css";

export default function OAuthSuccess() {
    const navigate = useNavigate();
    const [message, setMessage] = useState("Finalizing sign-in...");

    useEffect(() => {
        let active = true;

        const completeOAuthLogin = async () => {
            try {
                const response = await api.get("/auth/me");
                const user = response?.data?.user;

                if (!response?.data?.authenticated || !user?.role) {
                    throw new Error("Session not established");
                }

                queueWelcomePopup(user);
                navigate(roleHomePath(user.role), { replace: true });
            } catch {
                if (!active) {
                    return;
                }

                setMessage("Google login failed. Redirecting to login...");
                setTimeout(() => {
                    if (active) {
                        navigate("/login", { replace: true });
                    }
                }, 1200);
            }
        };

        completeOAuthLogin();

        return () => {
            active = false;
        };
    }, [navigate]);

    return (
        <div className={styles.screen}>
            <main className={`${styles.shell} ${styles.centered}`}>
                <section className={`${styles.card} ${styles.glass} ${styles.centerText}`}>
                    <div className={styles.spinner} />
                    <div className={styles.headerIcon} style={{ margin: "0 auto 0.9rem" }}>
                        <HiSparkles size={20} />
                    </div>
                    <p className={styles.eyebrow}>OAuth2 Login</p>
                    <h1 className={styles.title}>Signing you in</h1>
                    <p className={styles.subtitle}>{message}</p>
                </section>
            </main>
        </div>
    );
}
