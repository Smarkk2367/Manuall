import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface PartData {
  id: number;
  svg: string;
  bounds: {
    xlen: number;
    ylen: number;
    zlen: number;
  };
}

interface AssemblyStep {
  stepNumber: number;
  description: string;
  partsInvolved?: number[];
}

interface ExportOptions {
  productName?: string;
  parts: PartData[];
  steps: AssemblyStep[];
  modelSnapshotDataUrl?: string | null;
  apiBase?: string;
}

async function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 400;
      canvas.height = img.height || 400;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(""); //Silently fail, skip image
    img.src = src;
  });
}

function drawHeader(
  pdf: jsPDF,
  productName: string,
  pageNum: number,
  totalPages: number
) {
  const pageW = pdf.internal.pageSize.getWidth();

  // Top border line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(10, 10, pageW - 10, 10);

  // Product name box (left)
  pdf.setLineWidth(0.3);
  pdf.rect(10, 12, 60, 12);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(productName.toUpperCase(), 13, 20);

  // "PRODUCTION DATE" and "PACKING LINE" boxes
  pdf.rect(70, 12, 35, 6);
  pdf.rect(105, 12, 35, 6);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(5);
  pdf.text("PRODUCTION DATE", 72, 16.5);
  pdf.text("PACKING LINE", 107, 16.5);
  pdf.rect(70, 18, 35, 6);
  pdf.rect(105, 18, 35, 6);

  // Page number (top right)
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text(`${pageNum}/${totalPages}`, pageW - 10, 17, { align: "right" });

  // Bottom border line
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.line(10, 26, pageW - 10, 26);
}

function drawPartsTable(
  pdf: jsPDF,
  parts: PartData[],
  yStart: number
) {
  const pageW = pdf.internal.pageSize.getWidth();
  const colW = (pageW - 20) / Math.min(parts.length, 5);
  const rowH = 20;
  const labelH = 6;

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);

  parts.slice(0, 5).forEach((part, i) => {
    const x = 10 + i * colW;

    // Outer cell
    pdf.rect(x, yStart, colW, rowH + labelH);

    // Part label (like M1, N2...)
    const labels = ["M1", "N2", "E2", "T1", "B1", "C1", "D1", "F1"];
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text(labels[i] || `P${i + 1}`, x + 3, yStart + 5);

    // Quantity below
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.text(`x1`, x + 3, yStart + rowH - 3);

    // Dimensions tiny text
    pdf.setFontSize(4.5);
    pdf.text(
      `${part.bounds.xlen.toFixed(0)}x${part.bounds.ylen.toFixed(0)}x${part.bounds.zlen.toFixed(0)}mm`,
      x + 2,
      yStart + rowH + labelH - 1.5
    );
  });
}

export async function exportToPDF(options: ExportOptions): Promise<void> {
  const {
    productName = "FURNITURE",
    parts,
    steps,
    modelSnapshotDataUrl = null,
    apiBase = "http://localhost:3001",
  } = options;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = pdf.internal.pageSize.getWidth();   // 210
  const pageH = pdf.internal.pageSize.getHeight();  // 297
  const totalPages = 1 + steps.length;

  // ─── PAGE 1: Cover ──────────────────────────────────────────────
  drawHeader(pdf, productName, 1, totalPages);

  // 3D model snapshot
  const modelAreaTop = 30;
  const modelAreaH = 120;
  if (modelSnapshotDataUrl) {
    pdf.addImage(modelSnapshotDataUrl, "PNG", 10, modelAreaTop, pageW - 20, modelAreaH);
  } else {
    pdf.setFillColor(245, 245, 245);
    pdf.rect(10, modelAreaTop, pageW - 20, modelAreaH, "F");
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(10);
    pdf.text("3D Model View", pageW / 2, modelAreaTop + modelAreaH / 2, { align: "center" });
    pdf.setTextColor(0, 0, 0);
  }

  // Separator
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(10, modelAreaTop + modelAreaH + 5, pageW - 10, modelAreaTop + modelAreaH + 5);

  // Parts icons row
  const partsRowTop = modelAreaTop + modelAreaH + 10;
  const iconW = 22;
  const iconH = 22;
  const iconSpacing = 4;

  for (let i = 0; i < Math.min(parts.length, 8); i++) {
    const part = parts[i];
    const x = 10 + i * (iconW + iconSpacing);
    if (x + iconW > pageW - 10) break;

    pdf.setLineWidth(0.2);
    pdf.setDrawColor(150, 150, 150);
    pdf.rect(x, partsRowTop, iconW, iconH);

    const svgUrl = `${apiBase}/api/step/file/${part.svg}`;
    const imgData = await loadImageAsDataUrl(svgUrl);
    if (imgData) {
      pdf.addImage(imgData, "PNG", x + 1, partsRowTop + 1, iconW - 2, iconH - 2);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Part #${part.id + 1}`, x + 1, partsRowTop + iconH + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(4);
    pdf.text(
      `${part.bounds.xlen.toFixed(0)}x${part.bounds.ylen.toFixed(0)}x${part.bounds.zlen.toFixed(0)}`,
      x + 1,
      partsRowTop + iconH + 7.5
    );
  }

  // Parts table at the bottom
  const tableTop = pageH - 50;
  drawPartsTable(pdf, parts, tableTop);

  // Footer line
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.line(10, pageH - 10, pageW - 10, pageH - 10);

  // ─── PAGES 2-N: Assembly Steps ──────────────────────────────────
  for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
    pdf.addPage();
    const step = steps[stepIdx];
    const pageNum = stepIdx + 2;

    drawHeader(pdf, productName, pageNum, totalPages);

    const contentTop = 30;
    const partsStripH = 45;          // Bottom parts strip height
    const progressH = 14;            // Progress dots height
    const mainAreaBottom = pageH - partsStripH - progressH - 15;
    const mainAreaH = mainAreaBottom - contentTop;

    const involvedParts = (step.partsInvolved ?? [])
      .map(id => parts.find(p => p.id === id))
      .filter(Boolean) as PartData[];

    // ── Step label (top-left) ─────────────────────────────────────
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(140, 140, 140);
    pdf.text(`STEP ${step.stepNumber}`, 10, contentTop + 8);

    // Accent line under step label
    pdf.setDrawColor(20, 20, 20);
    pdf.setLineWidth(1.2);
    pdf.line(10, contentTop + 10.5, 30, contentTop + 10.5);
    pdf.setLineWidth(0.3);

    // Step description (top, full width)
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    const splitDesc = pdf.splitTextToSize(step.description, pageW - 20);
    pdf.text(splitDesc, pageW / 2, contentTop + 8, { align: "center" });

    // Separator under description
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.2);
    pdf.line(10, contentTop + 17, pageW - 10, contentTop + 17);

    // ── Central ASSEMBLY VISUALIZATION ───────────────────────────
    const vizTop = contentTop + 22;
    const vizH = mainAreaBottom - vizTop - 5;

    if (involvedParts.length === 0) {
      // No parts — just show a placeholder
      pdf.setTextColor(200, 200, 200);
      pdf.setFontSize(10);
      pdf.text("No parts required for this step.", pageW / 2, vizTop + vizH / 2, { align: "center" });
      pdf.setTextColor(0, 0, 0);
    } else if (involvedParts.length === 1) {
      // Single part — render it large and centred
      const part = involvedParts[0];
      const imgS = Math.min(vizH - 10, pageW - 40, 110);
      const imgX = (pageW - imgS) / 2;
      const imgY = vizTop + (vizH - imgS) / 2;

      pdf.setFillColor(248, 248, 248);
      pdf.setDrawColor(210, 210, 210);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(imgX - 4, imgY - 4, imgS + 8, imgS + 8, 3, 3, "FD");

      const imgData = await loadImageAsDataUrl(`${apiBase}/api/step/file/${part.svg}`);
      if (imgData) pdf.addImage(imgData, "PNG", imgX, imgY, imgS, imgS);

      // Callout
      pdf.setFillColor(20, 20, 20);
      pdf.circle(imgX + imgS - 4, imgY + 4, 5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(part.id + 1), imgX + imgS - 4, imgY + 5.8, { align: "center" });
      pdf.setTextColor(0, 0, 0);

    } else {
      // Multiple parts — lay them out with dashed arrows between them
      const maxPerRow = Math.min(involvedParts.length, 4);
      const arrowW = 14;
      const gap = 6;
      const availW = pageW - 20;
      const totalArrows = maxPerRow - 1;
      const partW = (availW - totalArrows * arrowW - (maxPerRow - 1) * gap) / maxPerRow;
      const partH = Math.min(partW, vizH - 10);
      const usedW = maxPerRow * partW + totalArrows * (arrowW + gap);
      const startX = (pageW - usedW) / 2;
      const partY = vizTop + (vizH - partH) / 2;

      for (let pi = 0; pi < Math.min(involvedParts.length, maxPerRow); pi++) {
        const part = involvedParts[pi];
        const px = startX + pi * (partW + arrowW + gap);

        // Part frame
        pdf.setFillColor(248, 248, 248);
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.25);
        pdf.roundedRect(px, partY, partW, partH, 2, 2, "FD");

        const imgData = await loadImageAsDataUrl(`${apiBase}/api/step/file/${part.svg}`);
        if (imgData) pdf.addImage(imgData, "PNG", px + 2, partY + 2, partW - 4, partH - 4);

        // Callout circle (top-right corner of image)
        pdf.setFillColor(20, 20, 20);
        pdf.circle(px + partW - 5, partY + 5, 5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(part.id + 1), px + partW - 5, partY + 6.8, { align: "center" });
        pdf.setTextColor(0, 0, 0);

        // Part label below frame
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(`#${part.id + 1}`, px + partW / 2, partY + partH + 6, { align: "center" });

        // Arrow between parts
        if (pi < Math.min(involvedParts.length, maxPerRow) - 1) {
          const arrowX = px + partW + gap / 2;
          const arrowMidY = partY + partH / 2;
          const arrowEndX = arrowX + arrowW;

          pdf.setDrawColor(100, 100, 100);
          pdf.setLineWidth(0.6);
          // Dashed line body
          for (let dx = 0; dx < arrowW - 4; dx += 4) {
            pdf.line(arrowX + dx, arrowMidY, arrowX + dx + 2, arrowMidY);
          }
          // Arrow head
          pdf.setFillColor(100, 100, 100);
          const hx = arrowEndX;
          const hy = arrowMidY;
          pdf.triangle(hx, hy, hx - 4, hy - 2.5, hx - 4, hy + 2.5, "F");
        }
      }
    }

    // ── Parts strip (bottom bar) ──────────────────────────────────
    const stripTop = mainAreaBottom + 3;

    pdf.setFillColor(246, 246, 246);
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(10, stripTop, pageW - 20, partsStripH - 4, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6);
    pdf.setTextColor(130, 130, 130);
    pdf.text("PARTS USED IN THIS STEP", 16, stripTop + 7);
    pdf.setTextColor(0, 0, 0);

    const iconSz = 22;
    const iconGap = 6;
    let iconX = 16;
    const iconY = stripTop + 11;

    for (const part of involvedParts) {
      if (iconX + iconSz > pageW - 14) break;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(210, 210, 210);
      pdf.setLineWidth(0.2);
      pdf.roundedRect(iconX, iconY, iconSz, iconSz, 2, 2, "FD");

      const imgData = await loadImageAsDataUrl(`${apiBase}/api/step/file/${part.svg}`);
      if (imgData) pdf.addImage(imgData, "PNG", iconX + 1, iconY + 1, iconSz - 2, iconSz - 2);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(5);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`#${part.id + 1}`, iconX + iconSz / 2, iconY + iconSz + 4, { align: "center" });
      pdf.setTextColor(0, 0, 0);

      // Dims
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(4);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `${part.bounds.xlen.toFixed(0)}×${part.bounds.ylen.toFixed(0)}×${part.bounds.zlen.toFixed(0)}`,
        iconX + iconSz / 2,
        iconY + iconSz + 8,
        { align: "center" }
      );
      pdf.setTextColor(0, 0, 0);

      iconX += iconSz + iconGap;
    }

    // ── Progress dots ──────────────────────────────────────────────
    const dotsY = pageH - progressH;
    const dotR = 2.5;
    const maxDots = Math.min(steps.length, 20);
    const dotSpacing = (pageW - 20) / maxDots;

    pdf.setLineWidth(0.3);
    pdf.setDrawColor(210, 210, 210);
    pdf.line(10 + dotR, dotsY + dotR, pageW - 10 - dotR, dotsY + dotR);

    for (let si = 0; si < maxDots; si++) {
      const dotX = 10 + dotR + si * dotSpacing;
      const dotY = dotsY + dotR;
      const isDone = si < stepIdx;
      const isCurrent = si === stepIdx;

      if (isCurrent) {
        pdf.setFillColor(20, 20, 20);
        pdf.setDrawColor(20, 20, 20);
      } else if (isDone) {
        pdf.setFillColor(120, 120, 120);
        pdf.setDrawColor(120, 120, 120);
      } else {
        pdf.setFillColor(215, 215, 215);
        pdf.setDrawColor(215, 215, 215);
      }
      pdf.circle(dotX, dotY, dotR, "F");

      if (isCurrent) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(4.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(si + 1), dotX, dotY + 1.6, { align: "center" });
        pdf.setTextColor(0, 0, 0);
      }
    }

    // Footer line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.setTextColor(0, 0, 0);
    pdf.line(10, pageH - 5, pageW - 10, pageH - 5);
  }

  pdf.save(`${productName.replace(/\s+/g, "_")}_assembly_instructions.pdf`);
}

