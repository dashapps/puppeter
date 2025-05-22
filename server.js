const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

function extractUrl(obj) {
  // если просто строка — возвращаем
  if (typeof obj === 'string') return obj;

  // если это Airtable attachment object
  if (obj?.url) {
    return (
      obj.thumbnails?.full?.url ||
      obj.thumbnails?.large?.url ||
      obj.thumbnails?.small?.url ||
      obj.url
    );
  }

  return '';
}

app.post('/render', async (req, res) => {
  try {
    let { html, title, image, bg, vector } = req.body;

    if (!html) return res.status(400).send('Missing HTML');

    // Вытаскиваем url, если прислали целиком объект из Airtable
    image = extractUrl(image);
    bg = extractUrl(bg);
    vector = extractUrl(vector);

    const compiled = html
      .replace('{{TITLE}}', title || '')
      .replace('{{IMAGE}}', image || '')
      .replace('{{BG}}', bg || '')
      .replace('{{VECTOR}}', vector || '');

    const tempFile = path.join(__dirname, 'temp.html');
    fs.writeFileSync(tempFile, compiled);

    // 🎯 Парсим размеры из HTML <style> → body
    const widthMatch = compiled.match(/body\s*{[^}]*width:\s*(\d+)px/);
    const heightMatch = compiled.match(/body\s*{[^}]*height:\s*(\d+)px/);
    const width = widthMatch ? parseInt(widthMatch[1], 10) : 1280;
    const height = heightMatch ? parseInt(heightMatch[1], 10) : 720;

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
      executablePath: puppeteer.executablePath()
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.goto('file://' + tempFile, { waitUntil: 'networkidle0' });

    const buffer = await page.screenshot({ type: 'webp' });
    await browser.close();

    res.set('Content-Type', 'image/webp');
    res.send(buffer);

  } catch (err) {
    console.error('🔥 Render fail:', err);
    res.status(500).send('Internal error: ' + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Ready on ${PORT}`));