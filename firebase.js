// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBl_OOZo7cqFFk_4wp3IJ4CIpH_DVgpYDk",
  authDomain: "pantry-tracker-8a0eb.firebaseapp.com",
  projectId: "pantry-tracker-8a0eb",
  storageBucket: "pantry-tracker-8a0eb.appspot.com",
  messagingSenderId: "427616564124",
  appId: "1:427616564124:web:6066df50a3806d6851ce59",
  measurementId: "G-LYLWZ3JVGK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      const analytics = getAnalytics(app);
    }
  });
};
