const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/" 
});

const db = admin.database();

async function testLogic() {
  console.log("🔍 Testing Admin Logic & Database Connection...");

  try {
    // 1. Test Article Creation
    const artId = "test_art_" + Date.now();
    await db.ref(`articles/${artId}`).set({
      id: artId,
      title: "Test Connection Article",
      content: "This is a test article to verify database connection.",
      status: "Draft",
      date: new Date().toLocaleDateString()
    });
    console.log("✅ Article Creation: SUCCESS");

    // 2. Test Team Member Creation
    const memberId = "test_mem_" + Date.now();
    await db.ref(`team/${memberId}`).set({
      id: memberId,
      name: "Test Engineer",
      role: "Maintenance",
      email: "test@swiftbox.com",
      accessKey: "9999"
    });
    console.log("✅ Team Member Creation: SUCCESS");

    // 3. Verify Data Exists
    const artSnap = await db.ref(`articles/${artId}`).once('value');
    const memSnap = await db.ref(`team/${memberId}`).once('value');

    if (artSnap.exists() && memSnap.exists()) {
      console.log("✅ Data Persistence: SUCCESS");
    } else {
      throw new Error("Data not persisted correctly.");
    }

    // 4. Cleanup
    await db.ref(`articles/${artId}`).remove();
    await db.ref(`team/${memberId}`).remove();
    console.log("✅ Cleanup: SUCCESS");

    console.log("\n🚀 ADMIN LOGIC & CONNECTION VERIFIED.");
    process.exit();
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

testLogic();
