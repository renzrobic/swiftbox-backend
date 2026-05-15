const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/" 
});

const db = admin.database();

const PRODUCTION_DATA = {
  lockers: {
    "L01": { status: "OCCUPIED", parcel_id: "SBX-9921", timestamp: Date.now() },
    "L02": { status: "VACANT" },
    "L03": { status: "OCCUPIED", parcel_id: "SBX-8832", timestamp: Date.now() },
    "L04": { status: "VACANT" }
  },
  parcels: {
    "SBX-9921": {
      parcel_id: "SBX-9921",
      sender: "Global Logistics Inc.",
      status: "IN_TERMINAL",
      location: "Pagadian Capitol College",
      coords: [7.8285, 123.4355],
      lockerId: "L01",
      timestamp: Date.now(),
      history: [
        { status: "Processed", location: "Manila Gateway Hub", time: Date.now() - 86400000, current: false },
        { status: "Arrived at Terminal", location: "Pagadian Capitol College", time: Date.now(), current: true }
      ]
    },
    "SBX-8832": {
      parcel_id: "SBX-8832",
      sender: "TechNexus Store",
      status: "IN_TERMINAL",
      location: "Pagadian Capitol College",
      coords: [7.8285, 123.4355],
      lockerId: "L03",
      timestamp: Date.now(),
      history: [
        { status: "Processed", location: "Zamboanga Distribution", time: Date.now() - 43200000, current: false },
        { status: "Arrived at Terminal", location: "Pagadian Capitol College", time: Date.now(), current: true }
      ]
    }
  },
  articles: {
    "art_001": {
      id: "art_001",
      title: "SwiftBox Expands to Zamboanga Peninsula",
      category: "Company",
      content: "<p>We are thrilled to announce the expansion of SwiftBox smart lockers to the Zamboanga Peninsula. This move marks a significant milestone in our mission to provide secure, accessible, and smart last-mile logistics solutions across the region.</p><p>Our new nodes will feature the latest in biometric and encrypted access, ensuring that your parcels are safer than ever before.</p>",
      image: "https://images.pexels.com/photos/4481258/pexels-photo-4481258.jpeg?auto=compress&cs=tinysrgb&w=800",
      status: "Live",
      date: "May 15, 2026",
      views: 124
    },
    "art_002": {
      id: "art_002",
      title: "Next-Gen AI Security Protocols Live",
      category: "Engineering",
      content: "<p>The Engineering team has successfully deployed the 'Aegis' update across all SwiftBox terminals. This update introduces real-time anomaly detection and predictive maintenance for all locker modules.</p><p>Security is our top priority, and with these new AI-driven protocols, we are setting a new industry standard for smart locker safety.</p>",
      image: "https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg?auto=compress&cs=tinysrgb&w=800",
      status: "Live",
      date: "May 14, 2026",
      views: 89
    }
  },
  team: {
    "member_001": {
      id: "member_001",
      name: "Renz Robic",
      role: "Super Admin",
      email: "renzrobiclucillabernal@gmail.com",
      accessKey: "123",
      status: "Online"
    },
    "member_002": {
      id: "member_002",
      name: "Sarah Chen",
      role: "Operations",
      email: "ops@swiftbox.com",
      accessKey: "4567",
      status: "Offline"
    }
  }
};

async function seed() {
  console.log("🔥 Purging old data and seeding PRODUCTION dataset...");
  try {
    await db.ref('/').set(PRODUCTION_DATA);
    console.log("✨ SUCCESS: Production environment ready.");
    process.exit();
  } catch (error) {
    console.error("💥 FAILED:", error);
    process.exit(1);
  }
}

seed();
