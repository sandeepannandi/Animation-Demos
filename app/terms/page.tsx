import type { Metadata } from "next";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service - Nativelet",
  description: "The terms for using the Nativelet website and its open-source code.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="October 12, 2026">
      <p>
        These terms cover your use of the Nativelet website at nativelet.netlify.app, which is an
        open-source project by Sandeepan Nandi. By using the site you agree to them.
      </p>
      <h2>What the site is</h2>
      <p>
        A showcase of React Native components with web previews and copyable source code. The web
        previews are adapters for the browser and are not the native render. The components have
        not yet been tested on physical devices.
      </p>
      <h2>The code</h2>
      <p>
        The source code is released under the MIT License. The full text is in the{" "}
        <a href="https://github.com/sandeepannandi/Nativelet/blob/main/LICENSE">LICENSE file</a>{" "}
        in the repository. If you copy a component, keep its license notice.
      </p>
      <h2>No warranty</h2>
      <p>
        As the MIT License says, the software and this website are provided &quot;as is&quot;,
        without warranty of any kind. Test components in your own app before you ship them. We are
        not liable for any damage that comes from using the site or the code.
      </p>
      <h2>Using the site</h2>
      <p>
        Use the site lawfully and do not try to disrupt it. Third-party names and tools mentioned
        belong to their owners.
      </p>
      <h2>Links</h2>
      <p>
        The site links to other websites. We do not control them and are not responsible for their
        content.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms. The date above shows the latest version. Continuing to use the
        site after a change means you accept it.
      </p>
      <h2>Contact</h2>
      <p>
        Open an issue at{" "}
        <a href="https://github.com/sandeepannandi/Nativelet/issues">
          github.com/sandeepannandi/Nativelet/issues
        </a>
        . See also the <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalPage>
  );
}
