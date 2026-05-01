const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "[https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/](https://swiftbox-project-default-rtdb.asia-southeast1.firebasedatabase.app/)" 
});

const db = admin.database();

async function runSeeder() {
  const HUBS = [
    { name: 'Manila Gateway Hub', coords: [14.5995, 120.9842] },
    { name: 'Zamboanga Distribution', coords: [6.9214, 122.0739] },
    { name: 'Pagadian Capitol College', coords: [7.8285, 123.4355] }
  ];

  for(let i=0; i<15; i++) {
    const prog = Math.floor(Math.random() * 3);
    const id = `SBX-${faker.string.alphanumeric(5).toUpperCase()}`;
    
    await db.ref(`parcels/${id}`).set({
      parcel_id: id,
      sender: faker.company.name(),
      status: prog === 2 ? 'IN_TERMINAL' : 'SHIPPING',
      location: HUBS[prog].name,
      coords: HUBS[prog].coords,
      lockerId: prog === 2 ? `L0${Math.ceil(Math.random()*4)}` : "TBA",
      history: HUBS.slice(0, prog + 1).map((h, index) => ({
        location: h.name, coords: h.coords, status: index === prog ? 'Current' : 'Passed', current: index === prog
      }))
    });
    console.log(`Seeded: ${id}`);
  }
  process.exit();
}
runSeeder();