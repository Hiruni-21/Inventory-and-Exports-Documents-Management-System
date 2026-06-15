import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-CA");
};

const badgeClass = (status) => {
  const value = String(status || "pending").toLowerCase();
  if (value.includes("approved")) return "bg-g";
  if (value.includes("sent")) return "bg-b";
  if (value.includes("closed") || value.includes("received")) return "bg-p";
  return "bg-a";
};

const PurchaseOrderDetailsPage = () => {
  const { id } = useParams();
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get(`/purchase-orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPurchaseOrder(res.data);
      } catch {
        setError("Failed to load purchase order details");
      }
    };

    fetchPurchaseOrder();
  }, [id]);

  const totalQty = useMemo(() => {
    return (purchaseOrder?.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [purchaseOrder]);

  if (error) return <div className="ib ib-d"><span>⚠️</span><div>{error}</div></div>;
  if (!purchaseOrder) return <div className="tw"><div className="tw-h"><h3>Loading purchase order...</h3></div></div>;

  return (
    <div>
      <div className="cg cg-3" style={{ marginBottom: 16 }}>
        <div className="kc">
          <div className="kic g">📄</div>
          <div className="kv">{purchaseOrder.po_number}</div>
          <div className="kl">PO Number</div>
        </div>
        <div className="kc">
          <div className="kic a">📦</div>
          <div className="kv">{purchaseOrder.items?.length || 0}</div>
          <div className="kl">Line Items</div>
        </div>
        <div className="kc">
          <div className="kic b">⚖️</div>
          <div className="kv">{totalQty}</div>
          <div className="kl">Total Ordered Qty</div>
        </div>
      </div>

      <div className="tw" style={{ marginBottom: 16 }}>
        <div className="tw-h">
          <h3>Purchase Order Details</h3>
          <span className={`badge ${badgeClass(purchaseOrder.status)}`}>{purchaseOrder.status || "Pending"}</span>
        </div>
        <div className="md-b" style={{ padding: 20 }}>
          <div className="fg fg-2">
            <div>
              <div className="fst">Supplier</div>
              <p><strong>{purchaseOrder.supplier_name}</strong></p>
              <p>{purchaseOrder.contact_number || "—"}</p>
              <p>{purchaseOrder.email || "—"}</p>
            </div>
            <div>
              <div className="fst">Order Info</div>
              <p><strong>Date Placed:</strong> {fmtDate(purchaseOrder.created_at)}</p>
              <p><strong>Required By:</strong> {fmtDate(purchaseOrder.expected_delivery_date)}</p>
              <p><strong>Created By:</strong> {purchaseOrder.created_by_name || "—"}</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="fst">Remarks</div>
            <div className="ib ib-i" style={{ marginBottom: 0 }}>
              <span>📝</span>
              <div>{purchaseOrder.remarks || "No remarks added for this purchase order."}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tw">
        <div className="tw-h">
          <h3>PO Items</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrder.items?.length ? (
              purchaseOrder.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>{item.item_code}</td>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td>{item.unit}</td>
                  <td>{Number(item.quantity || 0).toFixed(2)}</td>
                  <td>LKR {Number(item.unit_price || 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>
                    LKR {Number(item.line_total || Number(item.quantity || 0) * Number(item.unit_price || 0)).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text3)" }}>No items found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrderDetailsPage;
