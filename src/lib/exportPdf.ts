import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportDashboardVisualPDF(
  containerRef: React.RefObject<HTMLDivElement>,
  city: string,
  onStart?: () => void,
  onDone?: () => void
) {
  if (!containerRef.current) return;
  onStart?.();

  try {
    // Capture the full scrollable content
    const el = containerRef.current;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: null, // preserve theme background
      scrollY: -window.scrollY,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // How many mm does 1 canvas pixel represent?
    const mmPerPx = pdfW / canvasW;
    const totalImgHmm = canvasH * mmPerPx;

    let yOffset = 0; // mm printed so far
    let pageNum = 0;

    while (yOffset < totalImgHmm) {
      if (pageNum > 0) pdf.addPage();

      // Source slice in canvas pixels
      const srcY = Math.round(yOffset / mmPerPx);
      const sliceH = Math.min(pdfH / mmPerPx, canvasH - srcY);

      // Draw only that horizontal strip
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvasW;
      sliceCanvas.height = Math.ceil(sliceH);
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, srcY, canvasW, sliceH, 0, 0, canvasW, sliceH);

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHmm = sliceH * mmPerPx;
      pdf.addImage(sliceData, 'PNG', 0, 0, pdfW, sliceHmm);

      yOffset += pdfH;
      pageNum++;
    }

    pdf.save(`WBDPS_${city.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } finally {
    onDone?.();
  }
}
