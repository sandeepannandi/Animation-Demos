import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy - Nativelet",
  description: "What the Nativelet website does and does not collect.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="October 12, 2026">
      <p>
        Nativelet is an open-source project by Sandeepan Nandi. This page explains, in plain
        language, what the website at nativelet.netlify.app does with your data. It is short
        because the site collects very little.
      </p>
      <h2>What we collect</h2>
      <p>
        The site has no accounts, forms or comments, and we do not add analytics, advertising
        scripts or cookies to it. We do not ask you for personal information.
      </p>
      <h2>Hosting</h2>
      <p>
        The site is hosted on Netlify. Like any web host, Netlify receives technical request data
        such as your IP address and browser details when you load a page, and may keep standard
        server logs. See{" "}
        <a href="https://www.netlify.com/privacy/">Netlify&apos;s privacy policy</a>.
      </p>
      <h2>GitHub star count</h2>
      <p>
        The header shows the repository&apos;s star count. Your browser requests it directly from
        the public GitHub API (api.github.com), so GitHub receives your IP address as described
        in <a href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">GitHub&apos;s privacy statement</a>.
        The number is kept in your browser&apos;s session storage for ten minutes and is not sent
        to us. If the request fails, no number is shown.
      </p>
      <h2>Links to other sites</h2>
      <p>
        The site links to GitHub and to documentation sites for tools the components use. Those
        sites have their own policies.
      </p>
      <h2>Contact</h2>
      <p>
        Questions or requests: open an issue at{" "}
        <a href="https://github.com/sandeepannandi/Nativelet/issues">
          github.com/sandeepannandi/Nativelet/issues
        </a>
        .
      </p>
      <h2>Changes</h2>
      <p>
        If the site starts collecting anything new, this page will be updated first and the date
        above will change.
      </p>
    </LegalPage>
  );
}
