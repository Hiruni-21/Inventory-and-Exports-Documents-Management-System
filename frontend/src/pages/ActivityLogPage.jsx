import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import api from "../utils/api";
import { useToast } from "../context/ToastContext";

const ActivityLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [moduleFilter, setModuleFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const toast = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (moduleFilter) params.append("module", moduleFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("page", page);
      params.append("limit", limit);

      const res = await api.get(`/activity?${params.toString()}`);
      setLogs(res.data.data);
      setTotalPages(Math.ceil(res.data.pagination.total / limit));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, startDate, endDate, page]);

  const modules = [
    "Purchase Orders",
    "Suppliers",
    "Items",
    "Goods Receiving",
    "Returns",
    "Dispatch",
    "Export Documents",
    "Stock Adjustments"
  ];

  return (
    <div className="pg">
      <div className="pg-hdr">
        <div>
          <h1 className="pg-title">Activity Log</h1>
          <p className="pg-subtitle">Immutable audit trail of user actions</p>
        </div>
      </div>

      <div className="tbl-filters" style={{ marginBottom: 20 }}>
        <select 
          className="fc" 
          style={{ maxWidth: 200 }}
          value={moduleFilter} 
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        
        <input 
          type="date" 
          className="fc" 
          style={{ maxWidth: 150 }}
          value={startDate} 
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
        />
        <span style={{ alignSelf: 'center', color: 'var(--text3)' }}>to</span>
        <input 
          type="date" 
          className="fc" 
          style={{ maxWidth: 150 }}
          value={endDate} 
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
        />

        <button 
          className="btn btn-s" 
          onClick={() => {
            setModuleFilter("");
            setStartDate("");
            setEndDate("");
            setPage(1);
          }}
        >
          Clear Filters
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>No activity logs found.</div>
        ) : (
          <>
            <div className="tbl-container">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Module</th>
                    <th>Action</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{dayjs(log.created_at).format("YYYY-MM-DD HH:mm:ss")}</td>
                      <td style={{ fontWeight: 500 }}>{log.user_name}</td>
                      <td>
                        <span className="badge bg-s">{log.module}</span>
                      </td>
                      <td>{log.action}</td>
                      <td style={{ color: "var(--text2)", fontSize: 13 }}>
                        {log.reference_type ? `${log.reference_type} #${log.reference_id}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  Page {page} of {totalPages}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn btn-s btn-sm" 
                    disabled={page === 1} 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn btn-s btn-sm" 
                    disabled={page === totalPages} 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLogPage;
