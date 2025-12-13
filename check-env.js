// Quick script to check .env configuration
require("dotenv").config();

console.log("\n🔍 Environment Variables Check:\n");

const required = {
  JWT_SECRET: process.env.JWT_SECRET,
  MONGO_URI: process.env.MONGO_URI,
};

const optional = {
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  MAIL_FROM: process.env.MAIL_FROM,
  MAIL_TO: process.env.MAIL_TO,
  PORT: process.env.PORT || "5000 (default)",
};

console.log("📌 REQUIRED Variables:");
let allRequired = true;
for (const [key, value] of Object.entries(required)) {
  const status = value ? "✅" : "❌";
  const display = value ? `${value.substring(0, 10)}...` : "NOT SET";
  console.log(`  ${status} ${key}: ${display}`);
  if (!value) allRequired = false;
}

console.log("\n📌 OPTIONAL Variables (SendGrid Email):");
for (const [key, value] of Object.entries(optional)) {
  const status = value ? "✅" : "⚠️ ";
  const display =
    key === "SENDGRID_API_KEY"
      ? value ? "***SET***" : "NOT SET"
      : value || "NOT SET";
  console.log(`  ${status} ${key}: ${display}`);
}

console.log("\n💡 Tips:");
if (!process.env.SENDGRID_API_KEY) {
  console.log("  - Create SendGrid API Key");
  console.log("  - Dashboard → Settings → API Keys");
}
if (!process.env.MAIL_FROM) {
  console.log("  - MAIL_FROM must be a verified sender in SendGrid");
}
if (!process.env.JWT_SECRET) {
  console.log("  - JWT_SECRET should be a long random string");
}

if (allRequired) {
  console.log("\n✅ All required variables are set!");
} else {
  console.log("\n❌ Some required variables are missing!");
  process.exit(1);
}
