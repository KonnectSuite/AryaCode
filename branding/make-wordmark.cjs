const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

const KIT = process.argv[2];
const OUT = process.argv[3];
const font = opentype.loadSync(path.join(KIT, 'sources', 'fonts', 'Sora-Variable.ttf'));

const size = 100;
const tracking = -2.5;
function run(text) {
  const p = new opentype.Path();
  let x = 0;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    p.extend(g.getPath(x, 0, size));
    x += (g.advanceWidth / font.unitsPerEm) * size + tracking;
  }
  return { path: p, d: p.toPathData(2), width: x - tracking };
}
const first = run('Arya');
const second = run('Code');
const offset = first.width + 1;

// Union of the real glyph bounds, so descenders are inside the frame.
const a = first.path.getBoundingBox();
const b = second.path.getBoundingBox();
const minX = Math.min(a.x1, b.x1 + offset);
const maxX = Math.max(a.x2, b.x2 + offset);
const minY = Math.min(a.y1, b.y1);
const maxY = Math.max(a.y2, b.y2);
const pad = size * 0.04;
const vbX = minX - pad, vbY = minY - pad;
const vbW = (maxX - minX) + pad * 2, vbH = (maxY - minY) + pad * 2;

function svg(firstColor, secondFill) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vbX.toFixed(2) + ' ' + vbY.toFixed(2) + ' ' + vbW.toFixed(2) + ' ' + vbH.toFixed(2) + '" role="img" aria-label="AryaCode">\n'
    + '  <defs>\n'
    + '    <linearGradient id="aryacode-word" x1="0" y1="0" x2="1" y2="0">\n'
    + '      <stop offset="0" stop-color="#2B6CFF"/>\n'
    + '      <stop offset="1" stop-color="#00E0D2"/>\n'
    + '    </linearGradient>\n'
    + '  </defs>\n'
    + '  <path d="' + first.d + '" fill="' + firstColor + '"/>\n'
    + '  <path d="' + second.d + '" transform="translate(' + offset.toFixed(2) + ' 0)" fill="' + secondFill + '"/>\n'
    + '</svg>\n';
}
fs.writeFileSync(path.join(OUT, 'aryacode-wordmark-light.svg'), svg('#171D26', 'url(#aryacode-word)'));
fs.writeFileSync(path.join(OUT, 'aryacode-wordmark-dark.svg'), svg('#E6E8EB', 'url(#aryacode-word)'));
// Path data for inlining in the client component.
fs.writeFileSync(path.join(OUT, 'paths.json'), JSON.stringify({
  viewBox: [vbX, vbY, vbW, vbH].map(n => +n.toFixed(2)),
  offset: +offset.toFixed(2),
  first: first.d,
  second: second.d,
}, null, 2));
console.log('viewBox', [vbX, vbY, vbW, vbH].map(n => n.toFixed(1)).join(' '));