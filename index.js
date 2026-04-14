const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// 🔥 SUPER FAST INDEX
const index = new Map();

// kelime çıkarıcı
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Zäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// RAM'e yükle + index oluştur
function buildIndex() {
  console.log("Index building...");

  for (let i = 1; i <= 96; i++) {
    const filePath = path.join(__dirname, "data", `sentences_${i}.json`);
    if (!fs.existsSync(filePath)) continue;

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const s of data) {
      const text = s.t;
      if (!text) continue;

      const words = tokenize(text);

      for (const w of words) {
        if (!index.has(w)) index.set(w, []);
        index.get(w).push(text);
      }
    }
  }

  console.log("Index ready:", index.size, "words");
}

buildIndex();

// 🚀 ULTRA FAST SEARCH
app.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase();

  const results = index.get(q) || [];

  res.json(results.slice(0, 5));
});

app.listen(PORT, () => {
  console.log("Server running on", PORT);
});