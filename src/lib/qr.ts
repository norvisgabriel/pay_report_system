import QRCode from "qrcode";

export async function generateReceiptQR(receiptToken: string): Promise<string> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/validate/${receiptToken}`;
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 300,
    color: {
      dark: "#1e3a8a",
      light: "#ffffff",
    },
  });
  return dataUrl;
}

export function getReceiptUrl(receiptToken: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/validate/${receiptToken}`;
}
