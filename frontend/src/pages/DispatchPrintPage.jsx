import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-GB");
};

const getShortWindow = (value) => {
  if (!value) return "—";
  return String(value).replace(/\s*[–-]\s*/, " – ");
};

const money = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const number = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function DispatchPrintPage() {
  const { id } = useParams();
  const noteRef = useRef(null);
  const [dispatchRecord, setDispatchRecord] = useState(null);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const loadDispatch = async () => {
      try {
        const res = await api.get(`/dispatch/${id}`);
        setDispatchRecord(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load dispatch details");
      }
    };

    loadDispatch();
  }, [id]);

  useEffect(() => {
    if (!dispatchRecord) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") !== "1") return;

    const timer = window.setTimeout(() => {
      window.print();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [dispatchRecord]);

  const items = dispatchRecord?.items || [];

  const subtotal = useMemo(() => {
    return items.reduce((sum, row) => sum + Number(row.line_total || 0), 0);
  }, [items]);

  const totalQty = useMemo(() => {
    return items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  }, [items]);

  const totalWeight = useMemo(() => {
    return items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  }, [items]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!noteRef.current) return;

    try {
      setPdfBusy(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(noteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;
      }

      const fileName = `${
        dispatchRecord?.delivery_note_number ||
        dispatchRecord?.dispatch_number ||
        "delivery-note"
      }.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF. Make sure jspdf and html2canvas are installed.");
    } finally {
      setPdfBusy(false);
    }
  }, [dispatchRecord]);

  if (error) {
    return <div style={{ padding: 24, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{error}</div>;
  }

  if (!dispatchRecord) {
    return <div style={{ padding: 24, fontFamily: "Plus Jakarta Sans, sans-serif" }}>Loading...</div>;
  }

  return (
    <div
      style={{
        background: "#eef3ef",
        minHeight: "100vh",
        padding: "24px 18px",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
        }

        .dn-screen-bar {
          width: 100%;
          max-width: 980px;
          margin: 0 auto 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .dn-screen-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dn-screen-title {
          font-size: 26px;
          font-weight: 800;
          color: #0b2f40;
          letter-spacing: -0.02em;
        }

        .dn-screen-sub {
          font-size: 13px;
          color: #48616c;
        }

        .dn-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .dn-btn {
          border: none;
          cursor: pointer;
          border-radius: 999px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 700;
          font-family: inherit;
        }

        .dn-btn-primary {
          background: #1f7a43;
          color: #fff;
        }

        .dn-btn-secondary {
          background: #fff;
          color: #0b2f40;
          border: 1px solid #d2dbd6;
        }

        .dn-sheet {
          width: 100%;
          max-width: 980px;
          margin: 0 auto;
          background: #fff;
          color: #0b2f40;
          box-shadow: 0 16px 42px rgba(10, 40, 24, 0.12);
        }

        .dn-inner {
          padding: 54px 58px 42px;
        }

        .dn-top {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
          align-items: start;
        }

        .dn-title {
          font-size: 48px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.03em;
          margin: 0 0 8px;
          color: #072f40;
        }

        .dn-company-name {
          font-size: 21px;
          font-weight: 800;
          margin: 0;
        }

        .dn-address {
          font-size: 17px;
          line-height: 1.2;
          white-space: pre-line;
          margin-top: 4px;
        }

        .dn-brand {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          gap: 14px;
          padding-top: 6px;
        }

        .dn-brand-mark {
          width: 64px;
          height: 64px;
          background: #8c8c8c;
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          position: relative;
          flex-shrink: 0;
        }

        .dn-brand-mark::before,
        .dn-brand-mark::after {
          content: "";
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
        }

        .dn-brand-mark::before {
          width: 22px;
          height: 22px;
          top: 10px;
          border-radius: 999px;
        }

        .dn-brand-mark::after {
          width: 26px;
          height: 22px;
          top: 34px;
          border-radius: 16px 16px 10px 10px;
        }

        .dn-brand-text {
          font-size: 34px;
          font-weight: 900;
          letter-spacing: 0.02em;
          padding-top: 12px;
        }

        .dn-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 34px;
          margin-top: 34px;
        }

        .dn-block-title {
          margin: 0 0 4px;
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .dn-block-text {
          font-size: 17px;
          line-height: 1.25;
          white-space: pre-line;
        }

        .dn-right-meta {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 2px 22px;
          align-content: start;
        }

        .dn-right-meta .label {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .dn-right-meta .value {
          font-size: 18px;
          font-weight: 800;
        }

        .dn-rule {
          border: none;
          border-top: 4px solid #e16b67;
          margin: 26px 0 0;
        }

        .dn-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0;
        }

        .dn-table thead th {
          padding: 8px 12px;
          font-size: 18px;
          font-weight: 900;
          color: #363636;
          text-transform: uppercase;
          border-bottom: 4px solid #e16b67;
        }

        .dn-table tbody td {
          padding: 12px 12px;
          font-size: 17px;
          font-weight: 700;
          color: #333;
          vertical-align: top;
        }

        .dn-table tbody td:nth-child(1),
        .dn-table tbody td:nth-child(3),
        .dn-table tbody td:nth-child(4),
        .dn-table tbody td:nth-child(5) {
          text-align: center;
        }

        .dn-desc-main {
          font-weight: 800;
        }

        .dn-desc-sub {
          display: block;
          margin-top: 3px;
          font-size: 13px;
          color: #6b747a;
          font-weight: 600;
        }

        .dn-summary {
          width: 46%;
          margin-left: auto;
          margin-top: 8px;
          border-top: 4px solid #e16b67;
          border-bottom: 4px solid #e16b67;
          padding: 6px 0 2px;
        }

        .dn-summary-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          padding: 7px 0;
          font-size: 17px;
          font-weight: 700;
          color: #333;
        }

        .dn-summary-row.total {
          font-size: 22px;
          font-weight: 900;
        }

        .dn-sign-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 120px;
        }

        .dn-sign-box {
          width: 220px;
          text-align: center;
        }

        .dn-sign-line {
          border-top: 4px solid #e16b67;
          margin-bottom: 10px;
        }

        .dn-sign-label {
          font-size: 16px;
        }

        .dn-bottom {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 26px;
          align-items: end;
          margin-top: 130px;
        }

        .dn-thanks {
          font-size: 44px;
          line-height: 1;
          font-weight: 900;
          color: #e16b67;
          white-space: nowrap;
        }

        .dn-terms {
          border-left: 4px solid #e16b67;
          padding-left: 16px;
        }

        .dn-terms-title {
          font-size: 18px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 14px;
        }

        .dn-terms p {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.45;
        }

        .dn-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 42px;
          font-size: 12px;
          font-weight: 700;
          color: #111;
        }

        .dn-footer-left {
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .dn-pdf-mark {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 19px;
          font-weight: 900;
          color: #222;
        }

        .dn-pdf-badge {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #ef5140;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 900;
          line-height: 1;
        }

        .dn-pdf-script {
          font-style: italic;
          font-weight: 600;
        }

        @media print {
          body {
            background: #fff !important;
          }

          .dn-screen-bar {
            display: none !important;
          }

          .dn-sheet {
            box-shadow: none !important;
            max-width: none !important;
          }

          .dn-inner {
            padding: 28px 30px 22px !important;
          }
        }

        @media (max-width: 900px) {
          .dn-inner {
            padding: 30px 24px;
          }

          .dn-top,
          .dn-meta-grid,
          .dn-bottom {
            grid-template-columns: 1fr;
          }

          .dn-brand {
            justify-content: flex-start;
          }

          .dn-summary {
            width: 100%;
          }

          .dn-thanks {
            white-space: normal;
            font-size: 36px;
          }
        }
      `}</style>

      <div className="dn-screen-bar">
        <div className="dn-screen-left">
          <div className="dn-screen-title">Delivery / Dispatch Note</div>
          <div className="dn-screen-sub">
            Print this note or download it as PDF for the customer handover.
          </div>
        </div>
        <div className="dn-actions">
          <button
            type="button"
            className="dn-btn dn-btn-secondary"
            onClick={() => window.history.back()}
          >
            Back
          </button>
          <button type="button" className="dn-btn dn-btn-secondary" onClick={handlePrint}>
            Print
          </button>
          <button
            type="button"
            className="dn-btn dn-btn-primary"
            onClick={handleDownloadPdf}
            disabled={pdfBusy}
          >
            {pdfBusy ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div ref={noteRef} className="dn-sheet">
        <div className="dn-inner">
          <div className="dn-top">
            <div>
              <h1 className="dn-title">DELIVERY NOTE</h1>
              <p className="dn-company-name">Fresh World Exporters</p>
              <div className="dn-address">
                Manning Market{"\n"}Colombo 12{"\n"}Sri Lanka
              </div>
            </div>

            <div className="dn-brand">
              <div className="dn-brand-mark" />
              <div className="dn-brand-text">FRESH WORLD</div>
            </div>
          </div>

          <div className="dn-meta-grid">
            <div>
              <p className="dn-block-title">Deliver To:</p>
              <div className="dn-block-text">
                {dispatchRecord.customer_name || dispatchRecord.client_name || "—"}
                {"\n"}
                {dispatchRecord.contact_person || "Customer Contact"}
                {"\n"}
                {dispatchRecord.city || "—"}, Sri Lanka
                {dispatchRecord.phone ? `\n${dispatchRecord.phone}` : ""}
              </div>
            </div>

            <div>
              <p className="dn-block-title">Ship From:</p>
              <div className="dn-block-text">
                Fresh World Exporters
                {"\n"}
                Manning Market
                {"\n"}
                Colombo 12
                {"\n"}
                Sri Lanka
              </div>
            </div>

            <div className="dn-right-meta">
              <div className="label">Delivery#</div>
              <div className="value">{dispatchRecord.delivery_note_number || "—"}</div>

              <div className="label">Dispatch#</div>
              <div className="value">{dispatchRecord.dispatch_number || "—"}</div>

              <div className="label">Delivery Date</div>
              <div className="value">{formatDate(dispatchRecord.dispatch_date)}</div>

              <div className="label">Due Time</div>
              <div className="value">{getShortWindow(dispatchRecord.delivery_window)}</div>
            </div>
          </div>

          <hr className="dn-rule" />

          <table className="dn-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Description</th>
                <th>Unit Price</th>
                <th>Amount</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{number(item.quantity)}</td>
                    <td>
                      <span className="dn-desc-main">{item.item_name || "Dispatch Item"}</span>
                      <span className="dn-desc-sub">
                        {item.item_code || "—"}
                        {item.batch_code ? ` · Batch ${item.batch_code}` : ""}
                        {item.expiry_date ? ` · Exp ${formatDate(item.expiry_date)}` : ""}
                      </span>
                    </td>
                    <td>{money(item.unit_price)}</td>
                    <td>{money(item.line_total)}</td>
                    <td>{item.unit || "kg"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "22px 12px" }}>
                    No dispatch items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="dn-summary">
            <div className="dn-summary-row">
              <span>Sub-Total</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="dn-summary-row">
              <span>Total Quantity</span>
              <span>{number(totalQty)}</span>
            </div>
            <div className="dn-summary-row total">
              <span>Total Weight</span>
              <span>{number(totalWeight)} kg</span>
            </div>
          </div>

          <div className="dn-sign-wrap">
            <div className="dn-sign-box">
              <div className="dn-sign-line" />
              <div className="dn-sign-label">Signature</div>
            </div>
          </div>

          <div className="dn-bottom">
            <div className="dn-thanks">THANK YOU..</div>
            <div className="dn-terms">
              <div className="dn-terms-title">Terms & Conditions</div>
              <p>
                Delivery window: {getShortWindow(dispatchRecord.delivery_window)}. Please check
                quantities and item condition at handover.
              </p>
              <p>
                Prepared by {dispatchRecord.created_by_name || "Fresh World ERP"}. For issues or
                returns, contact Fresh World Exporters on the same day.
              </p>
            </div>
          </div>

          <div className="dn-footer">
            <div className="dn-footer-left">
              <div className="dn-pdf-mark">
                <span className="dn-pdf-badge">P</span>
                <span>
                  PDF<span className="dn-pdf-script">Agile</span>
                </span>
              </div>
            </div>
            <div>delivery note template pdf</div>
          </div>
        </div>
      </div>
    </div>
  );
}