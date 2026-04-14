const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// ── Index: word → Set<sentence> (Set = otomatik deduplication) ──
const index = new Map();

// ── Basit result cache (max 1000 sorgu) ──
const cache = new Map();

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Zäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1);
}

function buildIndex() {
  console.log("Index building...");
  let sentenceCount = 0;

  for (let i = 1; i <= 96; i++) {
    const filePath = path.join(__dirname, "data", `sentences_${i}.json`);
    if (!fs.existsSync(filePath)) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      console.warn(`Skipping sentences_${i}.json (parse error)`);
      continue;
    }

    for (const s of data) {
      const text = s.t;
      if (!text || typeof text !== "string") continue;
      sentenceCount++;

      for (const word of tokenize(text)) {
        if (!index.has(word)) index.set(word, new Set());
        index.get(word).add(text);
      }
    }
  }

  console.log(`Index ready: ${index.size} words across ~${sentenceCount} sentences`);
}

buildIndex();

function search(rawQuery) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  // Cache hit
  if (cache.has(q)) return cache.get(q);

  const resultSet = new Set();

  // 1) Exact word match
  const exact = index.get(q);
  if (exact) {
    for (const s of exact) {
      resultSet.add(s);
      if (resultSet.size >= 5) break;
    }
  }

  // 2) Prefix match — sadece exact yetersizse ve sorgu >= 3 harf ise
  if (resultSet.size < 5 && q.length >= 3) {
    for (const [word, sentences] of index) {
      if (word !== q && word.startsWith(q)) {
        for (const s of sentences) {
          resultSet.add(s);
          if (resultSet.size >= 5) break;
        }
      }
      if (resultSet.size >= 5) break;
    }
  }

  const results = Array.from(resultSet).slice(0, 5);

  // Cache'e yaz (LRU benzeri: max 1000, sonra en eski silinir)
  if (cache.size >= 1000) cache.delete(cache.keys().next().value);
  cache.set(q, results);

  return results;
}

// ── Endpoints ──
app.get("/search", (req, res) => {
  const q = req.query.q || "";
  res.json(search(q));
});

// Render cold-start için health check
app.get("/ping", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});