/**
 * Elroco Block Logo Image Generator
 * Run with: node generate-logos.js
 * Requires: npm install puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = './public/logos';

const SIZES = [
  { key: 'xl',  fontSize: 100, radius: 22, padL: 38, padR: 38, padT: 16, padB: 28, label: 'XL - Extra Large' },
  { key: 'lg',  fontSize: 80,  radius: 18, padL: 30, padR: 30, padT: 13, padB: 22, label: 'LG - Large' },
  { key: 'md',  fontSize: 56,  radius: 14, padL: 22, padR: 22, padT: 10, padB: 17, label: 'MD - Medium' },
  { key: 'sm',  fontSize: 38,  radius: 10, padL: 16, padR: 16, padT:  7, padB: 12, label: 'SM - Small' },
  { key: 'xs',  fontSize: 24,  radius:  7, padL: 10, padR: 10, padT:  4, padB:  8, label: 'XS - Extra Small' },
  { key: 'xxs', fontSize: 16,  radius:  5, padL:  7, padR:  7, padT:  3, padB:  6, label: 'XXS - Micro' },
];

const VARIANTS = [
  { key: 'red',   bg: '#CC0000', elro: '#111111', co: '#ffffff' },
  { key: 'black', bg: '#000000', elro: '#ffffff', co: '#CC0000' },
];

function getHTML(size, variant) {
  const strokePx = Math.max(1, size.fontSize / 18);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Michroma&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: fit-content;
    height: fit-content;
    background: transparent;
  }
  .block {
    background: ${variant.bg};
    border-radius: ${size.radius}px;
    padding: ${size.padT}px ${size.padR}px ${size.padB}px ${size.padL}px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .wordmark {
    font-family: 'Michroma', sans-serif;
    font-size: ${size.fontSize}px;
    line-height: 0.85;
    white-space: nowrap;
    display: flex;
    align-items: center;
  }
  .elro {
    color: ${variant.elro};
    -webkit-text-stroke: ${strokePx}px ${variant.elro};
  }
  .co {
    color: ${variant.co};
    -webkit-text-stroke: ${strokePx}px ${variant.co};
  }
</style>
</head>
<body>
  <div class="block">
    <div class="wordmark">
      <span class="elro">ELRO</span><span class="co">CO</span>
    </div>
  </div>
</body>
</html>`;
}

async function generateLogos() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 2000, height: 1000, deviceScaleFactor: 2 });

  // Warm up: load Google Fonts once so it's cached for all subsequent renders
  await page.goto('https://fonts.googleapis.com/css2?family=Michroma&display=swap', { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});

  let count = 0;

  for (const variant of VARIANTS) {
    for (const size of SIZES) {
      const html = getHTML(size, variant);
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Wait for font to render
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Get element dimensions
      const element = await page.$('.block');
      const box = await element.boundingBox();

      const filename = `elroco-block-${variant.key}-${size.key}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await page.screenshot({
        path: filepath,
        clip: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        },
        omitBackground: true
      });

      console.log(`✓ ${filename} (${Math.round(box.width * 2)}x${Math.round(box.height * 2)}px @2x)`);
      count++;
    }
  }

  await browser.close();

  console.log(`\nDone! ${count} images saved to ${OUTPUT_DIR}/`);
  console.log('\nFiles generated:');
  fs.readdirSync(OUTPUT_DIR).forEach(f => console.log(`  - ${f}`));
}

generateLogos().catch(console.error);
