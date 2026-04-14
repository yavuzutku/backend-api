const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// JSON endpoint
app.get("/sentences/:id", (req, res) => {
  const id = req.params.id;

  // güvenlik kontrolü (1-96 arası)
  if (id < 1 || id > 96) {
    return res.status(400).json({ error: "Invalid file id" });
  }

  const filePath = path.join(__dirname, "data", `sentences_${id}.json`);

  // dosya var mı kontrol
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "JSON read error", details: err.message });
  }
});

// test route
app.get("/", (req, res) => {
  res.send("Backend çalışıyor");
});

// PORT (Render için zorunlu)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server çalışıyor");
});