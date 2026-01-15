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
    if (isStreamer) {
         document.getElementById("adminPanel").style.display = "block"; 
    }
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
   *  SETTING DEFAULTS
   * --------------------------------------------------------- */
  async function ensureCooldownDefaults() {
    const cooldownEnabledRef = db.ref("settings/cooldownEnabled");
    const cooldownSecondsRef = db.ref("settings/cooldownSeconds");
    const enabledSnap = await cooldownEnabledRef.once("value");
    const secondsSnap = await cooldownSecondsRef.once("value");
    if (enabledSnap.val() === null) {
      cooldownEnabledRef.set(false); // default: cooldown off
    }
    if (secondsSnap.val() === null) {
      cooldownSecondsRef.set(10);
    }
  }

  async function ensurePlacementLimitDefaults() { 
    const limitEnabledRef = db.ref("settings/limitEnabled"); 
    const maxPerUserRef = db.ref("settings/maxPerUser"); 
    const limitEnabledSnap = await limitEnabledRef.once("value"); 
    const maxPerUserSnap = await maxPerUserRef.once("value"); 
    if (limitEnabledSnap.val() === null) { 
        limitEnabledRef.set(false); // default: limits off 
        } 
        
    if (maxPerUserSnap.val() === null) {
         maxPerUserRef.set(1); // default: 1 placement per user 
         } 
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
  document.addEventListener("click", async e => {
    if (toolWindow.contains(e.target)) return;
    if (!selectedImage || !twitchUser) return;

    // --- Cooldown check ---
    const cooldownEnabled = (await db.ref("settings/cooldownEnabled").once("value")).val();
    if (cooldownEnabled) {
      const cooldownSeconds = (await db.ref("settings/cooldownSeconds").once("value")).val() || 10;
      const lastPlacedSnap = await db.ref("lastPlaced/" + twitchUser.display_name).once("value");
      const lastPlaced = lastPlacedSnap.val() || 0;
      const now = Date.now();
      if (now - lastPlaced < cooldownSeconds * 1000) {
        console.log("Cooldown active");
        return; // block placement
      }
      // Update last placed time
      db.ref("lastPlaced/" + twitchUser.display_name).set(now);
    }

    // --- Placement limit check ---
    const limitEnabled = (await db.ref("settings/limitEnabled").once("value")).val();
    if (limitEnabled) {
      const maxPerUser = (await db.ref("settings/maxPerUser").once("value")).val() || 1;
      const snap = await db.ref("placements")
        .orderByChild("user")
        .equalTo(twitchUser.display_name)
        .once("value");
      const count = snap.val() ? Object.keys(snap.val()).length : 0;
      if (count >= maxPerUser) {
        console.log("Placement limit reached");
        return; // block placement
      }
    }

    // --- Place the image ---
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
   *  ADMIN FUNCTIONS
   * --------------------------------------------------------- */
  async function clearAllItems() {
    await db.ref("placements").remove();
  }

  document.getElementById("toggleCooldown").addEventListener("change", e => {
    if (!isStreamer) return;
    db.ref("settings/cooldownEnabled").set(e.target.checked);
  });

  document.getElementById("clearAll").addEventListener("click", clearAllItems);

  document.getElementById("toggleLimit").addEventListener("change", e => {
  if (!isStreamer) return;
  db.ref("settings/limitEnabled").set(e.target.checked);
});


  /* ---------------------------------------------------------
   *  INIT FLOW
   * --------------------------------------------------------- */
  loadTwitchUser().then(() => {
     ensureCooldownDefaults(); 
     ensurePlacementLimitDefaults(); 
     loadToolboxImages(); 
    });

});
