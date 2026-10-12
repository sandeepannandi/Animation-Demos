import type { Metadata } from "next";
import { ArrowUpRight, Github, Heart, Star, GitPullRequest } from "lucide-react";
import styles from "./sponsor-page.module.css";

const REPO = "https://github.com/sandeepannandi/Nativelet";
const SPONSOR_URL = "https://github.com/sponsors/sandeepannandi";
const PROFILE = "https://github.com/sandeepannandi";

export const metadata: Metadata = {
  title: "Sponsor Nativelet - Support open-source React Native components",
  description:
    "Nativelet is free and MIT licensed. Sponsor Sandeepan Nandi on GitHub to support new React Native components, device testing and upkeep.",
  alternates: { canonical: "/sponsor" },
  openGraph: {
    title: "Sponsor Nativelet",
    description:
      "Support free, open-source React Native interaction components. Sponsor on GitHub with an amount you choose.",
    url: "/sponsor",
    type: "website",
  },
};

const faqs = [
  {
    q: "Is Nativelet free?",
    a: "Yes. The code is MIT licensed and stays free to copy into your own apps. Sponsoring is optional.",
  },
  {
    q: "What does a sponsorship pay for?",
    a: "Time to build new components, test them on more devices and keep the existing ones working as React Native changes.",
  },
  {
    q: "How do I sponsor?",
    a: "Through GitHub Sponsors. You choose a monthly amount and GitHub handles the payment. You can change or cancel it from GitHub at any time.",
  },
  {
    q: "I want to sponsor as a company. Who do I talk to?",
    a: "Open an issue in the repository or message Sandeepan Nandi through his GitHub profile.",
  },
];

export default function SponsorPage() {
  return (
    <div className={styles.page}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className={styles.header}>
        <a href="/" className={styles.wordmark} aria-label="Nativelet home">
          <span className={styles.mark}>n.</span> nativelet
        </a>
        <nav aria-label="Main navigation">
          <a href="/#components" className={styles.hideSmall}>
            Components
          </a>
          <a href={REPO} className={styles.hideSmall}>
            GitHub
          </a>
          <a href="/sponsor" className={styles.current} aria-current="page">
            Sponsor
          </a>
        </nav>
      </header>

      <main id="main" className={styles.main}>
        <section className={styles.hero} aria-labelledby="sponsor-title">
          <p className={styles.eyebrow}>Sponsor</p>
          <h1 id="sponsor-title">Help keep Nativelet free and growing.</h1>
          <p className={styles.lead}>
            Nativelet is a set of open-source React Native interaction components with source code
            you can copy into your app. Your support gives it more time.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href={SPONSOR_URL}>
              <Heart size={16} aria-hidden="true" /> Sponsor on GitHub{" "}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a className={styles.secondary} href={REPO}>
              <Github size={16} aria-hidden="true" /> View the repository
            </a>
          </div>
          <dl className={styles.facts}>
            <div>
              <dt>Components</dt>
              <dd>12</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>MIT</dd>
            </div>
            <div>
              <dt>Price to use</dt>
              <dd>Free</dd>
            </div>
          </dl>
        </section>

        <section className={styles.section} aria-labelledby="ways-title">
          <h2 id="ways-title">Power a growing open-source component library</h2>
          <p className={styles.sub}>Pick an amount on GitHub. Cancel anytime.</p>
          <div className={styles.tiers}>
            <div className={`${styles.card} ${styles.featured}`}>
              <span className={styles.badge}>Monthly sponsor</span>
              <h3>You choose the amount</h3>
              <p className={styles.price}>Any amount a month</p>
              <ul>
                <li>Backs new components and device testing</li>
                <li>Sponsor badge on your GitHub profile</li>
                <li>Change or cancel from GitHub whenever you like</li>
              </ul>
              <a className={styles.primaryLight} href={SPONSOR_URL}>
                <Heart size={16} aria-hidden="true" /> Sponsor on GitHub{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <a className={styles.card} href={REPO}>
              <Star size={20} aria-hidden="true" />
              <h3>Star the repository</h3>
              <p>A star helps other developers find the project. It costs nothing.</p>
              <span>
                Star on GitHub <ArrowUpRight size={14} aria-hidden="true" />
              </span>
            </a>
            <a className={styles.card} href={`${REPO}/issues`}>
              <GitPullRequest size={20} aria-hidden="true" />
              <h3>Report or suggest</h3>
              <p>Found a bug or want a component? Open an issue.</p>
              <span>
                Open an issue <ArrowUpRight size={14} aria-hidden="true" />
              </span>
            </a>
          </div>
          <p className={styles.note}>
            Billed monthly through GitHub Sponsors, which handles payment and cancellation.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="who-title">
          <h2 id="who-title">Sponsors</h2>
          <p className={styles.sub}>The people and teams backing Nativelet will be listed here.</p>
          <div className={styles.empty}>
            <p>
              <strong>No sponsors yet.</strong> Be the first and take this spot.
            </p>
            <a className={styles.secondary} href={SPONSOR_URL}>
              <Heart size={16} aria-hidden="true" /> Become a sponsor
            </a>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="faq-title">
          <h2 id="faq-title">Questions</h2>
          <div className={styles.faq}>
            {faqs.map((f) => (
              <div key={f.q} className={styles.qa}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
          <p className={styles.contact}>
            Something else?{" "}
            <a href={PROFILE}>Message Sandeepan Nandi on GitHub</a>.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <a href="/">Home</a>
        <a href="/sponsor">Sponsor</a>
        <a href="/terms">Terms of Service</a>
        <a href="/privacy">Privacy Policy</a>
        <a href={REPO}>GitHub</a>
      </footer>
    </div>
  );
}
