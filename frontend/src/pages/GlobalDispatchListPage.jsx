import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const seedRows = [
  {
    id: 1,
    dispatch_number: "SHP-2024-042",
    customer_name: "Four Seasons Kuda Huraa",
    dispatch_date: "2024-03-16",
    airline: "UL225",
    awb: "603-12345678",
    total_qty: "124 kg",
    docs_done_count: 4,
    status: "Docs Pending",
  },
  {
    id: 2,
    dispatch_number: "SHP-2024-041",
    customer_name: "Hilton Maldives Amingiri",
    dispatch_date: "2024-03-14",
    airline: "UL225",
    awb: "603-12340099",
    total_qty: "96 kg",
    docs_done_count: 7,
    status: "Cleared",
  },
  {
    id: 3,
    dispatch_number: "SHP-2024-040",
    customer_name: "Waldorf Astoria",
    dispatch_date: "2024-03-12",
    airline: "Q2 MLE",
    awb: "Q2-00045612",
    total_qty: "80 kg",
    docs_done_count: 7,
    status: "Delivered",
  },
];

const GlobalDispatchListPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRows = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dispatch/global");
        const apiRows = Array.isArray(res.data) ? res.data : [];
        setRows(apiRows.length ? apiRows : seedRows);
      } catch (err) {
        console.error("Failed to load global dispatches", err);
        setRows(seedRows);
      } finally {
        setLoading(false);
      }
    };

    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    let result = rows;

    if (tab === "Docs Pending") {
      result = result.filter((row) => String(row.status).toLowerCase().includes("pending"));
    } else if (tab === "Cleared") {
      result = result.filter((row) => String(row.status).toLowerCase() === "cleared");
    } else if (tab === "Delivered") {
      result = result.filter((row) => String(row.status).toLowerCase() === "delivered");
    }

    const q = search.toLowerCase();
    if (!q) return result;

    return result.filter((row) =>
      [
        row.dispatch_number,
        row.customer_name,
        row.airline,
        row.status,
        row.awb,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search, tab]);

  const docsPendingCount = rows.filter((row) =>
    String(row.status).toLowerCase().includes("pending")
  ).length;

  const badgeClass = (status) => {
    const s = String(status).toLowerCase();
    if (s === "cleared" || s === "delivered") return "badge bg-g";
    if (s.includes("pending")) return "badge bg-a";
    return "badge bg-b";
  };

  return (
    <div className="pg">
      <div className="pg-h">
        <div>
          <h1>Global Dispatch</h1>
          <p>Export shipments · Maldives & international</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/dispatch/global/add" className="btn btn-p">
            + New Shipment
          </Link>
          <button type="button" className="icon-btn" aria-label="Notifications">
            !
          </button>
        </div>
      </div>

      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Stock deducted only when shipment is <strong>Cleared</strong> (all 7 documents verified) —
          not when created.
        </div>
      </div>

      <div className="fb">
        <button type="button" className={`ft ${tab === "All" ? "on" : ""}`} onClick={() => setTab("All")}>
          All
        </button>
        <button type="button" className={`ft ${tab === "Docs Pending" ? "on" : ""}`} onClick={() => setTab("Docs Pending")}>
          Docs Pending ({docsPendingCount})
        </button>
        <button type="button" className={`ft ${tab === "Cleared" ? "on" : ""}`} onClick={() => setTab("Cleared")}>
          Cleared
        </button>
        <button type="button" className={`ft ${tab === "Delivered" ? "on" : ""}`} onClick={() => setTab("Delivered")}>
          Delivered
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="tbl-tools">
          <input
            className="fc"
            placeholder="Search by dispatch no, customer, airline or status"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Shipment No.</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Flight</th>
              <th>AWB</th>
              <th>Weight</th>
              <th>Docs</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9">Loading...</td>
              </tr>
            ) : filteredRows.length ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                    {row.dispatch_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.customer_name}</td>
                  <td>{row.dispatch_date?.slice(0, 10)}</td>
                  <td><span className="badge bg-a">{row.airline}</span></td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.awb || "—"}</td>
                  <td>{row.total_qty}</td>
                  <td>
                    <span className={row.docs_done_count === 7 ? "badge bg-g" : "badge bg-a"}>
                      {row.docs_done_count}/7
                    </span>
                  </td>
                  <td>
                    <span className={badgeClass(row.status)}>{row.status}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="ab">👁</button>
                      <button type="button" className="ab">📄</button>
                      {row.docs_done_count !== 7 ? (
                        <button type="button" className="btn btn-p btn-xs">
                          Upload Docs
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No global dispatch records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalDispatchListPage;