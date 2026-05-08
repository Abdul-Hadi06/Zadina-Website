// ═══════════════════════════════════════════════════════
//  firebase.js  —  Firebase SDK init  (shared by all modules)
// ═══════════════════════════════════════════════════════

import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAUoVUyV2OoUTPLLRl_mDBmMePczUFTlMA",
  authDomain:        "zadina-d40a7.firebaseapp.com",
  projectId:         "zadina-d40a7",
  storageBucket:     "zadina-d40a7.firebasestorage.app",
  messagingSenderId: "838368134554",
  appId:             "1:838368134554:web:2f9d94ee42c3532ec6e623",
  measurementId:     "G-V0QZ7VZW7R"
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };
