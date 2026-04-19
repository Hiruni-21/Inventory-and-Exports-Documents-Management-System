import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function ReturnListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get("tab") === "wastage" ? "wastage" : "returns";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState("");
  const [returnsRows, setReturnsRows] = useState([]);
  const [wastageRows, setWastageRows] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [loadingWastage, setLoadingWastage] = useState(true);

  useEffect(() => {
    setSearchParams(
      activeTab === "wastage" ? { tab: "wastage" } : {},
      { replace: true }
    );
  }, [activeTab, setSearchParams]);

  const loadReturns = async () => {
    try {
      setLoadingReturns(true);
      const res = await api.get("/returns");
      setReturnsRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load return notes");
      setReturnsRows([]);
    } finally {
      setLoadingReturns(false);
    }
  };

  const loadWastage = async () => {
    try {
      setLoadingWastage(true);
      const res = await api.get("/wastage");
      setWastageRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load wastage records");
      setWastageRows([]);
    } finally {
      setLoadingWastage(false);
    }
  };

  useEffect(() => {
    loadReturns();
    loadWastage();
  }, []);

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();

    return returnsRows.filter((row) =>
      q === ""
        ? true
        : [
            row.return_number,
            row.po_number,
            row.supplier_name,
            row.reason,
            row.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
    );
  }, [returnsRows, search]);

  const filteredWastage = useMemo(() => {
    const q = search.trim().toLowerCase();

    return wastageRows.filter((row) =>
      q === ""
        ? true
        : [
            row.wastage_number,
            row.reason,
            row.reported_by_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
    );
  }, [wastageRows, search]);

  return (
    <>
      <div className="notice-banner notice-success">
        <span>
          Record supplier return notes, upload photos, send return notes by email,
          and record wastage with photo evidence from this page.
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 32,
          alignItems: "flex-end",
          borderBottom: "1px solid var(--line)",
          marginBottom: 18,
          paddingBottom: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("returns")}
          style={{
            border: "none",
            background: "transparent",
            padding: "0 0 12px",
            fontWeight: 800,
            fontSize: 16,
            color: activeTab === "returns" ? "var(--green-700)" : "var(--text2)",
            borderBottom:
              activeTab === "returns"
                ? "4px solid var(--green-700)"
                : "4px solid transparent",
            cursor: "pointer",
          }}
        >
          ↩ Returns ({returnsRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("wastage")}
          style={{
            border: "none",
            background: "transparent",
            padding: "0 0 12px",
            fontWeight: 800,
            fontSize: 16,
            color: activeTab === "wastage" ? "var(--green-700)" : "var(--text2)",
            borderBottom:
              activeTab === "wastage"
                ? "4px solid var(--green-700)"
                : "4px solid transparent",
            cursor: "pointer",
          }}
        >
          🗑 Wastage Records ({wastageRows.length})
        </button>
      </div>

      <div
        className="fb"
        style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}
      >
        <div className="search-field" style={{ minWidth: 320 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder={
              activeTab === "returns"
                ? "Search return notes..."
                : "Search wastage records..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {activeTab === "returns" ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/returns/add")}
          >
            <Plus size={16} /> New Return
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/wastage/add")}
          >
            <Plus size={16} /> Record Wastage
          </button>
        )}
      </div>

      {activeTab === "returns" ? (
        <div className="content-card">
          <div className="card-header-row">
            <h3>Return Notes</h3>
            <span className="count-pill">{filteredReturns.length} returns</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>RETURN NO</th>
                  <th>DATE</th>
                  <th>PO NUMBER</th>
                  <th>SUPPLIER</th>
                  <th>ITEMS</th>
                  <th>TOTAL QTY</th>
                  <th>AMOUNT</th>
                  <th>EMAIL</th>
                </tr>
              </thead>
              <tbody>
                {loadingReturns ? (
                  <tr>
                    <td colSpan="8" className="empty-row">Loading return notes...</td>
                  </tr>
                ) : filteredReturns.length ? (
                  filteredReturns.map((row) => (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/returns/${row.id}`)}
                    >
                      <td className="code-cell">{row.return_number}</td>
                      <td>{formatDate(row.return_date)}</td>
                      <td>{row.po_number || "—"}</td>
                      <td className="strong-cell">{row.supplier_name}</td>
                      <td>{Number(row.item_count || 0)}</td>
                      <td>{Number(row.total_qty || 0).toFixed(2)}</td>
                      <td>{money(row.total_amount)}</td>
                      <td>
                        {row.email_sent_at ? (
                          <span className="badge bg-b">Sent</span>
                        ) : (
                          <span className="badge">Draft</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-row">No return notes found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="content-card">
          <div className="card-header-row">
            <h3>Wastage Records</h3>
            <span className="count-pill">{filteredWastage.length} records</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>RECORD NO</th>
                  <th>REASON</th>
                  <th>QTY</th>
                  <th>LKR LOSS</th>
                  <th>PHOTOS</th>
                  <th>RECORDED BY</th>
                </tr>
              </thead>
              <tbody>
                {loadingWastage ? (
                  <tr>
                    <td colSpan="7" className="empty-row">Loading wastage records...</td>
                  </tr>
                ) : filteredWastage.length ? (
                  filteredWastage.map((row) => (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/wastage/${row.id}`)}
                    >
                      <td>{formatDate(row.wastage_date)}</td>
                      <td className="code-cell">{row.wastage_number}</td>
                      <td className="strong-cell">{row.reason || "—"}</td>
                      <td>{Number(row.total_qty || 0).toFixed(2)}</td>
                      <td style={{ color: "#d4572f", fontWeight: 800 }}>
                        -{money(row.total_amount)}
                      </td>
                      <td>📸 {Number(row.photo_count || 0)}</td>
                      <td>{row.reported_by_name || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-row">No wastage records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}