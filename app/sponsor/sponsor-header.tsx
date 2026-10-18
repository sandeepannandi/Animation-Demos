"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Github, Star } from "lucide-react";
import styles from "./sponsor-page.module.css";

const REPO = "https://github.com/sandeepannandi/Nativelet";

/* Live star count from the public GitHub API, fetched fresh on every page load
   (no cache). Stays null if the request fails, so no number is ever invented. */
function useGithubStars() {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("https://api.github.com/repos/sandeepannandi/Nativelet", {
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const count = data?.stargazers_count;
        if (Number.isInteger(count) && count >= 0) setStars(count);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return stars;
}

export function SponsorHeader() {
  const stars = useGithubStars();
  return (
    <header className={styles.header}>
      <a href="/" className={styles.wordmark} aria-label="Nativelet home">
        <span className={styles.mark}>n.</span> nativelet
      </a>
      <nav aria-label="Main navigation">
        <a href="/#components">Components</a>
        <a href="/sponsor" className={styles.current} aria-current="page">
          Sponsor
        </a>
        <a
          href={REPO}
          className={styles.github}
          aria-label={
            stars === null
              ? "Nativelet on GitHub"
              : `Nativelet on GitHub, ${stars} ${stars === 1 ? "star" : "stars"}`
          }
        >
          <Github size={17} />
          <span>GitHub</span>
          {stars !== null && (
            <span className={styles.stars} aria-hidden="true">
              <Star size={13} />
              {new Intl.NumberFormat("en", { notation: "compact" }).format(stars)}
            </span>
          )}
          <ArrowUpRight size={14} />
        </a>
      </nav>
    </header>
  );
}
