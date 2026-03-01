/**
 * ExportPanel.jsx
 * Export palettes as CSS variables, Tailwind config, SCSS, JSON, or paint list.
 */

import { useState, useMemo } from 'react';
import { Copy, Download, Check, Code, FileJson, Palette, FlaskConical, Braces } from 'lucide-react';
import { oklchToHex } from '../utils/colorUtils';
import { generateColorName } from '../utils/colorNames';

// ─── colour format helpers ────────────────────────────────────────────────────

function toHex(c) { return oklchToHex(c); }

function toRgb(c) {
  const hex = toHex(c);
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

function toHsl(c) {
  const hex = toHex(c);
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0;
  const l = (max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d + 2)/6; break;
      case b: h = ((r-g)/d + 4)/6; break;
    }
  }
  return `hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
}

function toOklchStr(c) {
  return `oklch(${(c.l*100).toFixed(1)}% ${(c.c).toFixed(3)} ${(c.h||0).toFixed(1)})`;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function contrastRatio(hex1, hex2) {
  const lum = hex => {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const lin = v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4);
    return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  };
  const l1 = lum(hex1), l2 = lum(hex2);
  const [lighter, darker] = l1>l2 ? [l1,l2] : [l2,l1];
  return (lighter+0.05)/(darker+0.05);
}

// ─── code generators ──────────────────────────────────────────────────────────

function generateCSS(colors, names) {
  const vars = colors.map((c,i) => {
    const slug = slugify(names[i] || `color-${i+1}`);
    return `  --color-${slug}: ${toHex(c)};`;
  });
  const rgbVars = colors.map((c,i) => {
    const slug = slugify(names[i] || `color-${i+1}`);
    const hex = toHex(c);
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `  --color-${slug}-rgb: ${r}, ${g}, ${b};`;
  });
  return `:root {\n  /* hex&hue palette export */\n${vars.join('\n')}\n\n  /* RGB channel values for rgba() usage */\n${rgbVars.join('\n')}\n}`;
}

function generateSCSS(colors, names) {
  const vars = colors.map((c,i) => {
    const slug = slugify(names[i] || `color-${i+1}`);
    return `$color-${slug}: ${toHex(c)};`;
  });
  return `// hex&hue palette export\n${vars.join('\n')}`;
}

function generateTailwind(colors, names) {
  const entries = colors.map((c,i) => {
    const slug = slugify(names[i] || `color-${i+1}`);
    return `      '${slug}': '${toHex(c)}',`;
  });
  return `// tailwind.config.js — add inside theme.extend.colors\nconst palette = {\n${entries.join('\n')}\n};\n\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: { palette },\n    },\n  },\n};`;
}

function generateJSON(colors, names) {
  const obj = {};
  colors.forEach((c,i) => {
    const slug = slugify(names[i] || `color-${i+1}`);
    obj[slug] = {
      name: names[i],
      hex: toHex(c),
      rgb: toRgb(c),
      hsl: toHsl(c),
      oklch: toOklchStr(c),
    };
  });
  return JSON.stringify({ palette: obj, source: 'hex&hue Color Theory Studio', generated: new Date().toISOString() }, null, 2);
}

function generatePaintList(colors, names) {
  const lines = [
    '# hex&hue — Paint Mixing Reference',
    `# Generated ${new Date().toLocaleDateString()}`,
    '',
    ...colors.flatMap((c,i) => {
      const hex = toHex(c);
      return [
        `## ${names[i]} — ${hex}`,
        `   Digital: ${toHex(c)} · ${toRgb(c)} · ${toOklchStr(c)}`,
        `   Note: Use the Paint tab in hex&hue to generate a precise KM mixing recipe`,
        '',
      ];
    }),
  ];
  return lines.join('\n');
}

// ─── copy/download helpers ────────────────────────────────────────────────────

function useClipboard() {
  const [copied, setCopied] = useState(null);
  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    }
  };
  return { copied, copy };
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── components ───────────────────────────────────────────────────────────────

function CodeBlock({ code, id, filename, copied, onCopy, onDownload }) {
  return (
    <div className="rounded-xl border border-[#1a1a24] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0f] border-b border-[#1a1a24]">
        <span className="text-[10px] font-mono text-[#55556a]">{filename}</span>
        <div className="flex gap-2">
          <button
            onClick={onDownload}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] text-[#55556a] hover:text-[#8888a0] hover:bg-[#1a1a24] transition-colors"
          >
            <Download size={11} /> Save
          </button>
          <button
            onClick={onCopy}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
              copied === id
                ? 'bg-green-500/20 text-green-400'
                : 'bg-[#ff6b4a]/10 text-[#ff6b4a] hover:bg-[#ff6b4a]/20'
            }`}
          >
            {copied === id ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
      </div>
      <pre className="p-4 text-[11px] leading-relaxed font-mono text-[#8888a0] overflow-x-auto max-h-64 whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

const FORMATS = [
  { id: 'css',      label: 'CSS Variables', icon: Code,        ext: 'css'  },
  { id: 'scss',     label: 'SCSS',          icon: Braces,      ext: 'scss' },
  { id: 'tailwind', label: 'Tailwind',      icon: Code,        ext: 'js'   },
  { id: 'json',     label: 'JSON',          icon: FileJson,    ext: 'json' },
  { id: 'paint',    label: 'Paint List',    icon: FlaskConical,ext: 'md'   },
  { id: 'swatches', label: 'SVG Swatches',  icon: Palette,     ext: 'svg'  },
];

function generateSVGSwatches(colors, names) {
  const W = 80, H = 100, GAP = 8;
  const total = colors.length * (W + GAP) - GAP;
  const rects = colors.map((c,i) => {
    const x = i*(W+GAP);
    const hex = toHex(c);
    const contrast = contrastRatio(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#000000';
    return [
      `<rect x="${x}" y="0" width="${W}" height="${W}" rx="8" fill="${hex}"/>`,
      `<text x="${x+W/2}" y="${W+16}" text-anchor="middle" font-family="monospace" font-size="9" fill="#888">${hex}</text>`,
      `<text x="${x+W/2}" y="${W+28}" text-anchor="middle" font-family="sans-serif" font-size="8" fill="#666">${(names[i]||'').substring(0,12)}</text>`,
    ].join('\n');
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${H}" width="${total}" height="${H}">\n  <rect width="${total}" height="${H}" rx="4" fill="#0a0a0f"/>\n${rects}\n</svg>`;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ExportPanel({ colors = [], paletteLabel = 'Palette' }) {
  const [selectedFormat, setSelectedFormat] = useState('css');
  const { copied, copy } = useClipboard();

  const names = useMemo(
    () => colors.map(c => generateColorName(c)),
    [colors]
  );

  const code = useMemo(() => {
    if (!colors.length) return '';
    switch(selectedFormat) {
      case 'css':      return generateCSS(colors, names);
      case 'scss':     return generateSCSS(colors, names);
      case 'tailwind': return generateTailwind(colors, names);
      case 'json':     return generateJSON(colors, names);
      case 'paint':    return generatePaintList(colors, names);
      case 'swatches': return generateSVGSwatches(colors, names);
      default:         return '';
    }
  }, [colors, names, selectedFormat]);

  const fmt = FORMATS.find(f => f.id === selectedFormat);
  const filename = `hexandhue-palette.${fmt?.ext}`;

  if (!colors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Palette size={32} className="text-[#55556a] mb-3 opacity-50" />
        <p className="text-sm text-[#55556a]">Generate a palette to export it</p>
        <p className="text-xs text-[#3a3a4a] mt-1">Use any tab to create a palette first</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Swatch strip */}
      <div className="h-14 rounded-2xl overflow-hidden flex shadow-xl">
        {colors.map((c, i) => (
          <div
            key={i}
            className="flex-1 relative group cursor-default transition-all hover:flex-[1.4]"
            style={{ backgroundColor: toHex(c) }}
          >
            <div className="absolute inset-0 flex items-end justify-center pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[8px] font-mono px-1 rounded" style={{
                backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff'
              }}>{toHex(c)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Colour names row */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(colors.length,6)}, 1fr)` }}>
        {colors.slice(0,6).map((c,i) => (
          <div key={i} className="text-center">
            <div className="w-6 h-6 rounded-md mx-auto mb-1" style={{ backgroundColor: toHex(c) }} />
            <p className="text-[9px] text-[#55556a] truncate">{names[i]}</p>
          </div>
        ))}
      </div>

      {/* Format tabs */}
      <div>
        <p className="text-xs text-[#55556a] mb-2 uppercase tracking-wider font-medium">Export format</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMATS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedFormat(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedFormat === id
                  ? 'bg-[#ff6b4a]/15 text-[#ff6b4a] border border-[#ff6b4a]/30'
                  : 'bg-[#12121a] text-[#8888a0] border border-[#1a1a24] hover:border-[#252530] hover:text-[#f0f0f5]'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Code block */}
      <CodeBlock
        code={code}
        id={selectedFormat}
        filename={filename}
        copied={copied}
        onCopy={() => copy(code, selectedFormat)}
        onDownload={() => downloadText(code, filename)}
      />

      {/* Format hint */}
      <div className="text-[10px] text-[#55556a] leading-relaxed">
        {selectedFormat === 'css' && '✦ CSS custom properties — paste into your :root stylesheet. Includes RGB channel variables for rgba() compositing.'}
        {selectedFormat === 'scss' && '✦ SCSS variables — import into your SCSS entry file. Use $color-name in any stylesheet.'}
        {selectedFormat === 'tailwind' && '✦ Extend your tailwind.config.js colors with this palette. Access with classes like bg-dusty-rose.'}
        {selectedFormat === 'json' && '✦ All formats in one JSON object. Useful for design tokens, Figma plugins, or custom tooling.'}
        {selectedFormat === 'paint' && '✦ Reference list for your paint session. Use the Paint tab to get precise KM mixing recipes per colour.'}
        {selectedFormat === 'swatches' && '✦ Scalable SVG swatch sheet — open in Illustrator, Inkscape, or embed directly in web pages.'}
      </div>
    </div>
  );
}
