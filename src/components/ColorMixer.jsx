import React, { useMemo } from 'react';
import { Droplets } from 'lucide-react';
import { oklchToHex } from '../utils/colorUtils';

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function colorDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function approxName(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (lightness > 127.5 ? 510 - max - min : max + min);

  if (sat < 0.12) {
    if (lightness > 220) return 'White';
    if (lightness < 40) return 'Black';
    if (lightness > 160) return 'Light Gray';
    return lightness > 80 ? 'Gray' : 'Dark Gray';
  }

  let hue;
  if (max === r) hue = (((g - b) / (max - min)) % 6) * 60;
  else if (max === g) hue = ((b - r) / (max - min) + 2) * 60;
  else hue = ((r - g) / (max - min) + 4) * 60;
  if (hue < 0) hue += 360;

  const prefix = lightness > 180 ? 'Light ' : lightness < 70 ? 'Dark ' : '';
  if (hue < 15 || hue >= 345) return prefix + 'Red';
  if (hue < 45) return prefix + 'Orange';
  if (hue < 75) return prefix + 'Yellow';
  if (hue < 150) return prefix + 'Green';
  if (hue < 195) return prefix + 'Cyan';
  if (hue < 255) return prefix + 'Blue';
  if (hue < 285) return prefix + 'Indigo';
  if (hue < 315) return prefix + 'Violet';
  return prefix + 'Magenta';
}

const ANCHORS = [
  { hex: '#FF0000', name: 'Red' },
  { hex: '#0000FF', name: 'Blue' },
  { hex: '#FFFF00', name: 'Yellow' },
  { hex: '#FF00FF', name: 'Magenta' },
  { hex: '#00FFFF', name: 'Cyan' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#000000', name: 'Black' },
  { hex: '#FF8000', name: 'Orange' },
  { hex: '#008000', name: 'Green' },
  { hex: '#800080', name: 'Purple' },
  { hex: '#FF69B4', name: 'Pink' },
  { hex: '#8B4513', name: 'Brown' },
];

const RATIOS = [0.2, 0.25, 0.33, 0.4, 0.5, 0.6, 0.67, 0.75, 0.8];

function generateRecipes(targetHex) {
  const T = hexToRgb(targetHex);
  const candidates = [];

  for (const anchor of ANCHORS) {
    const A = hexToRgb(anchor.hex);
    let best = null;

    for (const r of RATIOS) {
      // B = (T - A*r) / (1 - r)
      const bRaw = {
        r: (T.r - A.r * r) / (1 - r),
        g: (T.g - A.g * r) / (1 - r),
        b: (T.b - A.b * r) / (1 - r),
      };
      if (bRaw.r < -5 || bRaw.r > 260 || bRaw.g < -5 || bRaw.g > 260 || bRaw.b < -5 || bRaw.b > 260)
        continue;

      const bClamped = { r: Math.round(bRaw.r), g: Math.round(bRaw.g), b: Math.round(bRaw.b) };
      const bHex = rgbToHex(bClamped);
      if (bHex.toLowerCase() === anchor.hex.toLowerCase()) continue;

      const mixed = {
        r: A.r * r + bClamped.r * (1 - r),
        g: A.g * r + bClamped.g * (1 - r),
        b: A.b * r + bClamped.b * (1 - r),
      };
      const accuracy = colorDist(mixed, T);

      if (!best || accuracy < best.accuracy) {
        best = {
          colorA: { hex: anchor.hex, name: anchor.name },
          colorB: { hex: bHex, name: approxName(bHex) },
          ratioA: Math.round(r * 100),
          ratioB: Math.round((1 - r) * 100),
          accuracy,
        };
      }
    }
    if (best) candidates.push(best);
  }

  candidates.sort((a, b) => a.accuracy - b.accuracy);

  // Pick top 4 with distinct anchor colors
  const seen = new Set();
  return candidates.filter((c) => {
    if (seen.has(c.colorA.name)) return false;
    seen.add(c.colorA.name);
    return true;
  }).slice(0, 4);
}

function accuracyBadge(dist) {
  if (dist < 8)  return { text: 'Exact',       color: '#4ade80' };
  if (dist < 20) return { text: 'Very close',  color: '#86efac' };
  if (dist < 40) return { text: 'Close',        color: '#fbbf24' };
  return              { text: 'Approximate',    color: '#fb923c' };
}

export default function ColorMixer({ baseColor }) {
  const targetHex = useMemo(() => oklchToHex(baseColor), [baseColor]);
  const rgb = useMemo(() => hexToRgb(targetHex), [targetHex]);
  const recipes = useMemo(() => generateRecipes(targetHex), [targetHex]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Droplets size={14} className="text-[#8888a0]" />
        <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium">Color Mixer</h3>
      </div>

      {/* Target */}
      <div className="flex items-center gap-3 p-3 bg-[#12121a] rounded-xl border border-[#1a1a24]">
        <div
          className="w-12 h-12 rounded-xl shadow-lg border border-white/10 shrink-0"
          style={{ backgroundColor: targetHex }}
        />
        <div>
          <p className="text-[10px] text-[#55556a] uppercase tracking-wider">Target Color</p>
          <p className="text-sm font-mono text-[#f0f0f5]">{targetHex.toUpperCase()}</p>
          <p className="text-[10px] text-[#55556a] mt-0.5">
            rgb({rgb.r}, {rgb.g}, {rgb.b})
          </p>
        </div>
      </div>

      {/* RGB channel breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#55556a] uppercase tracking-wider">Channel Breakdown</p>
        {[
          { label: 'R', value: rgb.r, color: '#ef4444' },
          { label: 'G', value: rgb.g, color: '#22c55e' },
          { label: 'B', value: rgb.b, color: '#3b82f6' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8888a0] w-4 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-[#1a1a24] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(value / 255) * 100}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-mono text-[#55556a] w-8 text-right shrink-0">{value}</span>
            <span className="text-[10px] font-mono text-[#3a3a4a] w-8 text-right shrink-0">
              {Math.round((value / 255) * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Mix Recipes */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#55556a] uppercase tracking-wider">Mix Recipes</p>
        {recipes.map((recipe, i) => {
          const badge = accuracyBadge(recipe.accuracy);
          return (
            <div
              key={i}
              className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-3 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                {/* Color A */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 border border-white/10 shadow"
                    style={{ backgroundColor: recipe.colorA.hex }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8888a0] truncate">{recipe.colorA.name}</p>
                    <p className="text-xs font-bold text-[#f0f0f5]">{recipe.ratioA}%</p>
                  </div>
                </div>

                <span className="text-[#3a3a4a] text-base font-light shrink-0">+</span>

                {/* Color B */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg shrink-0 border border-white/10 shadow"
                    style={{ backgroundColor: recipe.colorB.hex }}
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#8888a0] truncate">{recipe.colorB.name}</p>
                    <p className="text-xs font-bold text-[#f0f0f5]">{recipe.ratioB}%</p>
                  </div>
                </div>

                <span className="text-[#3a3a4a] text-base font-light shrink-0">=</span>

                {/* Result */}
                <div
                  className="w-9 h-9 rounded-lg shrink-0 border-2 shadow"
                  style={{ backgroundColor: targetHex, borderColor: targetHex }}
                  title="Target color"
                />
              </div>

              {/* Ratio bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{ width: `${recipe.ratioA}%`, backgroundColor: recipe.colorA.hex }}
                />
                <div
                  className="h-full transition-all"
                  style={{ width: `${recipe.ratioB}%`, backgroundColor: recipe.colorB.hex }}
                />
              </div>

              {/* Accuracy badge */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[#3a3a4a] font-mono">
                  {recipe.colorA.hex.toUpperCase()} · {recipe.colorB.hex.toUpperCase()}
                </p>
                <span
                  className="text-[9px] uppercase tracking-widest font-medium px-1.5 py-0.5 rounded"
                  style={{ color: badge.color, backgroundColor: badge.color + '22' }}
                >
                  {badge.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
