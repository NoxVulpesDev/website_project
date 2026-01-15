document.addEventListener("DOMContentLoaded", () => {
  // Firebase init
  const firebaseConfig = {
    apiKey: "AIzaSyAol98GRF7IgzzAvKDx9oKcQqCAhuCt0Dc",
    authDomain: "twitch-drag-and-drop.firebaseapp.com",
    databaseURL: "https://twitch-drag-and-drop-default-rtdb.europe-west1.firebasedatabase.app",
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
  db.ref("placements").on("child_added", snapshot => {
    const data = snapshot.val();
    const id = snapshot.key;
    const img = document.createElement("img");
    img.id = id;
    img.src = "images/" + data.image;
    img.style.left = data.x + "px";
    img.style.top = data.y + "px";
    img.className = "placed-image";
    document.body.appendChild(img);
  });

  db.ref("placements").on("child_changed", snapshot => {
    const data = snapshot.val();
    const id = snapshot.key;
    const img = document.getElementById(id);
    if (img) {
      img.style.left = data.x + "px";
      img.style.top = data.y + "px";
    }
  });

  db.ref("placements").on("child_removed", snapshot => {
    const id = snapshot.key;
    const img = document.getElementById(id);
    if (img) img.remove();
  });
}); // End of DOMContentLoaded listener