import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import useDocumentStore from "../../store/useDocumentStore";
import useSessionStore from "../../store/useSessionStore";
import { formatDateTime } from "../../utils/dateFormat";

export default function DocumentModal() {
  const { selectedWidget, exitDocumentMode, clearSelection } =
    useDocumentStore();
  const currentUser = useSessionStore((s) => s.currentUser);
  const workspace = useSessionStore((s) => s.workspace);
  const backdropRef = useRef(null);

  if (!selectedWidget) return null;

  const handleClose = () => {
    clearSelection();
    exitDocumentMode();
  };

  const handleDownloadPdf = async () => {
    const hospitalName = workspace?.hospitalName || "Hospital Workspace";
    const userId = currentUser?.ellyId || currentUser?.id || "N/A";
    const userName = currentUser?.fullName || "Unknown User";

    let chartImage = null;
    let chartAspect = 1;

    if (selectedWidget.id) {
      const widgetEl = document.querySelector(
        `[data-widget-id="${selectedWidget.id}"]`,
      );
      if (widgetEl) {
        if (backdropRef.current) {
          backdropRef.current.style.visibility = "hidden";
        }
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 80));

        try {
          const canvas = await html2canvas(widgetEl, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            logging: false,
          });
          chartImage = canvas.toDataURL("image/png");
          chartAspect = canvas.width / canvas.height;
        } catch {
          // silently continue without chart image
        }

        if (backdropRef.current) {
          backdropRef.current.style.visibility = "";
        }
      }
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = margin;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(hospitalName, pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setDrawColor(180);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    const refDate = selectedWidget.generatedAt ? new Date(selectedWidget.generatedAt) : new Date();
    const day = refDate.getDay();
    const mon = new Date(refDate);
    mon.setDate(refDate.getDate() - ((day + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const weekLabel = `${String(mon.getDate()).padStart(2, '0')}-${String(mon.getMonth() + 1).padStart(2, '0')}-${mon.getFullYear()} to ${String(sun.getDate()).padStart(2, '0')}-${String(sun.getMonth() + 1).padStart(2, '0')}-${sun.getFullYear()}`;

    doc.text(`Staff: ${userName} (${userId})`, margin, y);
    doc.text(`Week: ${weekLabel}`, pageWidth / 2, y, { align: "center" });
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    if (chartImage) {
      const maxWidth = pageWidth - 2 * margin;
      const maxHeight = 80;
      let imgWidth = maxWidth;
      let imgHeight = maxWidth / chartAspect;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = maxHeight * chartAspect;
      }
      const xOffset = margin + (maxWidth - imgWidth) / 2;
      doc.addImage(chartImage, "PNG", xOffset, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const reportText = selectedWidget.report || "";
    const lines = reportText.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        if (y > 260) { doc.addPage(); y = margin; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);
        doc.text(trimmed.slice(2), margin, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        y += 7;
      } else if (trimmed.startsWith("## ")) {
        if (y > 265) { doc.addPage(); y = margin; }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(70);
        doc.text(trimmed.slice(3), margin, y);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30);
        y += 6;
      } else if (trimmed.startsWith("---")) {
        if (y > 275) { doc.addPage(); y = margin; }
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        if (y > 275) { doc.addPage(); y = margin; }
        doc.setFont("helvetica", "bold");
        doc.text(trimmed.slice(2, -2), margin, y);
        doc.setFont("helvetica", "normal");
        y += 6;
      } else if (trimmed.startsWith("- ")) {
        if (y > 275) { doc.addPage(); y = margin; }
        doc.text(`· ${trimmed.slice(2)}`, margin + 3, y);
        y += 5;
      } else if (trimmed) {
        if (y > 275) { doc.addPage(); y = margin; }
        const wrapped = doc.splitTextToSize(trimmed, pageWidth - 2 * margin);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 1;
      } else {
        y += 3;
      }
    }

    doc.save(`${selectedWidget.title.replace(/\s+/g, "_")}_Report.pdf`);
  };

  return (
    <div
      ref={backdropRef}
      className="document-modal-scrim fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="document-modal-panel bg-black rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto p-6 shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-white">Document Report</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              className="text-sm px-3 py-1.5 rounded border border-gray-600 hover:bg-gray-800 text-white"
            >
              Download PDF
            </button>
            <button
              onClick={handleClose}
              className="text-sm px-3 py-1.5 rounded border border-gray-600 hover:bg-gray-800 text-white"
            >
              Close
            </button>
          </div>
        </div>
        <div className="prose prose-invert max-w-none text-sm text-white">
          <ReactMarkdown>{selectedWidget.report}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
