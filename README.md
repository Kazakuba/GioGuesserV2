# GioGuesser V2

## 🔗 Demo
Test out the demo here: [link](https://gioguesser.netlify.app)

A multiplayer and single‑player GeoGuessing game built on Google Maps Street View and Firebase.

---

## 🌍 Overview
**GioGuesser V2** is a browser‑based interactive geography game that challenges players to identify global locations using Google Street View. The game includes both solo and real‑time multiplayer modes, with a health‑based scoring system and fast‑paced rounds.

A unique aspect of this version is its ability to surface locations that are typically restricted or unavailable in most GeoGuessr‑style games, including regions like China and Russia.

---

## 🛑 What Makes V2 Different: Restricted Locations
Most GeoGuessr‑style games avoid restricted regions due to API limitations. GioGuesser V2 uses a brute‑force randomization approach:

### **1. Pure Random Coordinates**
- Generates a random latitude (−70° to 70°) and longitude.

### **2. Broad StreetView Search**
- Uses `StreetViewService` with a **100 km radius** and `'nearest'` preference.

### **3. Result**
- Allows landing in user‑contributed or otherwise unprioritized panoramic data.
- Enables frequent appearances in typically restricted regions (China, Russia, etc.).

---

## ✨ Key Features
### **Single‑Player Mode**
- Guess locations across multiple rounds.
- Maintain health by making accurate guesses.

### **Real‑time Multiplayer Mode**
- Create or join private rooms.
- All players compete simultaneously.
- Damage is based on distance from the true location.
- Last player alive wins.

### **Real‑time Health System**
- Health synced across all players.
- Damage and penalties update instantly.

### **Timer‑Based Rounds**
- Each round has a strict time limit.
- Missing the timer results in a heavy damage penalty.

### **Interactive Minimap**
- Expandable minimap for precision guessing.

---

## 🛠️ Technology Stack
### **Front‑end**
- HTML5
- CSS3 (Glassmorphism UI)
- Vanilla JavaScript (ES6+)

### **Mapping**
- Google Maps JavaScript API
- Street View
- Geometry Library for distance
- Geocoding API for country lookup

### **Real‑time Database**
- Firebase Realtime Database

### **Architecture**
- Modular JS organization:
  - `ui.js` — DOM, UI updates, timers, audio
  - `gameLogic.js` — round management, guesses, randomization
  - `firebase.js` — multiplayer room state sync
  - `script.js` — global state + entrypoint

---

## 🚀 Setup & Installation
Follow these steps to run the project locally.

### **1. Obtain API Keys**
You need:
- Google Maps API Key
- Firebase configuration

Enable:
- Maps JavaScript API
- Street View Static API

### **2. Configure the Project**
Edit `script.js`:
```js
const GOOGLE_MAPS_API_KEY = 'Your_Google_Maps_API_Key_Here';
// Update firebaseConfig below...
```

Update the last script tag in `index.html`:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=Your_Google_Maps_API_Key_Here&libraries=geometry&loading=async&callback=initMap" async defer></script>
```

### **3. Run the Application**
No server required. Open `index.html` directly in your browser.

---

## 📂 Code Structure
| File | Responsibility |
|------|----------------|
| `script.js` | Global state, `initMap()`, setup. |
| `src/ui.js` | UI logic, DOM updates, health bars, timers, audio. |
| `src/gameLogic.js` | Game flow, guessing logic, distance calc, randomization. |
| `src/firebase.js` | Firebase sync, room listeners, host actions. |
| `style.css` | Full UI styling and responsive layout. |

---
