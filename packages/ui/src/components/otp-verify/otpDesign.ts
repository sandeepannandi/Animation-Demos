// Look of OTP Verify, light mode only. Plain data shared by the Skia
// component and the web preview so both draw the same picture.
export const OTP_SHEET = "#ffffff";
export const OTP_SHEET_EDGE = "#ebe7df";
export const OTP_BOX_FILL = "#fbfaf7";
export const OTP_BOX_EDGE = "#e3dfd6";
export const OTP_INK = "#1c1a17";
export const OTP_MUTED = "#8a867c";
export const OTP_ACCENT = "#ff5a1f";
export const OTP_ACCENT_SOFT = "#ffb48f";
export const OTP_ERROR = "#e5383b";
export const OTP_TITLE = "Let\u2019s verify your number";
export const OTP_TITLE_DONE = "Verified successfully";
export const OTP_SUB1 = "We\u2019ve sent a 4-digit code to your phone.";
export const OTP_SUB2 = "It\u2019ll auto-verify once entered.";
export const OTP_RESEND_LEAD = "Didn\u2019t receive the code? ";
export const OTP_RESEND = "Resend";
export const OTP_BOX_RADIUS = 14;
// Check mark relative to the final box centre.
export const OTP_CHECK_PATH: [number, number][] = [[-9.5, 1], [-3, 7.5], [9.5, -6.5]];
// Text baselines (centre y) inside the 320 x 292 sheet.
export const OTP_TITLE_Y = 60;
export const OTP_SUB1_Y = 92;
export const OTP_SUB2_Y = 112;
export const OTP_RESEND_Y = 242;
export const OTP_TITLE_DONE_Y = 104;
export const OTP_SHEET_RADIUS = 28;
// Grabber pill at the top of the sheet and the rim light that sweeps the
// boxes while they glow.
export const OTP_GRABBER = { w: 36, h: 4, y: 14, color: "#dcd8cf" };
export const OTP_RIM_ALPHA = 0.9;
