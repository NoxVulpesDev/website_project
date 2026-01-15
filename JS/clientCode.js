
document.addEventListener("DOMContentLoaded", () => {
  const broadcasterId = '43085790'; // Example broadcaster ID

  // --- Firebase init ---
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
  const baseURL = "https://noxvulpesdev.github.io/website_project/toolbox/";
  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // --- Twitch token extraction ---
  const hash = window.location.hash;
  const token = new URLSearchParams(hash.substring(1)).get("access_token");
  let twitchUser = null;

  async function loadTwitchUser() {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": "xucm0e5wjyrw84pz7vx7l4rk4z0cho",
        "Authorization": "Bearer " + token
      }
    });
    const data = await res.json();
    twitchUser = data.data[0];
    const isStreamer = twitchUser.id === broadcasterId;
    if (!isStreamer) {
      const isSub = await checkIfSubscriber(twitchUser.id);
      if (!isSub) {
        document.getElementById("images").style.display = "none";
        document.body.innerHTML += "<h2>This feature is for subscribers only.</h2>";
        return;
      }
    }
    console.log("Access granted:", twitchUser.display_name);
  }

  // --- Load toolbox images ---
  const toolbox = ["cat.gif", "dog.png", "heart.png", "star.png"];

  function loadImages() {
    const container = document.getElementById("images");
    toolbox.forEach(file => {
      const img = document.createElement("img");
      img.src = "https://noxvulpesdev.github.io/website_project/toolbox/" + file;
      img.style.width = "120px";
      img.style.cursor = "grab";
      img.onmousedown = e => {
        selectedFile = file;
        dragImg.src = img.src;
        dragImg.style.display = "block";
        dragImg.style.left = e.pageX + "px";
        dragImg.style.top = e.pageY + "px";
      };
      container.appendChild(img);
    });
  }

  const previewLayer = document.getElementById("preview-layer");
  db.ref("placements").on("child_added", snap => {
    const data = snap.val();
    const el = document.createElement("img");
    el.src = baseURL + data.image;
    el.style.position = "absolute";
    el.style.left = data.x + "px";
    el.style.top = data.y + "px";
    previewLayer.appendChild(el);
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

  // --- Drag logic ---
  let selectedFile = null;
  const dragImg = document.getElementById("dragImg");

  document.onmousemove = e => {
    if (dragImg.style.display === "block") {
      dragImg.style.left = e.pageX + "px";
      dragImg.style.top = e.pageY + "px";
    }
  };

  document.onmouseup = e => {
    if (!selectedFile || !twitchUser) return;
    const x = e.pageX;
    const y = e.pageY;
    firebase.database().ref("placements").push({
      image: selectedFile,
      x,
      y,
      user: twitchUser.display_name,
      timestamp: Date.now()
    });
    dragImg.style.display = "none";
    selectedFile = null;
  };

  loadTwitchUser().then(loadImages);

  async function checkIfSubscriber(userId) {
    const res = await fetch(
      `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${broadcasterId}&user_id=${userId}`,
      {
        headers: {
          "Client-ID": "xucm0e5wjyrw84pz7vx7l4rk4z0cho",
          "Authorization": "Bearer " + token
        }
      }
    );
    const data = await res.json();
    // If the array has 1 item, the user is subscribed
    return data.data && data.data.length > 0;
  }

  async function clearMyItems() {
    const snap = await db.ref("placements")
      .orderByChild("user")
      .equalTo(twitchUser.display_name)
      .once("value");
    const items = snap.val();
    if (!items) return;
    const updates = {};
    Object.keys(items).forEach(key => {
      updates[key] = null;
    });
    db.ref("placements").update(updates);
  }

  document.getElementById("clearMine").onclick = () => {
    clearMyItems();
  };
}); // End of DOMContentLoaded listener