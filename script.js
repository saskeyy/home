const DISCORD_ID = "446226718844256266";

const avatarEl = document.getElementById("avatar");
const usernameEl = document.getElementById("username");
const statusEl = document.getElementById("status-icon");
const activityEl = document.getElementById("activity");
const spotifyContainer = document.getElementById("spotifyContainer");
const spotifyInfo = document.getElementById("spotifyInfo");
const copyBtn = document.getElementById("copyBtn");
const faviconEl = document.getElementById("favicon");
const copyNotification = document.getElementById("copyNotification");
const leftArrow = document.getElementById("leftArrow");
const rightArrow = document.getElementById("rightArrow");

const backgrounds = [
  "https://wallpapercave.com/wp/wp12265613.jpg",
  "https://wallpapercave.com/wp/wp12265678.jpg",
  "https://wallpapercave.com/wp/wp12265576.png"
];

let currentBackgroundIndex = 0;
let isAnimating = false;

leftArrow.onclick = () => {
  if (isAnimating) return;
  isAnimating = true;
  currentBackgroundIndex = (currentBackgroundIndex - 1 + backgrounds.length) % backgrounds.length;
  document.body.style.backgroundImage = `url("${backgrounds[currentBackgroundIndex]}")`;
  setTimeout(() => {
    isAnimating = false;
  }, 570);
};

rightArrow.onclick = () => {
  if (isAnimating) return;
  isAnimating = true;
  currentBackgroundIndex = (currentBackgroundIndex + 1) % backgrounds.length;
  document.body.style.backgroundImage = `url("${backgrounds[currentBackgroundIndex]}")`;
  setTimeout(() => {
    isAnimating = false;
  }, 570);
};

const statusColors = {
  online: "#43b581",
  idle: "#faa61a",
  dnd: "#f04747",
  offline: "#747f8d"
};

function showStatusIcon(status) {
  const color = statusColors[status] || statusColors.offline;
  statusEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${color}">ircle cx="12" cy="12" r="10"/></svg>`;
  statusEl.style.backgroundColor = color;
}

copyBtn.title = "Copy username";
copyBtn.onclick = () => {
  if (usernameEl.textContent && usernameEl.textContent !== "Loading..." && usernameEl.textContent !== "N/A") {
    navigator.clipboard.writeText(usernameEl.textContent).then(() => {
      copyNotification.textContent = "✅ Copied!";
      copyNotification.classList.add("show");
      setTimeout(() => {
        copyNotification.classList.remove("show");
      }, 1500);
    });
  }
};

function parseAlbumArtUrl(rawImageUrl) {
  if (!rawImageUrl) return null;

  let albumArtUrl = "";

  const indicatorHttps = "/https/";
  const idxHttps = rawImageUrl.indexOf(indicatorHttps);
  if (idxHttps !== -1) {
    albumArtUrl = "https://" + rawImageUrl.substring(idxHttps + 7);
    return albumArtUrl;
  }

  if (rawImageUrl.startsWith("https://") || rawImageUrl.startsWith("http://")) {
    return rawImageUrl;
  }

  if (rawImageUrl.startsWith("mp:")) {
    albumArtUrl = "https://media.discordapp.net/" + rawImageUrl;
    return albumArtUrl;
  }

  if (rawImageUrl.startsWith("/")) {
    albumArtUrl = "https://cdn.discordapp.com" + rawImageUrl;
    return albumArtUrl;
  }

  return null;
}

function formatDuration(ms) {
  if (!ms) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getCurrentDuration(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const now = Date.now();
  const elapsed = Math.max(0, now - startTime);
  const total = endTime - startTime;
  const elapsedSec = Math.floor(elapsed / 1000);
  const totalSec = Math.floor(total / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedS = elapsedSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const totalS = totalSec % 60;
  
  const percentage = (elapsed / total) * 100;
  
  return {
    current: `${elapsedMin}:${elapsedS.toString().padStart(2, '0')}`,
    total: `${totalMin}:${totalS.toString().padStart(2, '0')}`,
    progress: Math.min(100, Math.max(0, percentage))
  };
}

let musicActivityData = null;
let presenceData = null;

const ws = new WebSocket("wss://api.lanyard.rest/socket");

ws.onopen = () => {
  ws.send(JSON.stringify({ op: 2, d: { subscribe_to_ids: [DISCORD_ID] } }));
  setInterval(() => {
    if (ws.readyState === 1) ws.send(JSON.stringify({ op: 3 }));
  }, 30000);

  setInterval(() => {
    if (musicActivityData && presenceData) {
      updateMusicDisplay(musicActivityData, presenceData);
    }
  }, 500);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (!data.t || !data.d) return;

  let presence;
  if (data.t === "INIT_STATE") presence = data.d[DISCORD_ID];
  else if (data.t === "PRESENCE_UPDATE") presence = data.d;
  else return;

  presenceData = presence;

  if (!presence?.discord_user) {
    usernameEl.textContent = "N/A";
    avatarEl.src = "https://via.placeholder.com/100?text=?";
    statusEl.innerHTML = "";
    activityEl.textContent = "No activity";
    spotifyInfo.innerHTML = "Not listening to music right now";
    musicActivityData = null;
    return;
  }

  const user = presence.discord_user;
  usernameEl.textContent = user.username;
  const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  avatarEl.src = avatarUrl;
  
  faviconEl.href = avatarUrl;
  
  const status = presence.discord_status || "offline";
  console.log("Discord Status:", status);
  showStatusIcon(status);

  const firstActivity = (presence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = firstActivity ? `Activity: ${firstActivity.name}` : "No activity";

  const musicActivity = (presence.activities || []).find(act =>
    act && ["Spotify", "Apple Music", "Windows Media Player", "Cider", "iTunes"].includes(act.name)
  );

  if (musicActivity) {
    musicActivityData = musicActivity;
    updateMusicDisplay(musicActivity, presence);
  } else {
    spotifyInfo.innerHTML = "Not listening to music right now";
    spotifyInfo.className = "";
    musicActivityData = null;
  }
};

function updateMusicDisplay(musicActivity, presence) {
  let cover = null;
  let title = null;
  let artist = null;
  let album = null;
  let durationInfo = null;

  if (presence.listening_to_spotify && presence.spotify) {
    cover = presence.spotify.album_art_url;
    title = presence.spotify.song;
    artist = presence.spotify.artist;
    album = presence.spotify.album;
    const start = presence.spotify.start_timestamp || 0;
    const end = presence.spotify.end_timestamp || 0;
    durationInfo = getCurrentDuration(start, end);
  } 
  else {
    title = musicActivity.details || null;
    artist = musicActivity.state || null;
    
    if (musicActivity.assets?.large_text) {
      album = musicActivity.assets.large_text;
    }
    
    if (musicActivity.timestamps?.start && musicActivity.timestamps?.end) {
      durationInfo = getCurrentDuration(musicActivity.timestamps.start, musicActivity.timestamps.end);
    } else if (musicActivity.timestamps?.end) {
      const totalMs = musicActivity.timestamps.end - (musicActivity.timestamps.start || Date.now());
      durationInfo = {
        current: "0:00",
        total: formatDuration(totalMs),
        progress: 0
      };
    }

    if (musicActivity.assets?.large_image) {
      const rawImageUrl = musicActivity.assets.large_image;
      cover = parseAlbumArtUrl(rawImageUrl);
    }
  }

  let html = "";
  
  if (cover) {
    html += `<img src="${cover}" alt="Album Art" style="border-radius: 6px;">`;
  }
  
  if (title || artist || album || durationInfo) {
    html += `<div class="track-info">`;
    if (title) html += `<p class="track-name">${title}</p>`;
    if (artist) html += `<p class="track-artist">${artist}</p>`;
    if (album) html += `<p class="track-album">${album}</p>`;
    if (durationInfo) {
      html += `<div class="track-duration-bar">`;
      html += `<span class="track-time">${durationInfo.current}</span>`;
      html += `<div class="progress-bar"><div class="progress-fill" style="width: ${durationInfo.progress}%"></div></div>`;
      html += `<span class="track-time-right">${durationInfo.total}</span>`;
      html += `</div>`;
    }
    html += `</div>`;
  }

  if (html) {
    spotifyInfo.innerHTML = html;
    spotifyInfo.className = "spotify-track-container";
  } else {
    spotifyInfo.innerHTML = "Listening to music";
    spotifyInfo.className = "";
  }
}

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
