// Geist (SIL Open Font License 1.1, see assets/fonts/OFL-Geist.txt) matches the website typography.
export const fontSources = {
  'Geist-Regular': require('../assets/fonts/Geist-Regular.ttf'),
  'Geist-Medium': require('../assets/fonts/Geist-Medium.ttf'),
  'Geist-SemiBold': require('../assets/fonts/Geist-SemiBold.ttf'),
  'Geist-Bold': require('../assets/fonts/Geist-Bold.ttf'),
};
export const F = { regular: 'Geist-Regular', medium: 'Geist-Medium', semibold: 'Geist-SemiBold', bold: 'Geist-Bold' } as const;

// Default Geist for every <Text> that does not set its own fontFamily. Weight maps to the bundled files because
// Android does not synthesise weights for custom families. Text with an explicit fontFamily is left alone.
let installed = false;
export function installDefaultFont() {
  if (installed) return;
  installed = true;
  const React = require('react');
  const rn = require('react-native');
  const Original = rn.Text;
  const pick = (weight: unknown) => {
    const w = String(weight ?? '400');
    if (w === 'bold' || Number(w) >= 700) return F.bold;
    if (Number(w) >= 600) return F.semibold;
    if (Number(w) >= 500) return F.medium;
    return F.regular;
  };
  const GeistText = React.forwardRef((props: any, ref: any) => {
    const flat = rn.StyleSheet.flatten(props.style) || {};
    if (flat.fontFamily) return React.createElement(Original, { ...props, ref });
    return React.createElement(Original, { ...props, ref, style: [props.style, { fontFamily: pick(flat.fontWeight), fontWeight: undefined }] });
  });
  GeistText.displayName = 'Text';
  Object.defineProperty(rn, 'Text', { configurable: true, enumerable: true, get: () => GeistText });
}
