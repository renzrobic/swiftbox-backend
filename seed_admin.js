const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/" 
});

const db = admin.database();

async function seedAdmin() {
  console.log("🚀 Restoring Admin Access...");
  try {
    const teamRef = db.ref('team');
    await teamRef.set({
      "admin01": {
        name: "Administrator",
        role: "Super Admin",
        accessKey: "123"
      }
    });
    console.log("✅ SUCCESS: Admin account created.");
    console.log("🔑 Access Key: 123");
    process.exit();
  } catch (error) {
    console.error("❌ FAILED:", error);
    process.exit(1);
  }
}

seedAdmin();
