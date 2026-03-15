const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const loginUser = (req, res) => {
  const { email, password } = req.body;

  console.log("=== LOGIN ATTEMPT ===");
  console.log("Email:", email);
  console.log("Typed password:", password);

  const sql = `
    SELECT users.id, users.name, users.email, users.password, roles.role_name
    FROM users
    JOIN roles ON users.role_id = roles.id
    WHERE users.email = ?
  `;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.log("DB ERROR:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    console.log("DB RESULTS:", results);

    if (results.length === 0) {
      console.log("No user found");
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = results[0];

    console.log("Stored hash:", user.password);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role_name: user.role_name,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_name: user.role_name,
      },
    });
  });
};

const getMe = (req, res) => {
  return res.json({
    user: req.user,
  });
};

module.exports = { loginUser, getMe };