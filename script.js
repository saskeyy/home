document.addEventListener("DOMContentLoaded", () => {
  alert("AAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
});

const memeUrls = [
  "https://i.kym-cdn.com/photos/images/newsfeed/002/045/247/3ef.gif",
  "https://media.tenor.com/FbSKBzT3G2gAAAAd/yelling-cat.gif",
  "https://i.imgflip.com/4/5w3a.jpg",
  "https://i.kym-cdn.com/entries/icons/original/000/026/152/crying.jpg",
  "https://media.tenor.com/IMW2ztEdhPMAAAAC/aaa-cat.gif"
];

function spawnMeme() {
  const img = document.createElement("img");
  img.src = memeUrls[Math.floor(Math.random() * memeUrls.length)];
  img.className = "meme";
  img.style.left = Math.random() * window.innerWidth + "px";
  img.style.top = Math.random() * window.innerHeight + "px";
  document.body.appendChild(img);

  setTimeout(() => {
    img.remove();
  }, 6000);
}

setInterval(spawnMeme, 500);

setInterval(() => {
  const a = document.createElement("div");
  a.textContent = "A".repeat(100);
  a.style.position = "absolute";
  a.style.left = Math.random() * window.innerWidth + "px";
  a.style.top = Math.random() * window.innerHeight + "px";
  a.style.color = "white";
  a.style.fontSize = "20px";
  document.body.appendChild(a);
  setTimeout(() => a.remove(), 3000);
}, 300);
