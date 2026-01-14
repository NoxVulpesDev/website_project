// Firebase init
const firebaseConfig = {
  apiKey: "AIzaSyAol98GRF7IgzzAvKDx9oKcQqCAhuCt0Dc",
  authDomain: "twitch-drag-and-drop.firebaseapp.com",
  projectId: "twitch-drag-and-drop",
  storageBucket: "twitch-drag-and-drop.firebasestorage.app",
  messagingSenderId: "649088114441",
  appId: "1:649088114441:web:7b64f8490828c4931cfdd8",
  measurementId: "G-T51KFPCL3T"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resize();
window.onresize = resize;

// Listen for placements
db.ref("placements").on("child_added", snap => {
  const data = snap.val();
  const img = new Image();
  img.onload = () => ctx.drawImage(img, data.x, data.y);
  img.src = "/toolbox/" + data.image;
});
