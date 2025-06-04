// hexToRgb.js
export default function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  let bigint = parseInt(hex, 16);
  let r, g, b;
  if (hex.length === 6) {
    r = (bigint >> 16) & 255;
    g = (bigint >> 8) & 255;
    b = bigint & 255;
  } else if (hex.length === 3) {
    r = (bigint >> 8) & 15;
    g = (bigint >> 4) & 15;
    b = bigint & 15;
    r = (r << 4) | r;
    g = (g << 4) | g;
    b = (b << 4) | b;
  } else {
    return "0,0,0";
  }
  return `${r},${g},${b}`;
}
