import { useEffect, useState } from "react";
import api from "../utils/api";

const UserProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setProfile(res.data.user);
      setPhone(res.data.user.phone || "");
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError(err.response?.data?.message || "Unable to load profile");
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      await api.put("/users/profile", { phone });
      await loadProfile();
      setMessage("Phone number updated successfully");
    } catch (err) {
      console.error("Failed to update phone number:", err);
      setError(err.response?.data?.message || "Unable to update phone number");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("profilePhoto", file);

    try {
      const res = await api.post("/users/profile/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadProfile();
      setMessage(res.data.message || "Profile picture updated successfully");
    } catch (err) {
      console.error("Failed to upload profile picture:", err);
      setError(err.response?.data?.message || "Unable to update profile picture");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  if (!profile && !error) {
    return <div style={{ padding: 24 }}>Loading profile…</div>;
  }

  if (error && !profile) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fdecea", color: "#b42318", fontWeight: 600 }}>
          {error}
        </div>
      </div>
    );
  }

  const initials = (profile.full_name || "FW")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const photoSrc = profile.profile_photo ? `http://localhost:5001${profile.profile_photo}` : "";

  return (
    <div style={{ display: "grid", gap: 20, padding: 8 }}>
      {message ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#e8f7ed", color: "#1d6f3a", fontWeight: 600 }}>
          {message}
        </div>
      ) : null}

      {error ? (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "#fdecea", color: "#b42318", fontWeight: 600 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "minmax(260px, 320px) 1fr", alignItems: "start" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
          <label htmlFor="profile-photo-input" style={{ display: "block", cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt="Profile"
                  style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: "4px solid #e2e8f0" }}
                />
              ) : (
                <div style={{ width: 140, height: 140, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", fontSize: 44, fontWeight: 700, color: "#475569" }}>
                  {initials}
                </div>
              )}
            </div>
            <div style={{ textAlign: "center", color: "#2563eb", fontWeight: 700 }}>
              {isUploading ? "Uploading…" : "Change profile picture"}
            </div>
          </label>
          <input id="profile-photo-input" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <h3 style={{ margin: "0 0 6px", color: "#111827" }}>{profile.full_name || "User"}</h3>
            <p style={{ margin: 0, color: "#6b7280" }}>{profile.email || "No email provided"}</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Profile Details</h3>
          <p style={{ marginTop: 0, color: "#6b7280" }}>Update your contact details and profile image.</p>

          <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ color: "#6b7280" }}>Full Name</span>
              <strong style={{ color: "#111827" }}>{profile.full_name || "—"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ color: "#6b7280" }}>Email</span>
              <strong style={{ color: "#111827" }}>{profile.email || "—"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ color: "#6b7280" }}>Role</span>
              <strong style={{ color: "#111827" }}>{profile.role || "—"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #e5e7eb" }}>
              <span style={{ color: "#6b7280" }}>Department</span>
              <strong style={{ color: "#111827" }}>{profile.department || "Not set"}</strong>
            </div>
          </div>

          <form onSubmit={handlePhoneSubmit} style={{ marginTop: 24 }}>
            <label htmlFor="phone" style={{ display: "block", marginBottom: 8, fontWeight: 600, color: "#111827" }}>
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #d1d5db", marginBottom: 12 }}
            />
            <button type="submit" disabled={isSaving} style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              {isSaving ? "Saving…" : "Save Phone"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
