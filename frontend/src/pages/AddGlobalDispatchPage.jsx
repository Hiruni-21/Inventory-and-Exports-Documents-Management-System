import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "fw_global_dispatches";

const customerOptions = [
  "Four Seasons — Kuda Huraa, Maldives",
  "Hilton Maldives — Amingiri",
  "Waldorf Astoria — Ithaafushi",
  "Conrad Maldives — Rangali",
];

const airlineOptions = [
  "SriLankan Airlines (UL)",
  "Manta Air",
  "Qatar Airways",
  "Emirates",
];

const itemOptions = [
  { id: 1, name: "Dragon Fruit (Red)", batch: "BT-089", defaultQty: 20, defaultBoxes: 4 },
  { id: 2, name: "Papaya", batch: "BT-102", defaultQty: 25, defaultBoxes: 5 },
  { id: 3, name: "Snake Gourd", batch: "BT-111", defaultQty: 18, defaultBoxes: 3 },
];

const emptyItem = {
  item_name: "",
  batch_code: "",
  quantity: "",
  boxes: "",
};

const AddGlobalDispatchPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer: customerOptions[0],
    shipment_date: "",
    airline: airlineOptions[0],
    flight_no: "",
    awb_no: "",
    incoterms: "CIF",
    total_weight: "",
    docs: {
      commercial_invoice: true,
      packing_list: true,
      phytosanitary_certificate: false,
      airway_bill: false,
      certificate_of_origin: false,
    },
  });

  const [items, setItems] = useState([
    {
      item_name: "Dragon Fruit (Red)",
      batch_code: "BT-089",
      quantity: 20,
      boxes: 4,
    },
  ]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "item_name") {
      const selected = itemOptions.find((item) => item.name === value);
      if (selected) {
        updated[index].batch_code = selected.batch;
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const saved = localStorage.getItem(STORAGE_KEY);
    const existing = saved ? JSON.parse(saved) : [];

    const shipmentNo = `SHP-${new Date().getFullYear()}-${String(existing.length + 43).padStart(3, "0")}`;

    const newRow = {
      id: Date.now(),
      shipment_no: shipmentNo,
      customer: form.customer,
      shipment_date: form.shipment_date || new Date().toISOString().slice(0, 10),
      flight_no: form.flight_no || "UL225",
      awb_no: form.awb_no || "603-XXXXXXX",
      total_weight: Number(form.total_weight || 0),
      docs_count: `${docsCompleted}/5`,
      status: docsCompleted === 5 ? "Cleared" : "Docs Pending",
      airline: form.airline,
      incoterms: form.incoterms,
      items,
      docs: form.docs,
    };

    const updated = [newRow, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    navigate("/dispatch/global");
  };

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
              Stock deducted when all export documents are verified and shipment is cleared.
            </div>
          </div>

          <div className="fs2">
            <div className="fst">Shipment Header</div>

            <div className="fr">
              <div className="ff">
                <label className="fl">Customer *</label>
                <select className="fc" name="customer" value={form.customer} onChange={handleFormChange}>
                  {customerOptions.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
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
                <label className="fl">Airline</label>
                <select className="fc" name="airline" value={form.airline} onChange={handleFormChange}>
                  {airlineOptions.map((airline) => (
                    <option key={airline} value={airline}>
                      {airline}
                    </option>
                  ))}
                </select>
              </div>

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
                <select className="fc" name="incoterms" value={form.incoterms} onChange={handleFormChange}>
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
            </div>
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
                        value={row.item_name}
                        onChange={(e) => handleItemChange(index, "item_name", e.target.value)}
                      >
                        <option value="">Select item</option>
                        {itemOptions.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={row.batch_code}
                        onChange={(e) => handleItemChange(index, "batch_code", e.target.value)}
                        placeholder="BT-089"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={row.boxes}
                        onChange={(e) => handleItemChange(index, "boxes", e.target.value)}
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
            </div>
          </div>
        </div>

        <div className="md-f">
          <button type="button" className="btn btn-s" onClick={() => navigate("/dispatch/global")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-a">
            Create Shipment + Generate Docs
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddGlobalDispatchPage;