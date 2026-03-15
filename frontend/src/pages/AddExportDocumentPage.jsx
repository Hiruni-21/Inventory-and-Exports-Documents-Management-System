import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AddExportDocumentPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [dispatches, setDispatches] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([]);

  const [form, setForm] = useState({
    dispatch_id: "",
    document_type: "COMMERCIAL_INVOICE",
    document_date: "",
    consignee_name: "",
    destination_country: "",
    port_of_loading: "",
    port_of_discharge: "",
    remarks: "",
  });

  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      const res = await api.get("/export-documents/dispatch-list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDispatches(res.data);
    } catch {
      setError("Failed to load dispatch list");
    }
  };

  const fetchDispatchItems = async (dispatchId) => {
    try {
      const res = await api.get(`/export-documents/dispatch-items/${dispatchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDispatchItems(res.data);

      const mappedItems = res.data.map((item) => ({
        item_id: item.item_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        unit_price: "",
      }));

      setItems(mappedItems);
    } catch {
      setError("Failed to load dispatch items");
    }
  };

  const handleFormChange = async (e) => {
    const { name, value } = e.target;

    setForm({ ...form, [name]: value });

    if (name === "dispatch_id" && value) {
      await fetchDispatchItems(value);
    }
  };

  const handlePriceChange = (index, value) => {
    const updated = [...items];
    updated[index].unit_price = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post(
        "/export-documents",
        {
          ...form,
          items,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess("Export document created successfully");

      setTimeout(() => {
        navigate("/export-documents");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create export document");
    }
  };

  return (
    <div className="form-page">
      <h2>Create Export Document</h2>

      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <form className="custom-form" onSubmit={handleSubmit}>
        <select
          name="dispatch_id"
          value={form.dispatch_id}
          onChange={handleFormChange}
          required
        >
          <option value="">Select Dispatch</option>
          {dispatches.map((d) => (
            <option key={d.id} value={d.id}>
              {d.dispatch_number} - {d.client_name}
            </option>
          ))}
        </select>

        <select
          name="document_type"
          value={form.document_type}
          onChange={handleFormChange}
          required
        >
          <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
          <option value="PACKING_LIST">Packing List</option>
          <option value="EXPORT_DECLARATION">Export Declaration</option>
        </select>

        <input
          type="date"
          name="document_date"
          value={form.document_date}
          onChange={handleFormChange}
          required
        />

        <input
          type="text"
          name="consignee_name"
          placeholder="Consignee Name"
          value={form.consignee_name}
          onChange={handleFormChange}
          required
        />

        <input
          type="text"
          name="destination_country"
          placeholder="Destination Country"
          value={form.destination_country}
          onChange={handleFormChange}
        />

        <input
          type="text"
          name="port_of_loading"
          placeholder="Port of Loading"
          value={form.port_of_loading}
          onChange={handleFormChange}
        />

        <input
          type="text"
          name="port_of_discharge"
          placeholder="Port of Discharge"
          value={form.port_of_discharge}
          onChange={handleFormChange}
        />

        <textarea
          name="remarks"
          placeholder="Remarks"
          rows="4"
          value={form.remarks}
          onChange={handleFormChange}
        />

        <h3>Export Items</h3>

        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Batch</th>
                <th>Unit</th>
                <th>Quantity</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {dispatchItems.length > 0 ? (
                dispatchItems.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_code}</td>
                    <td>{item.item_name}</td>
                    <td>{item.batch_code}</td>
                    <td>{item.unit}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={items[index]?.unit_price || ""}
                        onChange={(e) => handlePriceChange(index, e.target.value)}
                        placeholder="Unit Price"
                        required
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">Select a dispatch to load items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button type="submit">Save Export Document</button>
      </form>
    </div>
  );
};

export default AddExportDocumentPage;