export const normalizeRole = (role) => String(role || "").toLowerCase().trim();

export const getPostLoginRedirectPath = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole.includes("supplier")) {
    return "/supplier/dashboard";
  }

  if (normalizedRole.includes("admin")) {
    return "/admin/dashboard";
  }

  return "/dashboard";
};

export const getDashboardKey = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole.includes("admin")) {
    return "admin";
  }

  if (normalizedRole.includes("operation")) {
    return "operations";
  }

  if (normalizedRole.includes("logistics")) {
    return "logistics";
  }

  if (normalizedRole.includes("supervisor")) {
    return "supervisor";
  }

  if (normalizedRole.includes("supplier")) {
    return "supplier";
  }

  return "manager";
};
