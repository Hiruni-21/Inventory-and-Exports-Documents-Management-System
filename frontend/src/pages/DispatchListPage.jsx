import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const DispatchListPage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await api.get("/dispatch");
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch {
        setError("Failed to load dispatch records");
      }
    };

    fetchRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;

    return records.filter((row) =>
      [row.dispatch_number, row.client_name, row.created_by_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [records, search]);

  return (
    <div>
      <div className="ib ib-s">
        <span>📦</span>
        <div>
          Stock is deducted from the selected FEFO batch when dispatch is created. Returns can be
          recorded separately through the Returns page.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search dispatch records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Link to="/dispatch/local/add" className="btn btn-p btn-sm">
          + Create Dispatch
        </Link>
      </div>

      {error ? (
        <div className="ib ib-d">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="tw">
        <div className="tw-h">
          <h3>Local Dispatch Records</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>Dispatch No.</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Created By</th>
              <th>Created At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--g800)" }}>
                    {row.dispatch_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.client_name}</td>
                  <td>{fmtDate(row.dispatch_date)}</td>
                  <td>{row.created_by_name || "—"}</td>
                  <td>{fmtDateTime(row.created_at)}</td>
                  <td>
                    <span className="badge bg-g">Created</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link to={`/dispatch/${row.id}`} className="ab" title="View dispatch">
                        👁
                      </Link>
                      <Link to={`/dispatch/print/${row.id}`} className="ab" title="Print">
                        🖨️
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "var(--text3)" }}>
                  No dispatch records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DispatchListPage;