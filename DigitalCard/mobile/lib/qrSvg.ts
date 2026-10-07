// QR code as a standalone SVG string (Android home-screen widget renders SVG, not React views).
import QRCode from 'qrcode';

export function qrSvg(text: string, { dark = '#0B1220', light = '#FFFFFF', margin = 2 } = {}): string {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  let path = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (data[y * size + x]) path += `M${x + margin} ${y + margin}h1v1h-1z`;
  }
  const n = size + margin * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${light}"/><path d="${path}" fill="${dark}"/></svg>`;
}
