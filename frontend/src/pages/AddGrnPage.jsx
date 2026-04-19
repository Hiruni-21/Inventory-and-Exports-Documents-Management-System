import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  purchase_order_id: "",
  supplier_invoice_no: "",
  po_order_date: "",
  received_date: today(),
  received_by_name: "",
  remarks: "",
};

const varianceMeta = (orderedQty, receivedQty) => {
  const ordered = Number(orderedQty || 0);
  const received = Number(receivedQty || 0);
  const varianceQty = received - ordered;
  const variancePercent = ordered > 0 ? (Math.abs(varianceQty) / ordered) * 100 : received > 0 ? 100 : 0;
  const needsVerification = Math.abs(varianceQty) > 1 || variancePercent > 5;
  return { varianceQty, variancePercent, needsVerification };
};

export default function AddGrnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    ...emptyForm,
    received_by_name:
      user?.full_name ||
      user?.name ||
      user?.username ||
      "Supervisor",
  });

  useEffect(() => {
    const loadPOs = async () => {
      try {
        setLoadingOrders(true);
        const res = await api.get("/purchase-orders");
        const rows = Array.isArray(res.data) ? res.data : [];
        setPurchaseOrders(rows);

        const preselected = searchParams.get("po");
        if (preselected) {
          setForm((prev) => ({ ...prev, purchase_order_id: String(preselected) }));
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load purchase orders");
      } finally {
        setLoadingOrders(false);
      }
    };

    loadPOs();
  }, [searchParams, toast]);

  useEffect(() => {
    if (!form.purchase_order_id) {
      setItems([]);
      setSupplierId("");
      setForm((prev) => ({ ...prev, po_order_date: "" }));
      return;
    }

    const loadPoItems = async () => {
      try {
        setLoadingItems(true);
        const res = await api.get(`/grn/po-items/${form.purchase_order_id}`);
        const rows = Array.isArray(res.data) ? res.data : [];

        const selectedPo = purchaseOrders.find(
          (po) => String(po.id) === String(form.purchase_order_id)
        );

        setItems(
          rows.map((row, index) => ({
            purchase_order_item_id: row.purchase_order_item_id || null,
            item_id: Number(row.item_id || 0),
            item_name: row.item_name || "Unnamed item",
            item_code: row.item_code || "—",
            unit: row.unit || "",
            ordered_quantity: Number(row.ordered_quantity || 0),
            received_qty: Number(row.ordered_quantity || 0),
            batch_number: `BT-${new Date().getFullYear()}-${String(index + 1).padStart(3, "0")}`,
            expiry_date: "",
            quality_grade: "Grade A",
            unit_cost: Number(row.unit_price || 0),
            notes: "",
          }))
        );

        setSupplierId(rows?.[0]?.supplier_id || "");
        setForm((prev) => ({
          ...prev,
          po_order_date:
            rows?.[0]?.po_order_date?.slice?.(0, 10) ||
            selectedPo?.order_date?.slice?.(0, 10) ||
            "",
        }));
      } catch (err) {
        console.error(err);
        toast.error(err?.response?.data?.message || "Failed to load PO items");
      } finally {
        setLoadingItems(false);
      }
    };

    loadPoItems();
  }, [form.purchase_order_id, purchaseOrders, toast]);

  const hasVariance = useMemo(
    () => items.some((item) => varianceMeta(item.ordered_quantity, item.received_qty).needsVerification),
    [items]
  );

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    if (name === "purchase_order_id") {
      setItems([]);
      setSupplierId("");
      setPhotos([]);
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]:
          field === "received_qty" || field === "unit_cost"
            ? Number(value || 0)
            : value,
      };
      return next;
    });
  };

  const handlePhotoSelect = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const merged = [...photos, ...incoming].slice(0, 10);
    setPhotos(merged);

    if (incoming.length + photos.length > 10) {
      toast.error("Maximum 10 photos allowed");
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.purchase_order_id || !supplierId || !form.received_date) {
      toast.error("Linked PO, supplier, and received date are required");
      return;
    }

    const cleanItems = items
      .map((item) => ({
        purchase_order_item_id: item.purchase_order_item_id,
        item_id: Number(item.item_id),
        ordered_quantity: Number(item.ordered_quantity || 0),
        received_qty: Number(item.received_qty || 0),
        batch_number: item.batch_number,
        expiry_date: item.expiry_date || null,
        quality_grade: item.quality_grade || "Grade A",
        unit_cost: Number(item.unit_cost || 0),
        notes: item.notes || "",
      }))
      .filter((item) => item.item_id && item.received_qty > 0);

    if (!cleanItems.length) {
      toast.error("At least one received item is required");
      return;
    }

    if (hasVariance && photos.length === 0) {
      toast.error("Photo evidence is required when variance exists");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("purchase_order_id", String(form.purchase_order_id));
      formData.append("supplier_id", String(supplierId));
      formData.append("supplier_invoice_no", form.supplier_invoice_no);
      formData.append("received_date", form.received_date);
      formData.append("received_by_name", form.received_by_name);
      formData.append("remarks", form.remarks);
      formData.append("items", JSON.stringify(cleanItems));

      photos.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await api.post("/grn", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data?.message || "GRN created successfully");
      navigate(`/grn/${res.data?.grnId}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create GRN");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grn-modal-page">
      <div className="modal-shell modal-xl grn-prototype-modal">
        <div className="modal-header">
          <h2>📥 New Goods Received Note</h2>
          <button type="button" className="modal-close" onClick={() => navigate("/grn")}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="customer-modal-form">
          <div className="customer-modal-scroll">
            <div className="form-grid two-col">
              <div className="form-group">
                <label>LINKED PO <span className="rq">*</span></label>
                <select
                  name="purchase_order_id"
                  value={form.purchase_order_id}
                  onChange={handleHeaderChange}
                >
                  <option value="">Select linked PO</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} — {po.supplier_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>SUPPLIER INVOICE NO.</label>
                <input
                  type="text"
                  name="supplier_invoice_no"
                  value={form.supplier_invoice_no}
                  onChange={handleHeaderChange}
                  placeholder="INV-XXXXX"
                />
              </div>
            </div>

            <div className="form-grid three-col">
              <div className="form-group">
                <label>PO / ORDER DATE</label>
                <input type="date" value={form.po_order_date} readOnly />
              </div>

              <div className="form-group">
                <label>RECEIVED DATE <span className="rq">*</span></label>
                <input
                  type="date"
                  name="received_date"
                  value={form.received_date}
                  onChange={handleHeaderChange}
                />
              </div>

              <div className="form-group">
                <label>RECEIVED BY</label>
                <input
                  type="text"
                  name="received_by_name"
                  value={form.received_by_name}
                  onChange={handleHeaderChange}
                />
              </div>
            </div>

            <div className="customer-section-title">Items Received</div>

            <table className="it grn-prototype-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>ORDERED</th>
                  <th>RECEIVED</th>
                  <th>BATCH NO.</th>
                  <th>EXPIRY</th>
                  <th>QUALITY</th>
                  <th>VARIANCE</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders || loadingItems ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      Loading PO items...
                    </td>
                  </tr>
                ) : items.length ? (
                  items.map((item, index) => {
                    const variance = varianceMeta(item.ordered_quantity, item.received_qty);
                    const unitLabel = item.unit ? ` ${item.unit}` : "";

                    return (
                      <tr key={`${item.item_id}-${index}`}>
                        <td>{item.item_name}</td>
                        <td>{Number(item.ordered_quantity || 0).toFixed(2)}{unitLabel}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.received_qty}
                            onChange={(e) => handleItemChange(index, "received_qty", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.batch_number}
                            onChange={(e) => handleItemChange(index, "batch_number", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={item.expiry_date}
                            onChange={(e) => handleItemChange(index, "expiry_date", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={item.quality_grade}
                            onChange={(e) => handleItemChange(index, "quality_grade", e.target.value)}
                          >
                            <option value="Grade A">Grade A</option>
                            <option value="Grade B">Grade B</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                        <td
                          className={
                            Number(variance.varianceQty || 0) === 0 ? "yes-text" : "no-text"
                          }
                          style={{ fontWeight: 700 }}
                        >
                          {variance.varianceQty > 0 ? "+" : ""}
                          {variance.varianceQty.toFixed(2)}{unitLabel}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      Select a linked PO first
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>REMARKS</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleHeaderChange}
                rows="4"
                placeholder="Quality observations, condition of goods..."
              />
            </div>

            <div className="phu" onClick={() => fileInputRef.current?.click()}>
              <div className="phu-i">
                <Camera size={28} strokeWidth={1.8} />
              </div>
              <p>Upload photos of received goods</p>
              <span>Click to add · up to 10 photos · Required when variance exists</span>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handlePhotoSelect}
              />
            </div>

            {photos.length > 0 ? (
              <div className="grn-photo-preview-grid">
                {photos.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="grn-photo-chip">
                    <span>{file.name}</span>
                    <button type="button" onClick={() => removePhoto(index)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="ib ib-i" style={{ marginTop: 14 }}>
              <span>ℹ️</span>
              <div>
                GRN must be verified by Operations Executive if variance exceeds 1 kg or 5%.
                Stock updates on verification.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/grn")}>
              Cancel
            </button>
            <button type="submit" className="btn btn-confirm-grn" disabled={saving}>
              {saving ? "Saving..." : "Confirm GRN & Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}