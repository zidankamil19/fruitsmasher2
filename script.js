const SCRIPT_URL = "PASTE_WEB_APP_URL_DI_SINI";

let username = "";
let whatsapp = "";
let score = 0;
let gameInterval;
let isGameRunning = false;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Item Config
const ITEM_TYPES = [
  { symbol: "🍎", pts: 10, type: "fruit", color: "#ff4d4d" },
  { symbol: "🍊", pts: 10, type: "fruit", color: "#ffa64d" },
  { symbol: "🍉", pts: 15, type: "fruit", color: "#2ebd59" },
  { symbol: "🍓", pts: 15, type: "fruit", color: "#ff3366" },
  { symbol: "🌟", pts: 35, type: "bonus", color: "#ffd700" }, // Rare Item
  { symbol: "💣", pts: -20, type: "bomb", color: "#888" }    // Obstacle
];

let items = [];
let particles = [];
let floatingTexts = [];

// Class Objek Item
class Item {
  constructor() {
    // Acak tipe item (Bom 15%, Bonus 10%, Sisanya Buah Biasa)
    let rand = Math.random();
    if (rand < 0.15) {
      this.data = ITEM_TYPES[5]; // Bom
    } else if (rand < 0.25) {
      this.data = ITEM_TYPES[4]; // Bonus
    } else {
      this.data = ITEM_TYPES[Math.floor(Math.random() * 4)];
    }

    this.size = 40;
    this.x = Math.random() * (canvas.width - this.size * 2) + this.size;
    this.y = -this.size;
    this.speedY = Math.random() * 1.5 + 2.5 + (score / 150); // Makin cepat seiring waktu
    this.angle = 0;
    this.rotationSpeed = (Math.random() - 0.5) * 0.08;
  }

  update() {
    this.y += this.speedY;
    this.angle += this.rotationSpeed;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.font = `${this.size}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Glow Effect untuk Bonus
    if (this.data.type === "bonus") {
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 15;
    }

    ctx.fillText(this.data.symbol, 0, 0);
    ctx.restore();
  }
}

// Class Animasi Partikel (Splash & Explosion)
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 4 + 2;
    this.speedX = (Math.random() - 0.5) * 8;
    this.speedY = (Math.random() - 0.5) * 8;
    this.alpha = 1;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.alpha -= 0.03;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// Class Teks Melayang (+10, -20)
class FloatingText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.alpha = 1;
  }

  update() {
    this.y -= 1.5;
    this.alpha -= 0.02;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.font = "bold 18px Poppins";
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// --- Event Input ---
canvas.addEventListener("mousedown", (e) => handleTouch(e.clientX, e.clientY));
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleTouch(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

function handleTouch(clientX, clientY) {
  if (!isGameRunning) return;

  let rect = canvas.getBoundingClientRect();
  let touchX = clientX - rect.left;
  let touchY = clientY - rect.top;

  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    let dist = Math.hypot(touchX - item.x, touchY - item.y);

    if (dist < item.size) {
      // Hit!
      score += item.data.pts;
      if (score < 0) score = 0;
      document.getElementById("scoreDisplay").innerText = "SCORE: " + score;

      // Buat Efek Partikel
      for (let p = 0; p < 12; p++) {
        particles.push(new Particle(item.x, item.y, item.data.color));
      }

      // Buat Teks Melayang
      let txt = item.data.pts > 0 ? `+${item.data.pts}` : `${item.data.pts}`;
      floatingTexts.push(new FloatingText(txt, item.x, item.y, item.data.color));

      // Jika Kena Bom -> Shake Screen
      if (item.data.type === "bomb") {
        canvas.classList.add("shake");
        setTimeout(() => canvas.classList.remove("shake"), 300);
      }

      items.splice(i, 1);
      break;
    }
  }
}

// --- Loop Utama Game ---
function updateGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawning Rate
  if (Math.random() < 0.04) {
    items.push(new Item());
  }

  // Update & Gambar Items
  for (let i = items.length - 1; i >= 0; i--) {
    let item = items[i];
    item.update();
    item.draw();

    // Cek Jika Jatuh Melewati Batas
    if (item.y > canvas.height + item.size) {
      if (item.data.type !== "bomb") {
        // Game Over Jika Buah / Bonus Lolos
        endGame();
        return;
      }
      items.splice(i, 1);
    }
  }

  // Update & Gambar Partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.draw();
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Update & Gambar Teks Melayang
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.update();
    ft.draw();
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

function startGame() {
  username = document.getElementById("username").value.trim();
  whatsapp = document.getElementById("whatsapp").value.trim();

  if (!username || !whatsapp) {
    alert("Isi Username dan No WhatsApp terlebih dahulu!");
    return;
  }

  document.getElementById("loginMenu").style.display = "none";
  document.getElementById("gameArea").style.display = "block";
  
  score = 0;
  items = [];
  particles = [];
  floatingTexts = [];
  document.getElementById("scoreDisplay").innerText = "SCORE: 0";
  
  isGameRunning = true;
  gameInterval = setInterval(updateGame, 1000 / 60); // Smooth 60 FPS
}

function endGame() {
  isGameRunning = false;
  clearInterval(gameInterval);

  // Overlay Efek Game Over
  ctx.fillStyle = "rgba(15, 12, 32, 0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#ff3366";
  ctx.font = "800 26px Poppins";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);

  ctx.fillStyle = "#fff";
  ctx.font = "16px Poppins";
  ctx.fillText("Menyimpan Skor...", canvas.width / 2, canvas.height / 2 + 25);

  saveData(username, whatsapp, score);
}

function saveData(user, wa, finalScore) {
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "saveScore",
      username: user,
      whatsapp: wa,
      score: finalScore,
    }),
  }).then(() => {
    fetchLeaderboard();
    document.getElementById("loginMenu").style.display = "block";
    document.getElementById("gameArea").style.display = "none";
  }).catch(() => {
    alert("Gagal koneksi ke server, tapi game tetap di-reset.");
    document.getElementById("loginMenu").style.display = "block";
    document.getElementById("gameArea").style.display = "none";
  });
}

function fetchLeaderboard() {
  fetch(SCRIPT_URL)
    .then((res) => res.json())
    .then((data) => {
      let tbody = document.getElementById("leaderboardBody");
      tbody.innerHTML = "";
      if (!data || data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>Belum ada data.</td></tr>";
        return;
      }
      data.forEach((item, index) => {
        tbody.innerHTML += `<tr><td>${index + 1}</td><td>${item.username}</td><td>${item.score}</td></tr>`;
      });
    })
    .catch(() => {
      document.getElementById("leaderboardBody").innerHTML =
        "<tr><td colspan='3'>Gagal memuat leaderboard.</td></tr>";
    });
}

fetchLeaderboard();
