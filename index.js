const express = require("express");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const index = new Map();
const cache = new Map();

function tokenize(text) {
  return text
    .toLowerCase()
    // Almanca karakterleri koruyarak kelimeleri ayıkla
    .replace(/[^a-zA-Zäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function buildIndex() {
  console.log("Index building from compressed CSV...");
  
  // Klasör yoluna dikkat: data/sentences.csv.gz
  const filePath = path.join(__dirname, "data", "sentences.csv.gz");
  
  if (!fs.existsSync(filePath)) {
    console.error("Hata: data/sentences.csv.gz bulunamadı! Lütfen yolu kontrol et.");
    return;
  }

  try {
    const compressedBuffer = fs.readFileSync(filePath);
    const decompressedData = zlib.gunzipSync(compressedBuffer).toString("utf-8");

    const lines = decompressedData.split("\n");
    let sentenceCount = 0;

    for (const line of lines) {
      // .strip() yerine .trim() kullanıldı
      const text = line.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      if (!text) continue;
      
      sentenceCount++;

      // Kelimeleri indexle
      const words = tokenize(text);
      for (const word of words) {
        if (!index.has(word)) index.set(word, new Set());
        index.get(word).add(text);
      }
    }

    console.log(`Index ready: ${index.size} words across ${sentenceCount} sentences`);
  } catch (err) {
    console.error("Index oluşturulurken hata çıktı:", err);
  }
}

// Sunucu başlamadan önce indexi kur
buildIndex();

function search(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  if (cache.has(q)) return cache.get(q);

  const resultSet = new Set();

  // 1) Tam eşleşme (Exact match) - En hızlısı
  const exact = index.get(q);
  if (exact) {
    for (const s of exact) {
        resultSet.add(s);
        if (resultSet.size >= 5) break;
    }
  }

  // 2) Kısmi eşleşme (Partial match) - Sadece sonuç azsa çalışır
  if (resultSet.size < 5) {
    let checked = 0;
    for (const [word, sentences] of index) {
      if (word.startsWith(q)) {
        for (const s of sentences) {
          resultSet.add(s);
          if (resultSet.size >= 5) break;
        }
      }
      if (resultSet.size >= 5) break;

      checked++;
      if (checked > 5000) break; 
    }
  }

  const results = Array.from(resultSet).slice(0, 5);

  // Cache yönetimi
  cache.set(q, results);
  if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
  }

  return results;
}

app.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.json(search(q));
});

app.get("/ping", (req, res) => res.json({ ok: true, count: index.size }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});