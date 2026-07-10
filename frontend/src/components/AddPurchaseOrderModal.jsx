import { useEffect, useMemo, useState } from "react";
import api from "../utils/api";

const emptyLine = {
  item_id: "",
  quantity: "",
  unit: "",
  price: "",
};

const AddPurchaseOrderModal = ({ onClose, onSuccess }) => {
  const today = new Date().toISOString().split("T")[0];

  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [poNumber] = useState(
    `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`
  );
  const [paymentTerms, setPaymentTerms] = useState("Immediate cash");
  const [priority, setPriority] = useState("Normal");
  const [instructions, setInstructions] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState([{ ...emptyLine }]);

  const [form, setForm] = useState({
    supplier_id: "",
    required_by: "",
    remarks: "",
  });

  const [step, setStep] = useState(1);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      setError("");
      try {
        const [suppliersRes, itemsRes] = await Promise.all([
          api.get("/suppliers"),
          api.get("/items"),
        ]);

        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load suppliers or items");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  const itemLookup = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[String(item.id)] = item;
    });
    return map;
  }, [items]);

  const enrichedLines = useMemo(() => {
    return lines.map((line) => {
      const item = itemLookup[String(line.item_id)];
      const qty = Number(line.quantity || 0);
      const price = Number(line.price || 0);

      return {
        ...line,
        unit: line.unit || item?.unit || "",
        item_name: item?.item_name || item?.name || "",
        item_code: item?.item_code || item?.code || "",
        amount: qty * price,
      };
    });
  }, [lines, itemLookup]);

  const validLines = useMemo(() => {
    return enrichedLines.filter((line) => line.item_id && Number(line.quantity) > 0);
  }, [enrichedLines]);

  const subtotal = useMemo(() => {
    return enrichedLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  }, [enrichedLines]);

  const handleFormChange = async (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "supplier_id") {
      setLines([{ ...emptyLine }]);
      setError("");

      if (!value) {
        setItems([]);
        return;
      }

      try {
        const res = await api.get(`/purchase-orders/supplier/${value}/items`);
        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setItems([]);
        setError(err.response?.data?.message || "Failed to load supplier items");
      }
    }
  };
  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      if (field === "item_id") {
        const item = itemLookup[String(value)];

        current.unit = item?.unit || "";
        current.price =
          item?.unit_price ||
          item?.unit_cost ||
          item?.purchase_price ||
          item?.cost_price ||
          item?.buying_price ||
          item?.price ||
          "";
      }

      next[index] = current;
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ...emptyLine }]);
  };

  const removeLine = (index) => {
    setLines((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const nextStep = () => {
    if (!form.supplier_id || !form.required_by) {
      setError("Supplier and required-by date are required");
      return;
    }

    if (form.required_by < today) {
      setError("Required-by date cannot be in the past");
      return;
    }

    if (step === 2) {
      if (validLines.length === 0) {
        setError("Add at least one line item");
        return;
      }
    }

    setError("");
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setError("");
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (mode = "submit") => {
    setError("");
    setSuccess("");

    const cleanItems = enrichedLines
      .filter((line) => line.item_id && Number(line.quantity) > 0)
      .map((line) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity),
        unit_price: Number(line.price || 0),
      }));

    if (!form.supplier_id || !form.required_by || cleanItems.length === 0) {
      setError("Supplier, required-by date, and at least one line item are required");
      return;
    }

    setSaving(true);

    try {
      await api.post("/purchase-orders", {
        supplier_id: Number(form.supplier_id),
        required_by: form.required_by,
        status: mode === "draft" ? "draft" : "pending_approval",
        priority: priority.toLowerCase(),
        remarks: [
          form.remarks,
          instructions,
          internalNotes,
          `Payment Terms: ${paymentTerms}`,
          `Priority: ${priority}`,
          mode === "draft" ? "Saved as Draft" : "Submitted for Approval",
        ]
          .filter(Boolean)
          .join("\n"),
        items: cleanItems,
      });

      setSuccess(
        mode === "draft"
          ? "Purchase order draft saved successfully"
          : "Purchase order submitted successfully"
      );
      setTimeout(() => {
        onSuccess();
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="md md-xl" onClick={(e) => e.stopPropagation()} style={{ width: "95%", maxWidth: 1000 }}>
        <div className="md-h">
          <h3>📋 Create Purchase Order</h3>
          <button type="button" className="md-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="md-b" style={{ maxHeight: "calc(85vh - 120px)", overflowY: "auto" }}>
          <div className="steps">
            <div className={`sn ${step > 1 ? "done" : step === 1 ? "act" : ""}`}>
              <div className="sn-n">1</div>
              <div className="sn-l">Details</div>
            </div>
            <div className="s-line" />
            <div className={`sn ${step > 2 ? "done" : step === 2 ? "act" : ""}`}>
              <div className="sn-n">2</div>
              <div className="sn-l">Items</div>
            </div>
            <div className="s-line" />
            <div className={`sn ${step === 3 ? "act" : ""}`}>
              <div className="sn-n">3</div>
              <div className="sn-l">Review</div>
            </div>
          </div>

          {loadingData ? (
            <div className="ib ib-i">
              <span>⏳</span>
              <div>Loading suppliers and items...</div>
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

          {step === 1 && (
            <>
              <div className="fr3">
                <div className="ff">
                  <label className="fl">PO #</label>
                  <input className="fc" value={poNumber} readOnly />
                </div>

                <div className="ff">
                  <label className="fl">
                    Supplier <span className="rq">*</span>
                  </label>
                  <select
                    className="fc"
                    name="supplier_id"
                    value={form.supplier_id}
                    onChange={handleFormChange}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">
                    Required By <span className="rq">*</span>
                  </label>
                  <input
                    className="fc"
                    type="date"
                    name="required_by"
                    min={today}
                    value={form.required_by}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Payment Terms</label>
                  <select
                    className="fc"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option>Immediate cash</option>
                    <option>7 days</option>
                    <option>14 days</option>
                    <option>30 days</option>
                  </select>
                </div>

                <div className="ff">
                  <label className="fl">Priority</label>
                  <div className="tg">
                    <button
                      type="button"
                      className={`to ${priority === "Normal" ? "on" : ""}`}
                      onClick={() => setPriority("Normal")}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      className={`to ${priority === "Urgent" ? "on-a" : ""}`}
                      onClick={() => setPriority("Urgent")}
                    >
                      ⚡ Urgent
                    </button>
                  </div>
                </div>
              </div>

              <div className="ff">
                <label className="fl">Remarks</label>
                <textarea
                  className="fc"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleFormChange}
                  placeholder="General remarks..."
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="fs2">
                <div className="fst">Line Items</div>

                <div style={{ overflowX: "auto" }}>
                  <table className="it">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Price (LKR)</th>
                        <th>Amount</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrichedLines.map((line, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            <select
                              value={line.item_id}
                              onChange={(e) => handleLineChange(index, "item_id", e.target.value)}
                            >
                              <option value="">Select item</option>
                              {items.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {(item.item_name || item.name) ?? "Unnamed Item"}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.quantity}
                              onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              value={line.unit || ""}
                              onChange={(e) => handleLineChange(index, "unit", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.price}
                              onChange={(e) => handleLineChange(index, "price", e.target.value)}
                            />
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            LKR {Number(line.amount || 0).toLocaleString()}
                          </td>
                          <td>
                            <button type="button" className="ab d" onClick={() => removeLine(index)}>
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" className="add-r" onClick={addLine}>
                  + Add Line Item
                </button>

                <div
                  style={{
                    marginTop: 16,
                    border: "1px solid var(--g300)",
                    background: "var(--g100)",
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <div className="sum-r">
                    <span>Subtotal</span>
                    <span>LKR {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="sum-r">
                    <span>Total</span>
                    <span>LKR {subtotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="fr">
                <div className="ff">
                  <label className="fl">Instructions to Supplier</label>
                  <textarea
                    className="fc"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Quality, delivery notes..."
                  />
                </div>

                <div className="ff">
                  <label className="fl">Internal Notes</label>
                  <textarea
                    className="fc"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="For your team only..."
                  />
                </div>
              </div>

              <div className="ib ib-i">
                <span>ℹ️</span>
                <div>Requires manager approval before being sent to supplier.</div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="cc">
                <h3>Purchase Order Review</h3>
                <p>Check all details before saving or submitting.</p>

                <div className="fr">
                  <div>
                    <div className="sum-r">
                      <span>PO Number</span>
                      <span>{poNumber}</span>
                    </div>
                    <div className="sum-r">
                      <span>Supplier</span>
                      <span>
                        {suppliers.find((s) => String(s.id) === String(form.supplier_id))
                          ?.supplier_name || "—"}
                      </span>
                    </div>
                    <div className="sum-r">
                      <span>Required By</span>
                      <span>{form.required_by || "—"}</span>
                    </div>
                    <div className="sum-r">
                      <span>Priority</span>
                      <span>{priority}</span>
                    </div>
                  </div>
                  <div>
                    <div className="sum-r">
                      <span>Payment Terms</span>
                      <span>{paymentTerms}</span>
                    </div>
                    <div className="sum-r">
                      <span>Line Items</span>
                      <span>{validLines.length}</span>
                    </div>
                    <div className="sum-r">
                      <span>Total</span>
                      <span>LKR {subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tw">
                <div className="tw-h">
                  <h3>Line Summary</h3>
                </div>
                <table className="it">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Code</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validLines.map((line, idx) => (
                      <tr key={idx}>
                        <td>{line.item_name}</td>
                        <td>{line.item_code}</td>
                        <td>{line.quantity}</td>
                        <td>{line.unit}</td>
                        <td>LKR {Number(line.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="md-f">
          {step > 1 ? (
            <button type="button" className="btn btn-s" onClick={prevStep}>
              Back
            </button>
          ) : (
            <button type="button" className="btn btn-s" onClick={onClose}>
              Cancel
            </button>
          )}

          {step < 3 ? (
            <button type="button" className="btn btn-p" onClick={nextStep}>
              Continue →
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-s"
                disabled={saving}
                onClick={() => handleSubmit("draft")}
              >
                💾 Save Draft
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={saving}
                onClick={() => handleSubmit("submit")}
              >
                {saving ? "Saving..." : "Submit for Approval →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPurchaseOrderModal;
