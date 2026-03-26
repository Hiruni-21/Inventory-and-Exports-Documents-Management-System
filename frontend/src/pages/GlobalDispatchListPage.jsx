import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "fw_global_dispatches";

const seedRows = [
  {
    id: 1,
    shipment_no: "SHP-2024-042",
    customer: "Four Seasons Kuda Huraa",
    shipment_date: "2024-03-16",
    flight_no: "UL225",
    awb_no: "603-12345678",
    total_weight: 52.5,
    docs_count: "3/5",
    status: "Docs Pending",
  },
  {
    id: 2,
    shipment_no: "SHP-2024-041",
    customer: "Hilton Maldives Amingiri",
    shipment_date: "2024-03-14",
    flight_no: "UL225",
    awb_no: "603-12340099",
    total_weight: 41.0,
    docs_count: "5/5",
    status: "Cleared",
  },
  {
    id: 3,
    shipment_no: "SHP-2024-040",
    customer: "Waldorf Astoria",
    shipment_date: "2024-03-12",
    flight_no: "Q2 MLE",
    awb_no: "Q2-00045612",
    total_weight: 34.0,
    docs_count: "5/5",
    status: "Delivered",
  },
];

const statusTabs = ["All", "Docs Pending", "Cleared", "Delivered"];

const GlobalDispatchListPage = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRows(JSON.parse(saved));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedRows));
      setRows(seedRows);
    }
  }, []);

  const filteredRows = useMemo(() => {
    let data = rows;

    if (activeTab !== "All") {
      data = data.filter((row) => row.status === activeTab);
    }

    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((row) =>
      [
        row.shipment_no,
        row.customer,
        row.flight_no,
        row.awb_no,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, search, activeTab]);

  const countByStatus = (status) => {
    if (status === "All") return rows.length;
    return rows.filter((row) => row.status === status).length;
  };

  return (
    <div>
      <div className="ib ib-w">
        <span>✈️</span>
        <div>
          Stock deducted only when shipment is cleared after export documents are verified.
        </div>
      </div>

      <div className="fb" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`btn btn-sm ${activeTab === tab ? "btn-p" : "btn-s"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} ({countByStatus(tab)})
            </button>
          ))}
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search export shipments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Link to="/dispatch/global/add" className="btn btn-p btn-sm">
          + New Shipment
        </Link>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Global Dispatch — Export Shipments</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Shipment No.</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Flight</th>
              <th>AWB</th>
              <th>Total Weight</th>
              <th>Docs</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 800, color: "var(--g800)" }}>{row.shipment_no}</td>
                  <td style={{ fontWeight: 700 }}>{row.customer}</td>
                  <td>{row.shipment_date}</td>
                  <td>
                    <span className="badge bg-a">{row.flight_no}</span>
                  </td>
                  <td>{row.awb_no}</td>
                  <td>{row.total_weight} kg</td>
                  <td>{row.docs_count}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === "Docs Pending"
                          ? "bg-x"
                          : row.status === "Cleared"
                          ? "bg-a"
                          : "bg-g"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No global dispatch records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GlobalDispatchListPage;