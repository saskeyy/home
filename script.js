const DISCORD_ID = "446226718844256266";

const avatarEl = document.getElementById("avatar");
const nameEl = document.getElementById("username");
const statusEl = document.getElementById("status-icon");
const activityEl = document.getElementById("activity");
const copyBtn = document.getElementById("copyBtn");
const musicBox = document.getElementById("musicContainer");
const musicContent = document.getElementById("musicInfo");

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

window.updateThreeWithMusicArt = window.updateThreeWithMusicArt || function () {};

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
    musicContent.textContent = "Not listening to music right now";
    return;
  }

  const { username: name, id, avatar } = userPresence.discord_user;
  avatarEl.src = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`;
  nameEl.textContent = name;
  showStatusIcon(userPresence.discord_status || "offline");

  const act = (userPresence.activities || []).find(a => a.name && a.name !== "Custom Status");
  activityEl.textContent = act ? `Activity: ${act.name}` : "No activity";

  // Apple Music Erkennung
  const appleMusicActivity = (userPresence.activities || []).find(
    (act) => act.name === "Apple Music" || act.name === "iTunes"
  );

  if (appleMusicActivity) {
    const { details: song, state: artist, assets } = appleMusicActivity;
    const album = assets?.large_text || "";
    const albumArtUrl = assets?.large_image ? `https://cdn.discordapp.com/app-assets/1155948779563610172/${assets.large_image}.png` : "";

    window.updateThreeWithMusicArt(albumArtUrl);

    musicContent.innerHTML = '';
    musicContent.innerHTML = `
      <div class="music-info">
        <img src="${albumArtUrl}" alt="Album Art" class="album-art" />
        <div class="music-text">
          <h3>${song}</h3>
          <p>${artist}</p>
          <p>${album}</p>
        </div>
      </div>
    `;

    musicBox.style.backgroundColor = "";
    musicBox.style.color = "";
  } else {
    musicContent.textContent = "Not listening to music right now";
    musicBox.style.backgroundColor = "";
    musicBox.style.color = "";
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
