import styles from "./what-you-get.module.css";

const REPO = "https://github.com/sandeepannandi/Nativelet";

const items = [
  {
    title: "12 interaction components",
    body: "Each one is a small, focused piece: a chart you scrub, a menu that goes gooey, a lens that follows your finger.",
  },
  {
    title: "Source you can read",
    body: "Every component lives in the open repository, so you can read how it works and copy what you need.",
    href: `${REPO}/tree/main/packages/ui/src/components`,
    link: "Browse the source",
  },
  {
    title: "MIT licensed",
    body: "Free to use, change and ship in your own work.",
    href: `${REPO}/blob/main/LICENSE`,
    link: "Read the license",
  },
  {
    title: "Honest previews",
    body: "The previews here run on the web as an SVG, canvas or CSS adapter. They are not the native Skia render, and the page says so.",
  },
];

export function WhatYouGet() {
  return (
    <section className={styles.wyg} aria-labelledby="wyg-title">
      <p className={styles.eyebrow}>What you get</p>
      <h2 id="wyg-title">Plain facts about Nativelet.</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.title} className={styles.item}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            {item.href ? <a href={item.href}>{item.link}</a> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
