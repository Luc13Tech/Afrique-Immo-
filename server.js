// ================================================
// AFRIQUE IMMO — server.js
// Sert correctement les fichiers statiques + API
// ================================================
const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Servir les fichiers statiques depuis le dossier courant ──
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css'))  res.setHeader('Content-Type', 'text/css');
    if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript');
    if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
  }
}));

app.use(express.json({ limit: '50mb' }));

// ── Dossier uploads ──
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// ── Toutes les routes renvoient index.html (SPA) ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏠 Afrique Immo running on port ${PORT}`);
});
