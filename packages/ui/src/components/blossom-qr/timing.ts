// Transition length in ms. Reduced motion is a short fade; slow motion stretches either 4x (a demo aid, off by default).
export const transitionMs = (reduced: boolean, slow?: boolean): number => (reduced ? 220 : 2400) * (slow ? 4 : 1);
