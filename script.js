const DISCORD_ID = "446226718844256266"; // Deine Discord-ID

const avatarEl = document.getElementById("avatar");
const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status-icon");
const activityEl = document.getElementById("activity");
const spotifyContainer = document.getElementById("spotifyContainer");
const spotifyInfo = document.getElementById("spotifyInfo");
const copyBtn = document.getElementById("copyBtn");

const statusColors = {
  online: "#43b581",
  idle: "#faa61a",
  dnd: "#f04747",
  offline: "#747f8d"
};

function showStatusIcon(status) {
  const color = statusColors[status] || statusColors.offline;
  statusEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10"/></svg>`;
}

copyBtn.textContent = "📋";
copyBtn.style.cursor = "pointer";
copyBtn.title = "Username kopieren";
copyBtn.onclick = () => {
  if (usernameEl.textContent && usernameEl.textContent !== "Lade..." && usernameEl.textContent !== "N/A") {
    navigator.clipboard.writeText(usernameEl.textContent).then(() => {
      copyBtn.textContent = "✅";
      setTimeout(() => (copyBtn.textContent = "📋"), 1500);
    });
  }
};

const ws = new WebSocket("wss://api.lanyard.rest/socket");

ws.onopen = () => {
  ws.send(JSON.stringify({ op: 2, d: { subscribe_to_ids: [DISCORD_ID] } }));
  setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 }));
  }, 30000);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (!data.t || !data.d) return;

  let presence;
  if (data.t === "INIT_STATE") presence = data.d[DISCORD_ID];
  else if (data.t === "PRESENCE_UPDATE") presence = data.d;
  else return;

  if (!presence?.discord_user) {
    usernameEl.textContent = "N/A";
    avatarEl.src = "https://via.placeholder.com/100?text=?";
    statusEl.innerHTML = "";
    activityEl.textContent = "No activity";
    spotifyInfo.innerHTML = "";
    return;
  }

  const user = presence.discord_user;
  usernameEl.textContent = user.username;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  showStatusIcon(presence.discord_status || "offline");

  const firstActivity = (presence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = firstActivity ? `Activity: ${firstActivity.name}` : "No activity";

  // Suche nach Musikaktivität (Spotify, Apple Music, etc.)
  const musicActivity = (presence.activities || []).find(act =>
    act && ["Spotify", "Apple Music", "Windows Media Player", "Cider"].includes(act.name)
  );

  if (musicActivity) {
    // Falls Spotify, nutze den speziellen Spotify-Datenpfad mit album_art_url
    if (presence.listening_to_spotify && presence.spotify) {
      spotifyInfo.innerHTML = `
        <img src="${presence.spotify.album_art_url}" alt="Album Art" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">
        <p style="margin: 0.5em 0 0; font-weight: bold;">${presence.spotify.song}</p>
        <p style="margin: 0;">${presence.spotify.artist}</p>
      `;
    } 
    // Für andere Musikdienste wie Apple Music
    else if (musicActivity.name === "Apple Music" && musicActivity.assets && musicActivity.timestamps) {
      // Coverbild aus large_image (Discord gibt oft "spotify:album:albumID" oder Pfade zurück), hier versuchen wir die URL richtig darzustellen
      let cover = null;
      const rawImageUrl = musicActivity.assets.large_image;
      if (rawImageUrl) {
        if (rawImageUrl.startsWith("/https/")) {
          cover = "https://" + rawImageUrl.substring(7);
        } else if (rawImageUrl.startsWith("https://")) {
          cover = rawImageUrl;
        }
      }

      // Titel und Künstler aus details und state
      const title = musicActivity.details || "";
      const artist = musicActivity.state || "";

      spotifyInfo.innerHTML = `
        ${cover ? `<img src="${cover}" alt="Album Art" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">` : ""}
        <p style="margin: 0.5em 0 0; font-weight: bold;">${title}</p>
        <p style="margin: 0;">${artist}</p>
      `;
    } 
    // Fallback für andere unterstützte Player (ohne Spotify-Datenstruktur)
    else {
      let cover = null;
      const rawImageUrl = musicActivity.assets?.large_image;
      if (rawImageUrl) {
        if (rawImageUrl.startsWith("/https/")) {
          cover = "https://" + rawImageUrl.substring(7);
        } else if (rawImageUrl.startsWith("https://")) {
          cover = rawImageUrl;
        }
      }

      const title = musicActivity.details || "Unknown Title";
      const artist = musicActivity.state || "Unknown Artist";

      spotifyInfo.innerHTML = `
        ${cover ? `<img src="${cover}" alt="Album Art" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">` : ""}
        <p style="margin: 0.5em 0 0; font-weight: bold;">${title}</p>
        <p style="margin: 0;">${artist}</p>
      `;
    }

  } else {
    // Keine Musikaktivität
    spotifyInfo.innerHTML = "Not listening to music right now";
  }
};
