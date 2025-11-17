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
    spotifyInfo.textContent = "Not listening to music right now";
    spotifyContainer.style.display = "none";
    return;
  }

  const user = presence.discord_user;
  usernameEl.textContent = user.username;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  showStatusIcon(presence.discord_status || "offline");

  const firstActivity = (presence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = firstActivity ? `Activity: ${firstActivity.name}` : "No activity";

  // Musik Aktivität finden
  const musicActivity = (presence.activities || []).find(act =>
    act && ["Spotify", "Apple Music", "Windows Media Player", "Cider"].includes(act.name)
  );

  if (musicActivity) {
    let title = musicActivity.details || "Unknown Track";
    let artist = musicActivity.state || "Unknown Artist";
    let album = musicActivity.assets?.large_text || "";

    // Cover-URL extrahieren (funktioniert für alles)
    let cover = "";
    if (presence.listening_to_spotify && presence.spotify) {
      cover = presence.spotify.album_art_url;
    } else if (musicActivity.assets?.large_image) {
      const rawImageUrl = musicActivity.assets.large_image;
      if (rawImageUrl.startsWith("/https/")) {
        cover = "https://" + rawImageUrl.substring(7);
      } else if (rawImageUrl.startsWith("https://")) {
        cover = rawImageUrl;
      }
    }

    spotifyInfo.innerHTML = `
      ${title} – ${artist}<br>
      ${album ? `${album}<br>` : ""}
      ${cover ? `<img src="${cover}" alt="Album Art" style="max-width: 100%; border-radius: 8px; margin-top: 8px;">` : ""}
    `;

    spotifyContainer.style.display = "block";
  } else {
    spotifyInfo.textContent = "Not listening to music right now";
    spotifyContainer.style.display = "none";
  }
};
