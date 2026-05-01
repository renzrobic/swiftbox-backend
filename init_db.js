const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/" 
});

const db = admin.database();

// Your initial dataset structure
const initialData = {
  lockers: {
    "L01": { status: "VACANT" },
    "L02": { status: "VACANT" },
    "L03": { status: "VACANT" },
    "L04": { status: "VACANT" }
  },
  parcels: {
    "README": { status: "SYSTEM_READY", message: "Database initialized." }
  }
};

async function seed() {
  console.log("🚀 Initializing SwiftBox Dataset...");
  try {
    await db.ref('/').set(initialData);
    console.log("✅ SUCCESS: Database structure restored.");
    process.exit();
  } catch (error) {
    console.error("❌ FAILED:", error);
    process.exit(1);
  }
}

seed();