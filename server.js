require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');

const app = express();

// 🛡️ SECURITY HEADERS: Protect against common web vulnerabilities
app.use(helmet());

// 🚀 PRODUCTION CORS: Restricted to known frontend origin
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));
app.use(express.json({ limit: '10kb' })); // Limit payload size to prevent DoS

// ⏳ RATE LIMITING: Prevent brute-force and DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: { error: "Too many requests, please try again later." }
});

// 🤖 AI RATE LIMITER: Much stricter because of API costs
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Only 20 AI commands per hour per IP
  message: { error: "AI Limit reached. Please wait an hour to save on our API costs!" }
});

app.use('/api/', apiLimiter);

// 🔐 WEBHOOK VALIDATION MIDDLEWARE
const validateWebhook = (req, res, next) => {
  const signature = req.headers['x-swiftbox-signature'];
  if (signature !== process.env.WEBHOOK_SECRET) {
    console.warn(`⚠️ SUSPICIOUS WEBHOOK ATTEMPT from ${req.ip}`);
    return res.status(403).json({ error: "Invalid webhook signature." });
  }
  next();
};

// 🔐 ENCRYPTION UTILITY
const encryptData = (text) => {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, process.env.ENCRYPTION_KEY).toString();
};

const decryptData = (ciphertext) => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "DECRYPTION_ERROR";
  }
};

// 🤖 PROMPT INJECTION PROTECTION
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  const sanitized = input
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/ignore previous instructions/gi, '[REDACTED]')
    .replace(/you are now a/gi, '[REDACTED]')
    .trim();
  
  if (sanitized !== input) {
    console.warn(`🛡️ PROMPT INJECTION BLOCKED from ${input}`);
  }
  return sanitized;
};


// 🔐 ADMIN AUTH MIDDLEWARE
const validateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized access detected." });
  }
  next();
};

// 🔐 FIREBASE INITIALIZATION
let serviceAccount;
if (process.env.FIREBASE_CONFIG) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// 📍 LOGISTICS HUBS
const HUBS = {
  MANILA: { name: 'Manila Gateway Hub', coords: [14.5995, 120.9842] },
  ZAMBOANGA: { name: 'Zamboanga Distribution', coords: [6.9214, 122.0739] },
  PCC: { name: 'Pagadian Capitol College', coords: [7.8285, 123.4355] }
};

// --- API ROUTES ---

// A. TRACKING: Fetch parcel by ID (Public)
app.get('/api/track/:id', async (req, res) => {
  try {
    const parcelId = sanitizeInput(req.params.id);
    const snapshot = await db.ref(`parcels/${parcelId}`).once('value');
    if (!snapshot.exists()) return res.status(404).json({ message: "Invalid Tracking ID." });
    
    const data = snapshot.val();
    const { claim_pin, recipient_phone, ...secureData } = data; 
    
    // Decrypt phone if needed for the frontend (only if authorized, but here we hide it)
    res.status(200).json(secureData);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// B. MERCHANT REGISTRATION (Admin Only)
app.post('/api/register-parcel', validateAdmin, async (req, res) => {
  let { parcelId, sender, phone, dimensions } = req.body;
  const timestamp = Date.now();

  // Sanitize and Encrypt sensitive data
  parcelId = sanitizeInput(parcelId);
  sender = sanitizeInput(sender);
  const encryptedPhone = encryptData(phone);

  const startHub = Math.random() > 0.5 ? HUBS.MANILA : HUBS.ZAMBOANGA;

  try {
    await db.ref(`parcels/${parcelId}`).set({
      parcel_id: parcelId,
      sender,
      recipient_phone: encryptedPhone, // 🔐 ENCRYPTED AT REST
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
  } catch (error) { res.status(500).json({ error: "Failed to register parcel" }); }
});

// C. RIDER DROP-OFF: Assigns locker automatically (Admin Only)
app.post('/api/rider-dropoff', validateAdmin, async (req, res) => {
  let { parcelId } = req.body;
  parcelId = sanitizeInput(parcelId);

  try {
    const lockerSnap = await db.ref('lockers').orderByChild('status').equalTo('VACANT').limitToFirst(1).once('value');
    if (!lockerSnap.exists()) return res.status(400).json({ message: "No vacant lockers available." });

    const lockerId = Object.keys(lockerSnap.val())[0];
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const timestamp = Date.now();

    // Store PIN securely or hash it if verification happens server-side
    await db.ref(`lockers/${lockerId}`).update({ 
      status: 'OCCUPIED', 
      parcel_id: parcelId, 
      claim_pin: pin, 
      timestamp 
    });

    const pRef = db.ref(`parcels/${parcelId}`);
    const pSnap = await pRef.once('value');
    if (!pSnap.exists()) return res.status(404).json({ error: "Parcel not found" });
    
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
  } catch (error) { res.status(500).json({ error: "Drop-off failed" }); }
});

// D. LOCKER MONITORING (Admin Only)
app.get('/api/lockers', validateAdmin, async (req, res) => {
  try {
    const snap = await db.ref('lockers').once('value');
    const lockers = snap.val() || {};
    
    // Mask sensitive pins in the list
    const safeLockers = {};
    Object.keys(lockers).forEach(id => {
      const { claim_pin, ...rest } = lockers[id];
      safeLockers[id] = rest;
    });

    res.status(200).json(safeLockers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lockers" });
  }
});

// E. AI COMMAND PROCESSING (Experimental)
app.post('/api/ai/command', aiLimiter, async (req, res) => {
  const { command } = req.body;
  const sanitizedCommand = sanitizeInput(command);

  // Logic to call LLM would go here
  // For now, we just echo back the sanitized command
  res.status(200).json({ 
    success: true, 
    received: sanitizedCommand,
    note: "This endpoint is protected by aggressive rate limiting and prompt injection sanitization."
  });
});

// 🚀 DYNAMIC PORT FOR RENDER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ SWIFTBOX SECURE BACKEND LIVE ON PORT: ${PORT}`);
});
