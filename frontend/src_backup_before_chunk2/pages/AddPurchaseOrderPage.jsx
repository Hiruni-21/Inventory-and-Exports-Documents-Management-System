import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const todayDate = () => new Date().toISOString().split("T")[0];

const AddPurchaseOrderPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    supplier_id: "",
    expected_delivery_date: todayDate(),
    remarks: "",
  });

  const [selectedItems, setSelectedItems] = useState([
    { item_id: "", quantity: "", unit: "", item_name: "", item_code: "" },
  ]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        const [suppliersRes, itemsRes] = await Promise.all([
          api.get("/suppliers", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          api.get("/items", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      } catch (err) {
        setError("Failed to load suppliers or items");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const generatedPoLabel = useMemo(() => {
    return `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  }, []);

  const handleFormChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...selectedItems];
    updated[index][field] = value;

    if (field === "item_id") {
      const selected = items.find((item) => String(item.id) === String(value));
      updated[index].unit = selected?.unit || "";
      updated[index].item_name = selected?.item_name || "";
      updated[index].item_code = selected?.item_code || "";
    }

    setSelectedItems(updated);
  };

  const addItemRow = () => {
    setSelectedItems((prev) => [
      ...prev,
      { item_id: "", quantity: "", unit: "", item_name: "", item_code: "" },
    ]);
  };

  const removeItemRow = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const validateBeforeSubmit = () => {
    if (!form.supplier_id) {
      setError("Please select a supplier");
      return false;
    }

    if (selectedItems.length === 0) {
      setError("Please add at least one line item");
      return false;
    }

    for (const row of selectedItems) {
      if (!row.item_id || !row.quantity) {
        setError("Please complete all line item fields");
        return false;
      }

      if (Number(row.quantity) <= 0) {
        setError("Quantity must be greater than 0");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateBeforeSubmit()) {
      return;
    }

    try {
      await api.post(
        "/purchase-orders",
        {
          supplier_id: form.supplier_id,
          expected_delivery_date: form.expected_delivery_date || null,
          remarks: form.remarks,
          items: selectedItems.map((row) => ({
            item_id: row.item_id,
            quantity: row.quantity,