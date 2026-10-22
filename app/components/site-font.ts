// The canvas previews draw with the same font as the rest of the site. The
// site loads Geist through next/font, which gives it a generated family name,
// so read the family the page actually uses instead of hard-coding "Geist".
let cached = "";
export function siteFont() {
  if (cached) return cached;
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const fam = getComputedStyle(document.body).fontFamily;
  if (fam) cached = fam;
  return fam || "system-ui, sans-serif";
}
