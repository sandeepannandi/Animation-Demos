import type { ReactNode } from "react";
import styles from "./legal-page.module.css";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.back} href="/">
          <span aria-hidden="true">←</span> nativelet
        </a>
      </header>
      <main className={styles.main}>
        <h1>{title}</h1>
        <p className={styles.updated}>Last updated {updated}</p>
        {children}
      </main>
      <footer className={styles.footer}>
        <a href="/sponsor">Sponsor</a>
        <a href="/terms">Terms of Service</a>
        <a href="/privacy">Privacy Policy</a>
        <a href="https://github.com/sandeepannandi/Nativelet">GitHub</a>
      </footer>
    </div>
  );
}
