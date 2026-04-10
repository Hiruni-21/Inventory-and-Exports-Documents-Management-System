import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const StockMovementsPage = () => {
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await api.get("/inventory/movements");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load stock movements");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.item_code,
        row.item_name,
        row.movement_type,
        row.reference_type,
        row.reference_id,
        row.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <>
      <div className="ib ib-i">
        <span>📦</span>
        <div>
          Full stock movement trail for inventory corrections and batch deductions. This now reads
          from the real backend route used by the ERP.
        </div>
      </div>

      <div className="fb">
        <div className="sw">
          <input
            className="si"
            placeholder="Search stock movements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>Stock Movements</h3>
          <span className="badge bg-b">{filteredRows.length} rows</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ITEM CODE</th>
              <th>ITEM NAME</th>
              <th>TYPE</th>
              <th>REFERENCE</th>
              <th>REFERENCE ID</th>
              <th>QTY</th>
              <th>NOTES</th>
              <th>DATE</th>
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
                  <td>{row.id}</td>
                  <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{row.item_code}</td>
                  <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                  <td>
                    <span className={`badge ${String(row.movement_type).toUpperCase() === "IN" ? "bg-g" : "bg-r"}`}>
                      {String(row.movement_type).toUpperCase()}
                    </span>
                  </td>
                  <td>{row.reference_type}</td>
                  <td>{row.reference_id}</td>
                  <td>{Number(row.quantity || 0)}</td>
                  <td>{row.notes || "—"}</td>
                  <td>{fmtDateTime(row.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">No stock movements found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default StockMovementsPage;