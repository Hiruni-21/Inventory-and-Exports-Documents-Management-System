import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";

const emptyLine = {
  item_id: "",
  batch_id: "",
  quantity: "",
  packaging: "",
};

const emptyDocs = {
  delivery_note: true,
  local_invoice: false,
  goods_dispatch_note: false,
};

const AddDispatchPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [inventory, setInventory] = useState([]);
  const [batchOptions, setBatchOptions] = useState({});
  const [form, setForm] = useState({
    client_name: "",
    dispatch_date: "",
    driver: "",
    vehicle_no: "",
    delivery_window: "",
    remarks: "",
    docs: emptyDocs,
  });
  const [items, setItems] = useState([{ ...emptyLine }]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const customer = searchParams.get("customer");
    if (customer) {
      setForm((prev) => ({ ...prev, client_name: customer }));
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/inventory");

        const availableItems = (Array.isArray(res.data) ? res.data : []).filter(
          (item) =>
            Number(
              item.total_available_quantity ??
                item.qty_available ??
                item.total_available ??
                0
            ) > 0
        );

        setInventory(availableItems);
      } catch {
        setError("Failed to load inventory");
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const inventoryLookup = useMemo(() => {
    const map = {};
    inventory.forEach((item) => {
      map[String(item.item_id)] = item;
    });
    return map;
  }, [inventory]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocToggle = (name) => {
    setForm((prev) => ({
      ...prev,
      docs: {
        ...prev.docs,
        [name]: !prev.docs[name],
      },
    }));
  };

  const handleItemChange = async (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "item_id") {
      updated[index].batch_id = "";
      setBatchOptions((prev) => ({ ...prev, [index]: [] }));
    }

    setItems(updated);

    if (field === "item_id" && value) {
      try {
        const res = await api.get(`/inventory/batches/${value}`);
        setBatchOptions((prev) => ({
          ...prev,
          [index]: Array.isArray(res.data) ? res.data : [],
        }));
      } catch {
        setError("Failed to load item batches");
      }
    }
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { ...emptyLine }]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const totalWeight = useMemo(() => {
    return items.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanItems = items
      .map((row) => ({
        item_id: Number(row.item_id),
        batch_id: Number(row.batch_id),
        quantity: Number(row.quantity || 0),
      }))
      .filter((row) => row.item_id && row.batch_id && row.quantity > 0);

    if (!form.client_name || !form.dispatch_date || cleanItems.length === 0) {
      setError("Customer, dispatch date, and at least one item row are required");
      return;
    }

    setSaving(true);

    try {
      await api.post("/dispatch", {
        client_name: form.client_name,
        dispatch_date: form.dispatch_date,
        remarks: [
          form.remarks,
          form.driver ? `Driver: ${form.driver}` : "",
          form.vehicle_no ? `Vehicle: ${form.vehicle_no}` : "",
          form.delivery_window ? `Window: ${form.delivery_window}` : "",
          `Docs: DN=${form.docs.delivery_note ? "Y" : "N"}, INV=${form.docs.local_invoice ? "Y" : "N"}, GDN=${form.docs.goods_dispatch_note ? "Y" : "N"}`
        ].filter(Boolean).join(" | "),
        items: cleanItems,
      });

      setSuccess("Dispatch created successfully");
      setTimeout(() => navigate("/dispatch/local"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create dispatch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="md md-xl" style={{ maxWidth: "100%", display: "flex" }}>
      <div className="md-h">
        <h3>🚚 New Local Dispatch</h3>
        <button type="button" className="md-x" onClick={() => navigate("/dispatch/local")}>
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="md-b">
          <div className="ib ib-s">
            <span>📍</span>
            <div>
              Stock deducted when marked Delivered. FEFO batch applied. Delivery Note
              auto-generated. Returns possible.
            </div>
          </div>

          {loading ? (
            <div className="ib ib-i">
              <span>⏳</span>
              <div>Loading available inventory...</div>
            </div>
          ) : null}

          {error ? (
            <div className="ib ib-d">
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          ) : null}

          {success ? (
            <div className="ib ib-s">
              <span>✅</span>
              <div>{success}</div>
            </div>
          ) : null}

          <div className="fr">
            <div className="ff">
              <label className="fl">Customer *</label>
              <input
                className="fc"
                name="client_name"
                value={form.client_name}
                onChange={handleFormChange}
                placeholder="Colombo Hilton — Colombo 2"
              />
            </div>

            <div className="ff">
              <label className="fl">Dispatch Date *</label>
              <input
                className="fc"
                type="date"
                name="dispatch_date"
                value={form.dispatch_date}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="fr3">
            <div className="ff">
              <label className="fl">Driver</label>
              <input
                className="fc"
                name="driver"
                value={form.driver}
                onChange={handleFormChange}
                placeholder="e.g. Nuwan"
              />
            </div>

            <div className="ff">
              <label className="fl">Vehicle No.</label>
              <input
                className="fc"
                name="vehicle_no"
                value={form.vehicle_no}
                onChange={handleFormChange}
                placeholder="WP CAS-XXXX"
              />
            </div>

            <div className="ff">
              <label className="fl">Delivery Window</label>
              <input
                className="fc"
                name="delivery_window"
                value={form.delivery_window}
                onChange={handleFormChange}
                placeholder="05:00 – 07:00 AM"
              />
            </div>
          </div>

          <div className="fs2">
            <div className="fst">Items — FEFO Auto-Selected</div>

            <table className="it">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>BATCH (FEFO)</th>
                  <th>QTY</th>
                  <th>PACKAGING</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, index) => {
                  const itemInfo = inventoryLookup[String(row.item_id)];

                  return (
                    <tr key={index}>
                      <td>
                        <select
                          value={row.item_id}
                          onChange={(e) => handleItemChange(index, "item_id", e.target.value)}
                        >
                          <option value="">Select item</option>
                          {inventory.map((item) => (
                            <option key={item.item_id} value={item.item_id}>
                              {item.item_name || item.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <select
                          value={row.batch_id}
                          onChange={(e) => handleItemChange(index, "batch_id", e.target.value)}
                        >
                          <option value="">Select batch</option>
                          {(batchOptions[index] || []).map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {(batch.batch_code || batch.batch_number)} ({batch.available_quantity || batch.qty_remaining || 0}
                              {batch.unit ? ` ${batch.unit}` : ""})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                        />
                      </td>

                      <td>
                        <input
                          value={row.packaging}
                          onChange={(e) => handleItemChange(index, "packaging", e.target.value)}
                          placeholder="Cardboard Box"
                        />
                      </td>

                      <td>
                        <button type="button" className="ab d" onClick={() => removeItemRow(index)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button type="button" className="add-r" onClick={addItemRow}>
              + Add Item
            </button>
          </div>

          <div className="fs2">
            <div className="fst">Documents To Generate</div>

            <div style={{ display: "grid", gap: 10 }}>
              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.delivery_note}
                  onChange={() => handleDocToggle("delivery_note")}
                />
                <span>Delivery Note (DN)</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.local_invoice}
                  onChange={() => handleDocToggle("local_invoice")}
                />
                <span>Local Invoice</span>
              </label>

              <label className="ck">
                <input
                  type="checkbox"
                  checked={form.docs.goods_dispatch_note}
                  onChange={() => handleDocToggle("goods_dispatch_note")}
                />
                <span>Goods Dispatch Note</span>
              </label>
            </div>
          </div>

          <div className="ff">
            <label className="fl">Remarks</label>
            <textarea
              className="fc"
              name="remarks"
              value={form.remarks}
              onChange={handleFormChange}
              placeholder="Delivery notes..."
            />
          </div>
        </div>

        <div className="md-f">
          <button type="button" className="btn btn-s" onClick={() => navigate("/dispatch/local")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-p" disabled={saving}>
            {saving ? "Saving..." : "Create Dispatch + Print DN"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDispatchPage;