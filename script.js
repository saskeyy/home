const DISCORD_ID = "446226718844256266";

const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("username");
const statusEl = document.getElementById("status-icon");
const activityEl = document.getElementById("activity");
const copyBtn = document.getElementById("copyBtn");
const spotifyBox = document.getElementById("spotifyContainer");
const spotifyContent = document.getElementById("spotifyInfo");

let userPresence = null;

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

window.updateThreeWithSpotifyArt = window.updateThreeWithSpotifyArt || function () {};

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
    avatarEl.src = "https://placehold.co/100x100?text=?";
    statusEl.innerHTML = "";
    activityEl.textContent = "";
    spotifyContent.textContent = "Not listening to music right now";
    return;
  }

  const { username: name, id, avatar } = userPresence.discord_user;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  nameEl.textContent = name;
  showStatusIcon(userPresence.discord_status || "offline");

  const act = (userPresence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = act ? `Activity: ${act.name}` : "No activity";

  if (userPresence.listening_to_spotify && userPresence.spotify) {
    const { album_art_url, track_id } = userPresence.spotify;
    window.updateThreeWithSpotifyArt(album_art_url);

    spotifyContent.innerHTML = '';
    spotifyContent.innerHTML = `
      <iframe class="spotify-embed" src="https://open.spotify.com/embed/track/${track_id}"
        width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
    `;

    spotifyBox.style.backgroundColor = "";
    spotifyBox.style.color = "";
  } else {
    spotifyContent.textContent = "Not listening to music right now";
    spotifyBox.style.backgroundColor = "";
    spotifyBox.style.color = "";
  }
};

document.getElementById('copyBtn').addEventListener('click', () => {
  const username = document.getElementById('username').textContent;
  navigator.clipboard.writeText(username).then(() => {
    alert('Username copied!');
  }).catch(() => {
    alert('Kopieren fehlgeschlagen.');
  });
});
