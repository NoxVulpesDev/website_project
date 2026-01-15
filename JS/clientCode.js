document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------------------------------------------
   *  CONFIG & GLOBALS
   * --------------------------------------------------------- */
  const broadcasterId = "43085790";
  const baseURL = "https://noxvulpesdev.github.io/website_project/toolbox/";
  const toolboxFiles = ["cat.gif", "dog.png", "heart.png", "star.png"];

  let twitchUser = null;
  let selectedImage = null;

  const preview = document.getElementById("preview");
  const previewLayer = document.getElementById("preview-layer");
  const toolWindow = document.getElementById("toolWindow");

  /* ---------------------------------------------------------
   *  FIREBASE INIT
   * --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
   *  TWITCH AUTH
   * --------------------------------------------------------- */
  const token = new URLSearchParams(window.location.hash.substring(1))
    .get("access_token");

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

  /* ---------------------------------------------------------
   *  FIREBASE REALTIME LISTENERS
   * --------------------------------------------------------- */
  db.ref("placements").on("child_added", snap => {
    const data = snap.val();
    const el = document.createElement("img");

    el.src = baseURL + data.image;
    el.id = snap.key;
    el.className = "placed-image";
    el.style.left = data.x + "px";
    el.style.top = data.y + "px";

    previewLayer.appendChild(el);
  });

  db.ref("placements").on("child_changed", snap => {
    const data = snap.val();
    const el = document.getElementById(snap.key);
    if (el) {
      el.style.left = data.x + "px";
      el.style.top = data.y + "px";
    }
  });

  db.ref("placements").on("child_removed", snap => {
    const el = document.getElementById(snap.key);
    if (el) el.remove();
  });

  /* ---------------------------------------------------------
   *  TOOLBOX IMAGE LOADING
   * --------------------------------------------------------- */
  function loadToolboxImages() {
    const container = document.getElementById("images");

    toolboxFiles.forEach(file => {
      const img = document.createElement("img");
      img.src = baseURL + file;
      img.className = "toolbox-thumb";

      img.addEventListener("click", () => selectImage(file));
      container.appendChild(img);
    });
  }

  /* ---------------------------------------------------------
   *  IMAGE SELECTION + PREVIEW FOLLOW
   * --------------------------------------------------------- */
  function selectImage(filename) {
    selectedImage = filename;
    preview.src = baseURL + filename;
    preview.style.display = "block";
  }

  document.addEventListener("mousemove", e => {
    if (preview.style.display !== "none") {
      preview.style.left = e.pageX + 10 + "px";
      preview.style.top = e.pageY + 10 + "px";
    }
  });

  /* ---------------------------------------------------------
   *  CLICK-TO-PLACE LOGIC
   * --------------------------------------------------------- */
  document.addEventListener("click", e => {
    if (toolWindow.contains(e.target)) return;
    if (!selectedImage || !twitchUser) return;

    db.ref("placements").push({
      image: selectedImage,
      x: e.pageX,
      y: e.pageY,
      user: twitchUser.display_name,
      timestamp: Date.now()
    });

    preview.style.display = "none";
    selectedImage = null;
  });

  /* ---------------------------------------------------------
   *  SUBSCRIBER CHECK
   * --------------------------------------------------------- */
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
    return data.data && data.data.length > 0;
  }

  /* ---------------------------------------------------------
   *  CLEAR MY ITEMS
   * --------------------------------------------------------- */
  async function clearMyItems() {
    const snap = await db.ref("placements")
      .orderByChild("user")
      .equalTo(twitchUser.display_name)
      .once("value");

    const items = snap.val();
    if (!items) return;

    const updates = {};
    Object.keys(items).forEach(key => updates[key] = null);

    db.ref("placements").update(updates);
  }

  document.getElementById("clearMine").addEventListener("click", clearMyItems);

  /* ---------------------------------------------------------
   *  INIT FLOW
   * --------------------------------------------------------- */
  loadTwitchUser().then(loadToolboxImages);

});
