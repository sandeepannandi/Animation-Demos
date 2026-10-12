import styles from "./faq.module.css";

const REPO = "https://github.com/sandeepannandi/Nativelet";

const faqs = [
  {
    q: "What is Nativelet?",
    a: "An open-source interface playground by Sandeepan Nandi. It is a growing set of small interaction components, each with a web preview and React Native source.",
  },
  {
    q: "Can I use the components in my React Native app?",
    a: "The source is real React Native. Copy the files named in each component's note, keep the LICENSE, and add the dependencies it lists. Some use Skia, Reanimated and worklets; others use core React Native only.",
  },
  {
    q: "Is the web preview the real component?",
    a: "No. The preview is a web version that shares the math or the gesture rules, drawn with SVG, canvas or CSS. It is not the native render.",
  },
  {
    q: "Have the components been tested on a device?",
    a: "Not all of them. Several components say \"Not yet tested on a device\" in their notes. Check each component's note and README before you rely on it.",
  },
  {
    q: "Do the components respect Reduce Motion?",
    a: "The notes for Scrub Chart, Gooey Menu, Glass Lens and Theme Reveal describe what Reduce Motion changes. Each component's note and README has the details for that one.",
  },
  {
    q: "Is it free to use?",
    a: "Yes. Nativelet is MIT licensed. Keep the LICENSE file with any source you copy.",
  },
  {
    q: "How do I report a bug or ask for something?",
    a: "Open an issue on GitHub.",
    href: `${REPO}/issues`,
    link: "Open issues",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export function Faq() {
  return (
    <section className={styles.faq} id="faq" aria-labelledby="faq-title">
      <p className={styles.eyebrow}>FAQ</p>
      <h2 id="faq-title">Questions, answered plainly.</h2>
      <div className={styles.list}>
        {faqs.map((f) => (
          <details key={f.q} className={styles.item}>
            <summary>
              <span>{f.q}</span>
              <i aria-hidden="true" />
            </summary>
            <p>
              {f.a}
              {f.href ? (
                <>
                  {" "}
                  <a href={f.href}>{f.link}</a>
                </>
              ) : null}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
