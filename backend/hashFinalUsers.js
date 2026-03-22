const bcrypt = require("bcryptjs");

async function run() {
  const passwords = [
    "manager123",
    "ops123",
    "supervisor123",
    "logistics123",
    "supplier123",
    "demo123",
  ];

  for (const pwd of passwords) {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`${pwd} => ${hash}`);
  }
}

run();