const DISCORD_ID = "446226718844256266";

const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("username");
const statusEl = document.getElementById("status-icon");
const activityEl = document.getElementById("activity");
const copyBtn = document.getElementById("copyBtn");
const spotifyBox = document.getElementById("spotifyContainer");
const spotifyContent = document.getElementById("spotifyInfo");

let userPresence = null;

function getTextColor(bgColor) {
  const [r, g, b] = bgColor.match(/\d+/g).map(Number);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 128 ? "#000" : "#fff";
}

function hexContrast(hex1, hex2) {
  const toRGB = (hex) => {
    const val = parseInt(hex.slice(1), 16);
    return [(val >> 16) & 255, (val >> 8) & 255, val & 255];
  };
  const [r1, g1, b1] = toRGB(hex1);
  const [r2, g2, b2] = toRGB(hex2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function extractMainColor(imgUrl, callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imgUrl;
  img.onload = () => {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    c.width = img.width;
    c.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, samples = 0;
    for (let i = 0; i < data.length; i += 40) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; samples++;
    }
    r = Math.floor(r / samples);
    g = Math.floor(g / samples);
    b = Math.floor(b / samples);
    callback(`rgb(${r}, ${g}, ${b})`);
  };
}

function showStatusIcon(state) {
  const icons = {
    online: "#43b581",
    idle: "#faa61a",
    dnd: "#f04747",
    offline: "#747f8d",
  };
  statusEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${icons[state] || icons.offline}"><circle cx="12" cy="12" r="10"/></svg>`;
}

copyBtn.onclick = () => {
  if (userPresence?.discord_user?.username) {
    navigator.clipboard.writeText(userPresence.discord_user.username).then(() => {
      copyBtn.textContent = "✅";
      setTimeout(() => (copyBtn.textContent = "📋"), 1500);
    });
  }
};

const ws = new WebSocket("wss://api.lanyard.rest/socket");

ws.onopen = () => {
  ws.send(JSON.stringify({ op: 2, d: { subscribe_to_ids: [DISCORD_ID] } }));
  setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ op: 3 })), 30000);
};

ws.onmessage = ({ data }) => {
  const { t, d } = JSON.parse(data);
  if (!t || !d) return;

  userPresence = t === "INIT_STATE" ? d[DISCORD_ID] : d;

  if (!userPresence?.discord_user) {
    nameEl.textContent = "N/A";
    avatarEl.src = "https://via.placeholder.com/100?text=?";
    statusEl.innerHTML = "";
    activityEl.textContent = "";
    return;
  }

  const { username: name, id, avatar } = userPresence.discord_user;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  nameEl.textContent = name;
  showStatusIcon(userPresence.discord_status || "offline");

  const act = (userPresence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = act ? `Activity: ${act.name}` : "No activity";

  if (userPresence.listening_to_spotify && userPresence.spotify) {
    const { song, artist, album_art_url, track_id } = userPresence.spotify;
    window.updateThreeWithSpotifyArt?.(album_art_url);
    spotifyContent.innerHTML = `
      <div class="spotify-track">
        <img src="${album_art_url}" alt="Cover">
        <div class="track-name">${song}</div>
        <div class="track-artist">${artist}</div>
        <iframe class="spotify-embed" src="https://open.spotify.com/embed/track/${track_id}"
          width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
      </div>
    `;

    extractMainColor(album_art_url, (color) => {
      const textColor = getTextColor(color);
      spotifyBox.style.backgroundColor = color;
      spotifyBox.style.color = textColor;
      const nameBox = spotifyBox.querySelector(".track-name");
      const artistBox = spotifyBox.querySelector(".track-artist");
      if (nameBox) nameBox.style.color = textColor;
      if (artistBox) artistBox.style.color = textColor;

      const card = document.querySelector(".card");
      if (card) {
        card.style.backgroundColor = color;
        card.style.color = textColor;
      }
    });
  } else {
    spotifyContent.innerHTML = "Not listening to Spotify right now.";
    [spotifyBox, document.querySelector(".card")].forEach(el => {
      if (el) {
        el.style.backgroundColor = "";
        el.style.color = "";
        ["track-name", "track-artist"].forEach(cls => {
          const txtEl = el.querySelector(`.${cls}`);
          if (txtEl) txtEl.style.color = "";
        });
      }
    });
  }
};
