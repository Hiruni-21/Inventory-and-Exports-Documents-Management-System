import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

const ExportDocumentListPage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await api.get("/export-documents", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecords(res.data);
    } catch (err) {
      setError("Failed to load export documents");
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div>
      <div className="page-header-row">
        <h2>Export Documents</h2>
        <Link to="/export-documents/add" className="add-btn">
          + Create Export Document
        </Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Document Number</th>
              <th>Type</th>
              <th>Dispatch Number</th>
              <th>Client Name</th>
              <th>Document Date</th>
              <th>Consignee</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.document_number}</td>
                  <td>{r.document_type}</td>
                  <td>{r.dispatch_number}</td>
                  <td>{r.client_name}</td>
                  <td>{r.document_date}</td>
                  <td>{r.consignee_name}</td>
                  <td>
                    <Link to={`/export-documents/${r.id}`} className="view-link">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No export documents found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExportDocumentListPage;