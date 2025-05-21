const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();

app.use(express.json({ limit: '10mb' }));

app.post('/render', async (req, res) => {
  const { html, title, image, bg, vector } = req.body;
  if (!html) return res.status(400).send('Missing HTML');

  try {
    const compiled = html
      .replace('{{TITLE}}', title || '')
      .replace('{{IMAGE}}', image || '')
      .replace('{{BG}}', bg || '')
      .replace('{{VECTOR}}', vector || '');

    const tempFile = path.join(__dirname, 'temp.html');
    fs.writeFileSync(tempFile, compiled);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], executablePath: puppeteer.executablePath() });
    const page = await browser.newPage();
    await page.goto('file://' + tempFile);
    const buffer = await page.screenshot({ type: 'webp' });
    await browser.close();

    res.set('Content-Type', 'image/webp');
    res.send(buffer);
  } catch (err) {
    console.error('🔥 render fail:', err);
    res.status(500).send('Internal error');
  }
});

app.listen(3000, () => console.log('🔥 Ready on 3000'));