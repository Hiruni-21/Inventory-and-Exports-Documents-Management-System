import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const statusClassMap = {
  draft: "bg-x",
  pending: "bg-a",
  awaiting: "bg-a",
  approved: "bg-g",
  sent: "bg-b",
  closed: "bg-p",
  received: "bg-p",
};

const getBadgeClass = (status) => {
  const value = String(status || "pending").toLowerCase();
  const key = Object.keys(statusClassMap).find((entry) => value.includes(entry));
  return statusClassMap[key] || "bg-a";
};

const getStatusLabel = (status) => {
  const value = String(status || "pending").toLowerCase();

  if (value.includes("await") || value.includes("pending")) return "Awaiting Approval";
  if (value.includes("approved")) return "Approved";
  if (value.includes("sent")) return "Sent";
  if (value.includes("closed") || value.includes("received")) return "Closed";
  if (value.includes("draft")) return "Draft";

  return status || "Pending";
};

const fmtDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-CA");
};

const PurchaseOrderListPage = () => {
  const navigate = useNavigate();

  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get("/purchase-orders");
        setPurchaseOrders(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load purchase orders");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, []);

  const counts = useMemo(() => {
    return purchaseOrders.reduce(
      (acc, po) => {
        const value = String(po.status || "pending").toLowerCase();

        acc.all += 1;

        if (value.includes("await") || value.includes("pending")) acc.awaiting += 1;
        if (value.includes("approved")) acc.approved += 1;
        if (value.includes("sent")) acc.sent += 1;
        if (value.includes("closed") || value.includes("received")) acc.closed += 1;

        return acc;
      },
      {
        all: 0,
        awaiting: 0,
        approved: 0,
        sent: 0,
        closed: 0,
      }
    );
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = search.trim().toLowerCase();
      const status = String(po.status || "").toLowerCase();

      const matchesSearch =
        !q ||
        String(po.po_number || "").toLowerCase().includes(q) ||
        String(po.supplier_name || "").toLowerCase().includes(q) ||
        String(po.created_by_name || "").toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "awaiting" && (status.includes("await") || status.includes("pending"))) ||
        (filter === "approved" && status.includes("approved")) ||
        (filter === "sent" && status.includes("sent")) ||
        (filter === "closed" && (status.includes("closed") || status.includes("received")));

      return matchesSearch && matchesFilter;
    });
  }, [filter, purchaseOrders, search]);

  return (
    <div>
      <div className="fb">
        <button
          type="button"
          className={`ft ${filter === "all" ? "on" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          className={`ft ${filter === "awaiting" ? "on" : ""}`}
          onClick={() => setFilter("awaiting")}
        >
          Awaiting Approval ({counts.awaiting})
        </button>

        <button
          type="button"
          className={`ft ${filter === "approved" ? "on" : ""}`}
          onClick={() => setFilter("approved")}
        >
          Approved ({counts.approved})
        </button>

        <button
          type="button"
          className={`ft ${filter === "sent" ? "on" : ""}`}
          onClick={() => setFilter("sent")}
        >
          Sent ({counts.sent})
        </button>

        <button
          type="button"
          className={`ft ${filter === "closed" ? "on" : ""}`}
          onClick={() => setFilter("closed")}
        >
          Closed ({counts.closed})
        </button>

        <div className="sw po-search-box">
          <input
            className="si"
            placeholder="Search purchase orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="ib ib-i">
          <span>Loading</span>
          <div>Loading purchase orders...</div>
        </div>
      ) : null}

      {error ? (
        <div className="ib ib-d">
          <span>Warning</span>
          <div>{error}</div>
        </div>
      ) : null}

      <div className="tw po-list-card">
        <div className="tw-h">
          <h3>Purchase Orders</h3>
          <span className="po-scroll-note">Scroll left/right to see all columns</span>
        </div>

        <div className="po-table-scroll">
          <table className="po-list-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date Placed</th>
                <th>Required By</th>
                <th>Status</th>
                <th>Created By</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((po) => (
                  <tr
                    key={po.id}
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                    className="po-click-row"
                  >
                    <td className="po-number-cell">{po.po_number || "—"}</td>

                    <td className="po-supplier-cell">{po.supplier_name || "—"}</td>

                    <td>{fmtDate(po.order_date || po.created_at)}</td>

                    <td>{fmtDate(po.expected_delivery_date)}</td>

                    <td>
                      <span className={`badge ${getBadgeClass(po.status)}`}>
                        {getStatusLabel(po.status)}
                      </span>
                    </td>

                    <td>{po.created_by_name || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="po-empty-cell">
                    No purchase orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderListPage;