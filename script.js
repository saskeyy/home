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

function parseAlbumArtUrl(rawImageUrl) {
  if (!rawImageUrl) return null;

  let albumArtUrl = "";

  // Format 1: /https/ (externe URLs die escaped sind)
  const indicatorHttps = "/https/";
  const idxHttps = rawImageUrl.indexOf(indicatorHttps);
  if (idxHttps !== -1) {
    albumArtUrl = "https://" + rawImageUrl.substring(idxHttps + 7);
    return albumArtUrl;
  }

  // Format 2: Direct https:// or http://
  if (rawImageUrl.startsWith("https://") || rawImageUrl.startsWith("http://")) {
    return rawImageUrl;
  }

  // Format 3: mp: (Discord Media Proxy)
  if (rawImageUrl.startsWith("mp:")) {
    albumArtUrl = "https://media.discordapp.net/" + rawImageUrl;
    return albumArtUrl;
  }

  // Format 4: Relative URL (starts with /)
  if (rawImageUrl.startsWith("/")) {
    albumArtUrl = "https://cdn.discordapp.com" + rawImageUrl;
    return albumArtUrl;
  }

  return null;
}

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
    spotifyInfo.innerHTML = "Not listening to music right now";
    return;
  }

  const user = presence.discord_user;
  usernameEl.textContent = user.username;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  showStatusIcon(presence.discord_status || "offline");

  const firstActivity = (presence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = firstActivity ? `Activity: ${firstActivity.name}` : "No activity";

  // Musik-Aktivität erkennen (Spotify, Apple Music, etc.)
  const musicActivity = (presence.activities || []).find(act =>
    act && ["Spotify", "Apple Music", "Windows Media Player", "Cider", "iTunes"].includes(act.name)
  );

  if (musicActivity) {
    let cover = null;
    let title = null;
    let artist = null;

    // Spotify (spezielle Behandlung über listening_to_spotify)
    if (presence.listening_to_spotify && presence.spotify) {
      cover = presence.spotify.album_art_url;
      title = presence.spotify.song;
      artist = presence.spotify.artist;
    } 
    // Apple Music und andere Musik-Player
    else {
      // Titel und Artist aus details/state extrahieren
      title = musicActivity.details || null;
      artist = musicActivity.state || null;

      // Cover-Bild aus assets extrahieren und URL konvertieren
      if (musicActivity.assets?.large_image) {
        const rawImageUrl = musicActivity.assets.large_image;
        cover = parseAlbumArtUrl(rawImageUrl);
      }
    }

    // HTML für Musik-Anzeige generieren
    let html = "";
    if (cover) {
      html += `<img src="${cover}" alt="Album Art" style="max-width: 100%; border-radius: 8px; margin-top: 8px; display: block;">`;
    }
    if (title || artist) {
      html += `<div style="margin-top: 8px;">`;
      if (title) html += `<p style="margin: 4px 0; font-weight: bold; color: #fff;">${title}</p>`;
      if (artist) html += `<p style="margin: 4px 0; color: #aaa; font-size: 0.95em;">${artist}</p>`;
      html += `</div>`;
    }

    if (html) {
      spotifyInfo.innerHTML = html;
    } else {
      spotifyInfo.innerHTML = "Listening to music";
    }
  } else {
    spotifyInfo.innerHTML = "Not listening to music right now";
  }
};

ws.onerror = (error) => {
  console.error("WebSocket Error:", error);
  spotifyInfo.innerHTML = "Connection error";
};

ws.onclose = () => {
  console.log("WebSocket connection closed");
  setTimeout(() => {
    window.location.reload();
  }, 5000);
};
