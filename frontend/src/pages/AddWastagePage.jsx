import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

const today = () => new Date().toISOString().slice(0, 10);

export default function AddWastagePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [itemsMaster, setItemsMaster] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    wastage_date: today(),
    reason: "Spoilage",
    remarks: "",
    reported_by_name:
      user?.full_name || user?.name || user?.username || "Manager User",
  });

  const [lines, setLines] = useState([
    {
      item_id: "",
      item_name: "",
      unit: "",
      quantity: 0,
      batch_number: "",
      unit_cost: 0,
      notes: "",
    },
  ]);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const res = await api.get("/items");
        const rows = Array.isArray(res.data) ? res.data : [];
        setItemsMaster(
          rows.map((item) => ({
            id: Number(item.id || 0),
            name: item.name || "",
            code: item.code || "",
            unit: item.unit || "",
            unit_cost: Number(item.unit_cost || 0),
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to load items");
      }
    };

    loadItems();
  }, [toast]);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (field === "item_id") {
        const selected = itemsMaster.find((item) => String(item.id) === String(value));
        current.item_id = value;
        current.item_name = selected?.name || "";
        current.unit = selected?.unit || "";
        current.unit_cost = Number(selected?.unit_cost || 0);
      } else {
        current[field] =
          field === "quantity" || field === "unit_cost" ? Number(value || 0) : value;
      }

      next[index] = current;
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        item_id: "",
        item_name: "",
        unit: "",
        quantity: 0,
        batch_number: "",
        unit_cost: 0,
        notes: "",
      },
    ]);
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePhotoSelect = (e) => {
    const incoming = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...incoming].slice(0, 10));
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanLines = lines
      .map((line) => ({
        item_id: Number(line.item_id || 0),
        unit: line.unit,
        quantity: Number(line.quantity || 0),
        batch_number: line.batch_number,
        unit_cost: Number(line.unit_cost || 0),
        notes: line.notes || "",
      }))
      .filter((line) => line.item_id && line.quantity > 0);

    if (!form.wastage_date || !form.reason || !cleanLines.length) {
      toast.error("Wastage date, reason, and items are required");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("wastage_date", form.wastage_date);
      formData.append("reason", form.reason);
      formData.append("remarks", form.remarks);
      formData.append("reported_by_name", form.reported_by_name);
      formData.append("items", JSON.stringify(cleanLines));

      photos.forEach((file) => formData.append("photos", file));

      const res = await api.post("/wastage", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(res.data?.message || "Wastage recorded successfully");
      navigate(`/wastage/${res.data?.wastageId}`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to record wastage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grn-modal-page">
      <div className="modal-shell modal-xl grn-prototype-modal">
        <div className="modal-header">
          <h2>Record Wastage</h2>
          <button type="button" className="modal-close" onClick={() => navigate("/wastage")}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="customer-modal-form">
          <div className="customer-modal-scroll">
            <div className="form-grid three-col">
              <div className="form-group">
                <label>WASTAGE DATE *</label>
                <input type="date" name="wastage_date" value={form.wastage_date} onChange={handleHeaderChange} />
              </div>
              <div className="form-group">
                <label>REASON *</label>
                <select name="reason" value={form.reason} onChange={handleHeaderChange}>
                  <option value="Spoilage">Spoilage</option>
                  <option value="Expiry">Expiry</option>
                  <option value="Handling damage">Handling damage</option>
                  <option value="Rejected quality">Rejected quality</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>REPORTED BY</label>
                <input type="text" name="reported_by_name" value={form.reported_by_name} onChange={handleHeaderChange} />
              </div>
            </div>

            <div className="customer-section-title">Wastage Items</div>

            <table className="grn-prototype-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>QTY</th>
                  <th>UNIT</th>
                  <th>BATCH NO.</th>
                  <th>UNIT COST</th>
                  <th>LINE TOTAL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={line.item_id}
                        onChange={(e) => handleLineChange(index, "item_id", e.target.value)}
                      >
                        <option value="">Select item</option>
                        {itemsMaster.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.code ? `(${item.code})` : ""}
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
                      <input type="text" value={line.unit} readOnly />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={line.batch_number}
                        onChange={(e) => handleLineChange(index, "batch_number", e.target.value)}
                        placeholder="BT-2026-001"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_cost}
                        onChange={(e) => handleLineChange(index, "unit_cost", e.target.value)}
                      />
                    </td>
                    <td className="strong-cell">
                      {(
                        Number(line.quantity || 0) * Number(line.unit_cost || 0)
                      ).toLocaleString("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        minimumFractionDigits: 0,
                      })}
                    </td>
                    <td>
                      <button type="button" className="table-icon-btn" onClick={() => removeLine(index)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={addLine}>
                <Plus size={16} /> Add Line Item
              </button>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>REMARKS</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleHeaderChange}
                rows="4"
                placeholder="Wastage reason details, handling notes, observations..."
              />
            </div>

            <div className="phu" onClick={() => fileInputRef.current?.click()}>
              <div className="phu-i">
                <Camera size={28} strokeWidth={1.8} />
              </div>
              <p>Upload wastage photos</p>
              <span>Click to add · up to 10 photos · Saved with the wastage record</span>

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
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/wastage")}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving..." : "Save Wastage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}