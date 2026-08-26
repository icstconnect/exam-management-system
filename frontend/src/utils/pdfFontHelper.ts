import type { jsPDF } from 'jspdf';

let regularFontBinary: string | null = null;
let boldFontBinary: string | null = null;

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return binary;
}

/**
 * Loads and registers Noto Sans Bengali Unicode fonts (Regular & Bold) into the given jsPDF instance.
 * Embeds the true Unicode TTF font directly inside the generated PDF so that Bengali, English,
 * numerals, and symbols render seamlessly on any OS/browser without missing glyphs or mojibake.
 */
export async function setupBengaliUnicodeFont(doc: jsPDF): Promise<void> {
  try {
    if (!regularFontBinary) {
      const regRes = await fetch('/fonts/NotoSansBengali-Regular.ttf');
      if (!regRes.ok) throw new Error('Failed to load NotoSansBengali-Regular.ttf');
      const regBuf = await regRes.arrayBuffer();
      regularFontBinary = arrayBufferToBinaryString(regBuf);
    }

    if (!boldFontBinary) {
      const boldRes = await fetch('/fonts/NotoSansBengali-Bold.ttf');
      if (!boldRes.ok) throw new Error('Failed to load NotoSansBengali-Bold.ttf');
      const boldBuf = await boldRes.arrayBuffer();
      boldFontBinary = arrayBufferToBinaryString(boldBuf);
    }

    doc.addFileToVFS('NotoSansBengali-Regular.ttf', regularFontBinary);
    doc.addFont('NotoSansBengali-Regular.ttf', 'NotoSansBengali', 'normal');

    doc.addFileToVFS('NotoSansBengali-Bold.ttf', boldFontBinary);
    doc.addFont('NotoSansBengali-Bold.ttf', 'NotoSansBengali', 'bold');

    doc.setFont('NotoSansBengali', 'normal');
  } catch (error) {
    console.error('Error registering Unicode Bengali font in jsPDF:', error);
    // Fallback to standard font if network fails
    doc.setFont('helvetica', 'normal');
  }
}
