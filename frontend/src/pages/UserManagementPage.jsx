import { useState, useEffect } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(10,40,24,.48)",
  backdropFilter: "blur(3px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  zIndex: 500,
};

const modalCardStyle = {
  width: "100%",
  maxWidth: "540px",
  maxHeight: "92vh",
  background: "var(--white)",
  borderRadius: "16px",
  boxShadow: "0 16px 48px rgba(10,40,24,.22),0 4px 12px rgba(10,40,24,.1)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const modalHeaderStyle = {
  padding: "20px 24px 16px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const modalBodyStyle = {
  padding: "20px 24px",
  overflowY: "auto",
  flex: 1,
};

const modalFooterStyle = {
  padding: "14px 24px",
  borderTop: "1px solid var(--border)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
};

const formGroupStyle = {
  marginBottom: "16px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "13px",
  color: "var(--text2)",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1.5px solid var(--border)",
  fontSize: "14px",
  fontFamily: "inherit",
};

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Add User state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "ops",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Edit User state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    role: "",
    status: "",
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const handleOpenAddUser = () => {
      setShowAddModal(true);
    };
    window.addEventListener("fw-open-add-user-modal", handleOpenAddUser);

    return () => {
      window.removeEventListener("fw-open-add-user-modal", handleOpenAddUser);
    };
  }, []);

  const handleAddChange = (e) => {
    setAddUserForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const res = await api.post("/users", addUserForm);
      setMessage(res.data.message || "User created successfully");
      setShowAddModal(false);
      setAddUserForm({
        full_name: "",
        email: "",
        password: "",
        role: "ops",
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditChange = (e) => {
    setEditUserForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const openEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditUserForm({
      role: userToEdit.role,
      status: userToEdit.status,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const res = await api.put(`/users/${editingUser.id}`, editUserForm);
      setMessage(res.data.message || "User updated successfully");
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (userToToggle) => {
    setError("");
    setMessage("");

    if (Number(userToToggle.id) === Number(currentUser?.id)) {
      setError("You cannot deactivate your own admin account");
      return;
    }

    const newStatus = userToToggle.status === "active" ? "inactive" : "active";

    try {
      const res = await api.put(`/users/${userToToggle.id}`, {
        role: userToToggle.role,
        status: newStatus,
      });
      setMessage(res.data.message || `User status updated to ${newStatus}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    setError("");
    setMessage("");

    if (Number(userToDelete.id) === Number(currentUser?.id)) {
      setError("You cannot delete your own admin account");
      return;
    }

    if (!window.confirm(`Are you sure you want to soft delete ${userToDelete.full_name}?`)) {
      return;
    }

    try {
      const res = await api.delete(`/users/${userToDelete.id}`);
      setMessage(res.data.message || "User soft-deleted successfully");
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <div style={{ padding: "8px" }}>
      {message && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "10px", background: "#e8f7ed", color: "#1d6f3a", fontWeight: 600 }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "10px", background: "#fdecea", color: "#b42318", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="tw">
        <div className="tw-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>User Management</h3>
            <span className="badge bg-b">{users.length} Users Total</span>
          </div>
          <button className="btn btn-p" onClick={() => setShowAddModal(true)}>
            + Add User
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>FULL NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>CREATED AT</th>
              <th style={{ textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading users list...</td>
              </tr>
            ) : users.length ? (
              users.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 700 }}>{row.full_name}</td>
                  <td>{row.email}</td>
                  <td>
                    <span style={{ textTransform: "capitalize" }}>{row.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${row.status === "active" ? "bg-g" : "bg-r"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px" }}>
                      <button className="btn btn-s btn-xs" onClick={() => openEditModal(row)}>
                        Edit
                      </button>
                      <button
                        className={`btn btn-xs ${row.status === "active" ? "btn-d" : "btn-p"}`}
                        onClick={() => handleToggleStatus(row)}
                        disabled={Number(row.id) === Number(currentUser?.id)}
                        title={Number(row.id) === Number(currentUser?.id) ? "Cannot deactivate yourself" : ""}
                      >
                        {row.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn btn-d btn-xs"
                        onClick={() => handleDeleteUser(row)}
                        disabled={Number(row.id) === Number(currentUser?.id)}
                        title={Number(row.id) === Number(currentUser?.id) ? "Cannot delete yourself" : ""}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <form onSubmit={handleAddSubmit}>
              <div style={modalHeaderStyle}>
                <h3 style={{ margin: 0 }}>Add New User</h3>
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => setShowAddModal(false)}
                  style={{ border: 0, padding: "4px 8px" }}
                >
                  ✕
                </button>
              </div>
              <div style={modalBodyStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="full_name">Full Name</label>
                  <input
                    style={inputStyle}
                    id="full_name"
                    name="full_name"
                    value={addUserForm.full_name}
                    onChange={handleAddChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="email">Email Address</label>
                  <input
                    style={inputStyle}
                    id="email"
                    type="email"
                    name="email"
                    value={addUserForm.email}
                    onChange={handleAddChange}
                    placeholder="name@freshworld.lk"
                    required
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="password">Password</label>
                  <input
                    style={inputStyle}
                    id="password"
                    type="password"
                    name="password"
                    value={addUserForm.password}
                    onChange={handleAddChange}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="role">Role</label>
                  <select
                    style={inputStyle}
                    id="role"
                    name="role"
                    value={addUserForm.role}
                    onChange={handleAddChange}
                    required
                  >
                    <option value="manager">Manager / Admin</option>
                    <option value="ops">Operations Executive</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="logistics">Logistics Executive</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

              </div>
              <div style={modalFooterStyle}>
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <form onSubmit={handleEditSubmit}>
              <div style={modalHeaderStyle}>
                <h3 style={{ margin: 0 }}>Edit User: {editingUser.full_name}</h3>
                <button
                  type="button"
                  className="btn btn-s btn-xs"
                  onClick={() => setShowEditModal(false)}
                  style={{ border: 0, padding: "4px 8px" }}
                >
                  ✕
                </button>
              </div>
              <div style={modalBodyStyle}>
                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="edit-role">Role</label>
                  <select
                    style={inputStyle}
                    id="edit-role"
                    name="role"
                    value={editUserForm.role}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="manager">Manager / Admin</option>
                    <option value="ops">Operations Executive</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="logistics">Logistics Executive</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

                <div style={formGroupStyle}>
                  <label style={labelStyle} htmlFor="edit-status">Status</label>
                  <select
                    style={inputStyle}
                    id="edit-status"
                    name="status"
                    value={editUserForm.status}
                    onChange={handleEditChange}
                    required
                    disabled={Number(editingUser.id) === Number(currentUser?.id)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={modalFooterStyle}>
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-p" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
