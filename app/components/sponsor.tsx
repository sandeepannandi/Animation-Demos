import { ArrowUpRight, Heart } from "lucide-react";
import styles from "./sponsor.module.css";

export const SPONSOR_URL = "https://github.com/sponsors/sandeepannandi";

export function Sponsor() {
  return (
    <section className={styles.sponsor} id="support" aria-labelledby="support-title">
      <p className={styles.eyebrow}>SUPPORT</p>
      <h2 id="support-title">Help keep Nativelet going.</h2>
      <p className={styles.copy}>
        Nativelet is free and MIT licensed, and it stays that way. If it saves you time, you can
        sponsor Sandeepan Nandi on GitHub with a monthly amount you choose. It is optional.
      </p>
      <a className={styles.button} href={SPONSOR_URL}>
        <Heart size={16} aria-hidden="true" /> Sponsor on GitHub <ArrowUpRight size={16} aria-hidden="true" />
      </a>{" "}
      <a className={styles.more} href="/sponsor">
        More ways to support
      </a>
    </section>
  );
}
