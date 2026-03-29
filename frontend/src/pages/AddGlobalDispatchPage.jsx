import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const emptyItem = {
  item_id: "",
  batch_id: "",
  quantity: "",
  boxes: "",
  available_batches: [],
};

const AddGlobalDispatchPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);

  const [form, setForm] = useState({
    customer_id: "",
    shipment_date: "",
    departure_date: "",
    airline: "",
    flight_no: "",
    awb_no: "",
    incoterms: "CIF",
    total_weight: "",
    cold_chain_required: false,
    remarks: "",
    docs: {
      commercial_invoice: false,
      packing_list: false,
      phytosanitary_certificate: false,
      airway_bill: false,
      certificate_of_origin: false,
      health_certificate: false,
      insurance_certificate: false,
    },
  });

  const [items, setItems] = useState([{ ...emptyItem }]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [customersRes, itemsRes] = await Promise.all([
        api.get("/customers?type=global"),
        api.get("/items"),
      ]);

      const customerRows = Array.isArray(customersRes.data) ? customersRes.data : [];
      const itemRows = Array.isArray(itemsRes.data) ? itemsRes.data : [];

      setCustomers(customerRows);
      setItemsMaster(itemRows);

      if (customerRows.length) {
        setForm((prev) => ({
          ...prev,
          customer_id: String(customerRows[0].id),
        }));
      }

      if (!customerRows.length) {
        alert("No global customers found. Please create a global customer first.");
      }
    } catch (error) {
      console.error("Failed to load global dispatch setup data", error);
      alert(error?.response?.data?.message || "Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDocChange = (name) => {
    setForm((prev) => ({
      ...prev,
      docs: {
        ...prev.docs,
        [name]: !prev.docs[name],
      },
    }));
  };

  const loadBatchesForItem = async (itemId) => {
    if (!itemId) return [];

    try {
      const res = await api.get(`/inventory/batches/${itemId}`);
      const rows = Array.isArray(res.data) ? res.data : [];

      const sorted = [...rows].sort((a, b) => {
        const aDate = a.expiry_date ? new Date(a.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.expiry_date ? new Date(b.expiry_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

      return sorted;
    } catch (error) {
      console.error(`Failed to load batches for item ${itemId}`, error);
      return [];
    }
  };

  const handleItemChange = async (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "item_id") {
      updated[index].batch_id = "";
      updated[index].quantity = "";
      updated[index].boxes = "";
      updated[index].available_batches = [];

      if (value) {
        const batches = await loadBatchesForItem(value);
        updated[index].available_batches = batches;

        if (batches.length > 0) {
          updated[index].batch_id = String(batches[0].id);
        }
      }
    }

    setItems(updated);
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const docsCompleted = useMemo(() => {
    return Object.values(form.docs).filter(Boolean).length;
  }, [form.docs]);

  const totalBoxes = useMemo(() => {
    return items.reduce((sum, row) => sum + Number(row.boxes || 0), 0);
  }, [items]);

  const selectedCustomer = useMemo(() => {
    return customers.find((customer) => String(customer.id) === String(form.customer_id));
  }, [customers, form.customer_id]);

  const validateForm = () => {
    if (!form.customer_id) {
      alert("Please select a customer");
      return false;
    }

    if (!form.shipment_date) {
      alert("Please select shipment date");
      return false;
    }

    if (!form.airline.trim()) {
      alert("Please enter airline");
      return false;
    }

    const validItems = items.filter(
      (item) => item.item_id && item.batch_id && Number(item.quantity) > 0
    );

    if (!validItems.length) {
      alert("Please add at least one valid item with item, batch and quantity");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = {
        customer_id: Number(form.customer_id),
        dispatch_date: form.shipment_date,
        departure_date: form.departure_date || null,
        airline: form.airline,
        incoterm: form.incoterms,
        cold_chain_required: form.cold_chain_required ? 1 : 0,
        remarks: [
          form.remarks?.trim() || "",
          form.flight_no ? `Flight: ${form.flight_no}` : "",
          form.awb_no ? `AWB: ${form.awb_no}` : "",
          form.total_weight ? `Total Weight: ${form.total_weight} kg` : "",
          totalBoxes ? `Total Boxes: ${totalBoxes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        items: items
          .filter((item) => item.item_id && item.batch_id && Number(item.quantity) > 0)
          .map((item) => ({
            item_id: Number(item.item_id),
            batch_id: Number(item.batch_id),
            qty: Number(item.quantity),
            unit: "kg",
            unit_price: 0,
            notes: item.boxes ? `Boxes: ${item.boxes}` : "",
          })),
      };

      const createRes = await api.post("/dispatch/global", payload);

      const globalDispatchId =
        createRes?.data?.globalDispatchId || createRes?.data?.id || null;

      if (globalDispatchId) {
        await api.put(`/export-docs/by-dispatch/${globalDispatchId}`, {          
          commercial_invoice_status: form.docs.commercial_invoice ? "done" : "pending",
          packing_list_status: form.docs.packing_list ? "done" : "pending",
          phytosanitary_certificate_status: form.docs.phytosanitary_certificate ? "done" : "pending",
          airway_bill_status: form.docs.airway_bill ? "done" : "pending",
          certificate_of_origin_status: form.docs.certificate_of_origin ? "done" : "pending",
          health_certificate_status: form.docs.health_certificate ? "done" : "pending",
          insurance_certificate_status: form.docs.insurance_certificate ? "done" : "pending",
          notes: form.remarks || "",
        });
      }

      navigate("/dispatch/global");
    } catch (error) {
      console.error("Failed to create global dispatch", error);
      alert(error?.response?.data?.message || "Failed to create global dispatch");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pg">
        <div className="card">
          <p>Loading global dispatch form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md md-xl" style={{ maxWidth: "100%", display: "flex" }}>
      <div className="md-h">
        <h3>✈️ New Global Dispatch (Export Shipment)</h3>
        <button type="button" className="md-x" onClick={() => navigate("/dispatch/global")}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="md-b">
          <div className="ib ib-w">
            <span>✈️</span>
            <div>
              Stock deducted when all 7 export documents are verified and shipment is cleared.
            </div>
          </div>

          <div className="fs2">
            <div className="fst">Shipment Header</div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Customer *</label>
                <select
                  className="fc"
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ff">
                <label className="fl">Shipment Date *</label>
                <input
                  className="fc"
                  type="date"
                  name="shipment_date"
                  value={form.shipment_date}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Airline *</label>
                <input
                  className="fc"
                  name="airline"
                  value={form.airline}
                  onChange={handleFormChange}
                  placeholder="Enter airline"
                />
              </div>

              <div className="ff">
                <label className="fl">Departure Date</label>
                <input
                  className="fc"
                  type="date"
                  name="departure_date"
                  value={form.departure_date}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Flight No.</label>
                <input
                  className="fc"
                  name="flight_no"
                  value={form.flight_no}
                  onChange={handleFormChange}
                  placeholder="e.g. UL225"
                />
              </div>

              <div className="ff">
                <label className="fl">AWB No.</label>
                <input
                  className="fc"
                  name="awb_no"
                  value={form.awb_no}
                  onChange={handleFormChange}
                  placeholder="603-XXXXXXX"
                />
              </div>
            </div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Incoterms</label>
                <select
                  className="fc"
                  name="incoterms"
                  value={form.incoterms}
                  onChange={handleFormChange}
                >
                  <option value="CIF">CIF</option>
                  <option value="DAP">DAP</option>
                  <option value="FOB">FOB</option>
                </select>
              </div>

              <div className="ff">
                <label className="fl">Total Weight (kg)</label>
                <input
                  className="fc"
                  type="number"
                  step="0.01"
                  name="total_weight"
                  value={form.total_weight}
                  onChange={handleFormChange}
                  placeholder="0.0"
                />
              </div>

              <div className="ff">
                <label className="fl">Cold Chain Required</label>
                <label className="ck" style={{ minHeight: 42, display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="cold_chain_required"
                    checked={form.cold_chain_required}
                    onChange={handleFormChange}
                  />
                  <span>Yes</span>
                </label>
              </div>
            </div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Remarks</label>
                <textarea
                  className="fc"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleFormChange}
                  placeholder="Additional shipment notes"
                  rows={3}
                />
              </div>
            </div>

            {selectedCustomer && (
              <div className="ib ib-i">
                <span>👤</span>
                <div>
                  Customer: <strong>{selectedCustomer.name}</strong>
                  {selectedCustomer.customer_code ? ` (${selectedCustomer.customer_code})` : ""}
                </div>
              </div>
            )}
          </div>

          <div className="fs2">
            <div className="fst">Items — FEFO Applied</div>

            <table className="it">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Batch</th>
                  <th>Qty (kg)</th>
                  <th>Boxes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={row.item_id}
                        onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
                      >
                        <option value="">Select item</option>
                        {itemsMaster.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <select
                        value={row.batch_id}
                        onChange={(e) => handleItemChange(index, "batch_id", e.target.value)}
                        disabled={!row.item_id}
                      >
                        <option value="">
                          {!row.item_id
                            ? "Select item first"
                            : row.available_batches.length
                            ? "Select batch"
                            : "No available batches"}
                        </option>
                        {row.available_batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_code}{" "}
                            {batch.expiry_date
                              ? `| Exp: ${String(batch.expiry_date).slice(0, 10)}`
                              : ""}
                            {batch.qty_on_hand !== undefined
                              ? ` | Stock: ${batch.qty_on_hand}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        placeholder="0.00"
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        value={row.boxes}
                        onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
                        placeholder="0"
                      />
                    </td>

                    <td>
                      <button type="button" className="ab d" onClick={() => removeItemRow(index)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button type="button" className="add-r" onClick={addItemRow}>
              + Add Item
            </button>
          </div>

          <div className="fs2">
            <div className="fst">Export Document Checklist</div>

            <div style={{ display: "grid", gap: 10 }}>
              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.commercial_invoice}
                  onChange={() => handleDocChange("commercial_invoice")}
                />
                <span>Commercial Invoice</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.packing_list}
                  onChange={() => handleDocChange("packing_list")}
                />
                <span>Packing List</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.phytosanitary_certificate}
                  onChange={() => handleDocChange("phytosanitary_certificate")}
                />
                <span>Phytosanitary Certificate</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.airway_bill}
                  onChange={() => handleDocChange("airway_bill")}
                />
                <span>Airway Bill (AWB)</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.certificate_of_origin}
                  onChange={() => handleDocChange("certificate_of_origin")}
                />
                <span>Certificate of Origin</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.health_certificate}
                  onChange={() => handleDocChange("health_certificate")}
                />
                <span>Health Certificate</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.insurance_certificate}
                  onChange={() => handleDocChange("insurance_certificate")}
                />
                <span>Insurance Certificate</span>
              </label>
            </div>

            <div className="ib ib-i" style={{ marginTop: 12 }}>
              <span>📄</span>
              <div>{docsCompleted}/7 documents marked as ready</div>
            </div>
          </div>
        </div>

        <div className="md-f">
          <button type="button" className="btn btn-s" onClick={() => navigate("/dispatch/global")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-a" disabled={saving}>
            {saving ? "Creating..." : "Create Shipment + Generate Docs"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddGlobalDispatchPage;