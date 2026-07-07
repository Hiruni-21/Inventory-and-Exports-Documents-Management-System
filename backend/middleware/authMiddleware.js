const jwt = require("jsonwebtoken");

const normalizeRole = (role) => String(role || "").toLowerCase().trim();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const allowRoles = (...roles) => {
  const allowedRoles = new Set(roles.map(normalizeRole));

  return (req, res, next) => {
    const requestRole = normalizeRole(req.user?.role);
    const roleAliases = {
      ops: "operations",
      operation: "operations",
      operations: "operations",
    };
    const normalizedRequestRole = roleAliases[requestRole] || requestRole;

    if (!req.user || !allowedRoles.has(normalizedRequestRole)) {
      return res.status(403).json({ message: "Access denied for this role" });
    }
    next();
  };
};

module.exports = { verifyToken, allowRoles };