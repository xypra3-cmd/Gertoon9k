// Minimal typing for the `qrcode` package (bundled with react-native-qrcode-svg).
declare module 'qrcode' {
  const QRCode: {
    create(text: string, options?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }): { modules: { size: number; data: ArrayLike<number | boolean> } };
  };
  export default QRCode;
}
