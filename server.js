require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// 🚀 PRODUCTION CORS: Allows your Vercel frontend to talk to this server
app.use(cors({
  origin: '*' 
}));
app.use(express.json());

// 🔐 FIREBASE INITIALIZATION (Render-Ready Fix)
let serviceAccount;

if (process.env.FIREBASE_CONFIG) {
  // Logic for Render: Uses the "Secret" you pasted in the dashboard
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
  console.log("🛠️ Initialized using Render Environment Variable");
} else {
  // Logic for Local: Uses your local file on your computer
  serviceAccount = require("./serviceAccountKey.json");
  console.log("🏠 Initialized using local serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/" 
});

const db = admin.database();

// 📍 LOGISTICS HUBS
const HUBS = {
  MANILA: { name: 'Manila Gateway Hub', coords: [14.5995, 120.9842] },
  ZAMBOANGA: { name: 'Zamboanga Distribution', coords: [6.9214, 122.0739] },
  PCC: { name: 'Pagadian Capitol College', coords: [7.8285, 123.4355] }
};

// --- API ROUTES ---

// A. TRACKING: Fetch parcel by ID
app.get('/api/track/:id', async (req, res) => {
  try {
    const snapshot = await db.ref(`parcels/${req.params.id}`).once('value');
    if (!snapshot.exists()) return res.status(404).json({ message: "Invalid Tracking ID." });
    
    // Safety: Hide the claim_pin from general tracking results
    const { claim_pin, ...secureData } = snapshot.val(); 
    res.status(200).json(secureData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// B. MERCHANT REGISTRATION
app.post('/api/register-parcel', async (req, res) => {
  const { parcelId, sender, phone, dimensions } = req.body;
  const timestamp = Date.now();

  const startHub = Math.random() > 0.5 ? HUBS.MANILA : HUBS.ZAMBOANGA;

  try {
    await db.ref(`parcels/${parcelId}`).set({
      parcel_id: parcelId,
      sender,
      recipient_phone: phone,
      dimensions,
      status: 'SHIPPING',
      location: startHub.name,
      coords: startHub.coords,
      lockerId: "TBA", 
      timestamp,
      history: [{ 
        status: 'Processed', 
        location: startHub.name, 
        coords: startHub.coords, 
        time: timestamp, 
        current: true 
      }]
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// C. RIDER DROP-OFF: Assigns locker automatically
app.post('/api/rider-dropoff', async (req, res) => {
  const { parcelId } = req.body;
  try {
    const lockerSnap = await db.ref('lockers').orderByChild('status').equalTo('VACANT').limitToFirst(1).once('value');
    if (!lockerSnap.exists()) return res.status(400).json({ message: "No vacant lockers available." });

    const lockerId = Object.keys(lockerSnap.val())[0];
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const timestamp = Date.now();

    await db.ref(`lockers/${lockerId}`).update({ status: 'OCCUPIED', parcel_id: parcelId, claim_pin: pin, timestamp });

    const pRef = db.ref(`parcels/${parcelId}`);
    const pSnap = await pRef.once('value');
    const pData = pSnap.val();

    const updatedHistory = [...(pData.history || []), { 
        status: 'Arrived at Terminal', location: HUBS.PCC.name, coords: HUBS.PCC.coords, time: timestamp, current: true 
    }].map(h => ({ ...h, current: h.location === HUBS.PCC.name }));

    await pRef.update({
      status: 'IN_TERMINAL',
      location: HUBS.PCC.name,
      coords: HUBS.PCC.coords,
      lockerId: lockerId,
      history: updatedHistory
    });

    res.status(200).json({ success: true, lockerId, pin });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// D. LOCKER MONITORING
app.get('/api/lockers', async (req, res) => {
  try {
    const snap = await db.ref('lockers').once('value');
    res.status(200).json(snap.val());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🚀 DYNAMIC PORT FOR RENDER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ SWIFTBOX BACKEND LIVE ON PORT: ${PORT}`);
});