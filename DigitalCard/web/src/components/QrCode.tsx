import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** SVG QR code (crisp at any print size). errorCorrection M survives small logos/print noise. */
export function QrCode({
  value,
  size = 220,
  fg = '#000000',
  bg = '#FFFFFF',
  title,
}: {
  value: string;
  size?: number;
  fg?: string;
  bg?: string;
  title: string;
}) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: fg, light: bg } }).then(
      (s) => {
        if (alive) setSvg(s);
      },
    );
    return () => {
      alive = false;
    };
  }, [value, fg, bg]);
  return (
    <div
      role="img"
      aria-label={title}
      style={{ width: size, height: size }}
      className="[&>svg]:h-full [&>svg]:w-full"
      // qrcode output is generated locally from our own string — safe to inject.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function qrPngDataUrl(value: string, px: number): Promise<string> {
  return QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: px });
}
