// Quick script to check .env configuration
require('dotenv').config();

console.log("\n🔍 Environment Variables Check:\n");

const required = {
    'JWT_SECRET': process.env.JWT_SECRET,
    'MONGO_URI': process.env.MONGO_URI,
};

const optional = {
    'MAIL_USER': process.env.MAIL_USER,
    'MAIL_PASS': process.env.MAIL_PASS,
    'MAIL_TO': process.env.MAIL_TO,
    'PORT': process.env.PORT || '5000 (default)',
};

console.log("📌 REQUIRED Variables:");
let allRequired = true;
for (const [key, value] of Object.entries(required)) {
    const status = value ? '✅' : '❌';
    const display = value ? `${value.substring(0, 10)}...` : 'NOT SET';
    console.log(`  ${status} ${key}: ${display}`);
    if (!value) allRequired = false;
}

console.log("\n📌 OPTIONAL Variables (for email):");
for (const [key, value] of Object.entries(optional)) {
    const status = value ? '✅' : '⚠️ ';
    const display = value ? (key === 'MAIL_PASS' ? '***SET***' : value) : 'NOT SET';
    console.log(`  ${status} ${key}: ${display}`);
}

console.log("\n💡 Tips:");
if (!process.env.MAIL_PASS) {
    console.log("  - For Gmail: Use App Password (not regular password)");
    console.log("  - Generate at: Google Account → Security → App passwords");
}
if (!process.env.JWT_SECRET) {
    console.log("  - JWT_SECRET should be a long random string");
    console.log("  - Example: JWT_SECRET=your-super-secret-key-12345");
}

if (allRequired) {
    console.log("\n✅ All required variables are set!");
} else {
    console.log("\n❌ Some required variables are missing!");
    process.exit(1);
}






