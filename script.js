const userId = "446226718844256266";
const avatar = document.getElementById("avatar");
const username = document.getElementById("username");
const statusIcon = document.getElementById("status-icon");
const activity = document.getElementById("activity");
const copyBtn = document.getElementById("copyBtn");
const spotifyContainer = document.getElementById("spotifyContainer");
const spotifyInfo = document.getElementById("spotifyInfo");

let presence = null;

function updateStatus(status) {
  const svgs = {
    online: `<svg viewBox="0 0 24 24" fill="#43b581" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/></svg>`,
    idle: `<svg viewBox="0 0 24 24" fill="#faa61a" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    dnd: `<svg viewBox="0 0 24 24" fill="#f04747" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><rect x="7" y="11" width="10" height="2" fill="#000"/></svg>`,
    offline: `<svg viewBox="0 0 24 24" fill="#747f8d" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/></svg>`,
  };

  statusIcon.innerHTML = svgs[status] || svgs.offline;
}

copyBtn.addEventListener("click", () => {
  if (!presence || !presence.discord_user) return;

  const user = presence.discord_user;
  navigator.clipboard.writeText(user.username).then(() => {
    copyBtn.textContent = "✅";
    setTimeout(() => {
      copyBtn.textContent = "📋";
    }, 1500);
  }).catch(err => {
    console.error("Failed to copy username: ", err);
  });
});

const socket = new WebSocket("wss://api.lanyard.rest/socket");

socket.onopen = () => {
  console.log("WebSocket connection opened");
  socket.send(JSON.stringify({
    op: 2,
    d: {
      subscribe_to_ids: [userId],
    },
  }));

  setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ op: 3 }));
    }
  }, 30000);
};

socket.onmessage = (event) => {
  console.log("Message received:", event.data);
  const data = JSON.parse(event.data);
  if (!data.t || !data.d) return;

  if (data.t === "INIT_STATE") {
    presence = data.d[userId];
  } else if (data.t === "PRESENCE_UPDATE") {
    presence = data.d;
  } else {
    return;
  }

  if (!presence || !presence.discord_user) {
    username.textContent = "Benutzer nicht gefunden";
    statusIcon.innerHTML = "";
    activity.textContent = "Keine Aktivität";
    avatar.src = "https://via.placeholder.com/100?text=?";
    spotifyInfo.textContent = "Keine Spotify-Daten";
    return;
  }

  const user = presence.discord_user;
  avatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  username.textContent = user.username;

  updateStatus(presence.discord_status || "offline");

  if (presence.activities && presence.activities.length > 0) {
    const currentActivity = presence.activities.find(act => act.name && act.name !== "Custom Status");
    activity.textContent = currentActivity ? `Aktivität: ${currentActivity.name}` : "Keine Aktivität";
  } else {
    activity.textContent = "Keine Aktivität";
  }

  if (presence.listening_to_spotify) {
    const { song, artist, album_art_url, track_id } = presence.spotify;
    spotifyInfo.innerHTML = `
      <div class="spotify-track">
        <img src="${album_art_url}" alt="Album Art" />
        <div>
          <p class="track-name">${song}</p>
          <p class="track-artist">${artist}</p>
          <iframe class="spotify-embed"
            src="https://open.spotify.com/embed/track/${track_id}"
            width="100%" height="80" frameborder="0" allowtransparency="true"
            allow="encrypted-media"></iframe>
        </div>
      </div>
    `;
  } else {
    spotifyInfo.textContent = "Nicht auf Spotify aktiv";
  }
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
};

socket.onclose = () => {
  console.log("WebSocket connection closed");
};
