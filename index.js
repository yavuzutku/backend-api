const express = require("express");
const app = express();

// test endpoint
app.get("/", (req, res) => {
  res.send("Backend çalışıyor 🚀");
});

// API endpoint
app.get("/api/cumle", (req, res) => {
  const query = req.query.q;

  console.log("Aranan:", query);

  // şimdilik fake veri dönüyoruz
  res.json({
    arama: query,
    sonuc: [
      "Ich gehe zur Schule.",
      "Er geht nach Hause."
    ]
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server çalışıyor");
});  