/**
 * ShadowHighlight.jsx
 * 
 * Temperature-based shadow & highlight generator.
 * 
 * Based on traditional colour theory (Munsell, Itten) and OKLCH colour science:
 * - Warm light → cool shadows (and vice versa)
 * - Shadows shift hue toward the complement, lose saturation
 * - Highlights shift toward the light source colour, gain lightness
 * - OKLCH enables perceptually uniform lightness steps (unlike HSL)
 */

import { useState, useMemo } from 'react';
import { Sun, Moon, Copy, Check, Layers, BookOpen } from 'lucide-react';
import { oklchToHex } from '../utils/colorUtils';

// ─── colour temperature helpers ───────────────────────────────────────────────

/** Is a hue angle "warm" (red/orange/yellow range)? */
function isWarmHue(h) {
  const n = ((h % 360) + 360) % 360;
  return n < 60 || n > 300; // reds and violets/magentas
}

function isYellowRange(h) {
  const n = ((h % 360) + 360) % 360;
  return n >= 50 && n < 100;
}

/** Perceptual warmth of a colour. Returns 0 (very cool) → 1 (very warm). */
function warmthScore(color) {
  const h = ((color.h || 0) % 360 + 360) % 360;
  // Warm zone: 0°–80° and 300°–360°
  if (h <= 80) return 1 - (h / 80) * 0.4;    // reds fade to yellow-green
  if (h >= 300) return (h - 300) / 60 * 0.7 + 0.3; // violet/pink toward red
  // Cool zone: 80°–300°
  return Math.max(0, 1 - (h - 80) / 220);
}

/** Complementary hue (180° opposite). */
function complementHue(h) { return (h + 180) % 360; }

/** Shift hue by delta, wrapping 0-360. */
function shiftHue(h, delta) { return ((h + delta) % 360 + 360) % 360; }

// ─── shadow generation ────────────────────────────────────────────────────────

/**
 * Generate shadow steps for a base colour.
 * lightSource: 'warm' | 'cool' | 'neutral'
 * returns array of OKLCH colour objects
 */
function generateShadows(base, lightSource, steps = 4) {
  const h = base.h || 0;
  const l = base.l || 0.5;
  const c = base.c || 0.1;

  // Shadow hue strategy:
  // - Warm light → shadows go cooler (toward blue/violet)
  // - Cool light → shadows go warmer (toward red/orange)
  // - Neutral   → shadows go toward complement
  let hueDelta;
  if (lightSource === 'warm') {
    // Push shadows toward blue-violet (around 250-280°)
    const targetH = 260;
    const diff = ((targetH - h) % 360 + 360) % 360;
    hueDelta = diff > 180 ? diff - 360 : diff;
    hueDelta *= 0.3; // partial shift
  } else if (lightSource === 'cool') {
    // Push shadows toward warm orange-red (around 25-40°)
    const targetH = 30;
    const diff = ((targetH - h) % 360 + 360) % 360;
    hueDelta = diff > 180 ? diff - 360 : diff;
    hueDelta *= 0.3;
  } else {
    // Neutral: subtle shift toward violet (artists' trick for depth)
    hueDelta = 15;
  }

  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps; // 0 → 1 (light shadow → deep shadow)
    return {
      mode: 'oklch',
      l: Math.max(0.04, l - t * Math.min(l * 0.85, 0.45)),
      c: Math.max(0.01, c - t * c * 0.55 + (t * 0.02)), // slight chroma drop + base
      h: shiftHue(h, hueDelta * t),
    };
  });
}

// ─── highlight generation ─────────────────────────────────────────────────────

/**
 * Generate highlight steps.
 * lightSource reflects what kind of light is hitting the surface.
 */
function generateHighlights(base, lightSource, steps = 4) {
  const h = base.h || 0;
  const l = base.l || 0.5;
  const c = base.c || 0.1;

  // Highlight hue strategy: shift toward light source colour
  let hueDelta;
  if (lightSource === 'warm') {
    // Highlights go warmer (toward yellow-orange)
    const targetH = isYellowRange(h) ? h : 60;
    const diff = ((targetH - h) % 360 + 360) % 360;
    hueDelta = diff > 180 ? diff - 360 : diff;
    hueDelta *= 0.25;
  } else if (lightSource === 'cool') {
    // Highlights go cooler (toward blue or cyan)
    const targetH = 200;
    const diff = ((targetH - h) % 360 + 360) % 360;
    hueDelta = diff > 180 ? diff - 360 : diff;
    hueDelta *= 0.25;
  } else {
    // Neutral: very subtle warm shift (sunlight approximation)
    hueDelta = -8;
  }

  return Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    return {
      mode: 'oklch',
      l: Math.min(0.97, l + t * (1 - l) * 0.7),
      c: Math.max(0.01, c - t * c * 0.65), // highlights lose chroma
      h: shiftHue(h, hueDelta * t),
    };
  });
}

// ─── copy helper ─────────────────────────────────────────────────────────────

function useClipboard() {
  const [copied, setCopied] = useState(null);
  const copy = async (text, id) => {
    try { await navigator.clipboard.writeText(text); } catch { }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };
  return { copied, copy };
}

// ─── swatch strip component ───────────────────────────────────────────────────

function SwatchStrip({ colors, label, icon: Icon, iconClass, onColorSelect, copied, onCopy }) {
  const hexList  = colors.map(c => oklchToHex(c));
  const cssBlock = hexList.map((h,i) => `  --${label.toLowerCase().replace(/\s/,'-')}-${i+1}: ${h};`).join('\n');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} className={iconClass} />
          <span className="text-xs font-medium text-[#f0f0f5]">{label}</span>
        </div>
        <button
          onClick={() => onCopy(cssBlock, label)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors ${
            copied === label ? 'text-green-400' : 'text-[#55556a] hover:text-[#ff6b4a]'
          }`}
        >
          {copied === label ? <><Check size={10}/> Copied</> : <><Copy size={10}/> CSS</>}
        </button>
      </div>

      <div className="flex gap-1.5">
        {colors.map((c, i) => {
          const hex = oklchToHex(c);
          return (
            <button
              key={i}
              onClick={() => onColorSelect && onColorSelect(c)}
              className="flex-1 group relative"
              title={hex}
            >
              <div
                className="h-14 rounded-xl shadow-md border border-white/5 transition-transform group-hover:scale-105 group-hover:shadow-lg"
                style={{ backgroundColor: hex }}
              />
              <p className="text-[9px] font-mono text-[#55556a] mt-1 text-center">{hex}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const LIGHT_SOURCES = [
  { id: 'warm',    label: 'Warm light',    emoji: '🌅', desc: 'Sunlight, candles, tungsten. Shadows go cool (blue/indigo).' },
  { id: 'neutral', label: 'Neutral light', emoji: '☁️', desc: 'Overcast, studio. Shadows muted and slightly violet.' },
  { id: 'cool',    label: 'Cool light',    emoji: '🌙', desc: 'Moonlight, sky, fluorescent. Shadows go warm (orange/amber).' },
];

const STEP_OPTIONS = [3, 4, 5];

export default function ShadowHighlight({ baseColor, onColorSelect }) {
  const [lightSource, setLightSource] = useState('warm');
  const [steps, setSteps] = useState(4);
  const [activeTab, setActiveTab] = useState('results');
  const { copied, copy } = useClipboard();

  const shadows    = useMemo(() => baseColor ? generateShadows(baseColor, lightSource, steps)    : [], [baseColor, lightSource, steps]);
  const highlights = useMemo(() => baseColor ? generateHighlights(baseColor, lightSource, steps) : [], [baseColor, lightSource, steps]);

  if (!baseColor) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Layers size={32} className="text-[#55556a] mb-3 opacity-50"/>
        <p className="text-sm text-[#55556a]">Select a colour to generate shadows & highlights</p>
      </div>
    );
  }

  const baseHex = oklchToHex(baseColor);
  const warmth  = warmthScore(baseColor);
  const tempLabel = warmth > 0.65 ? 'Warm colour'
    : warmth < 0.35 ? 'Cool colour'
    : 'Neutral colour';

  return (
    <div className="space-y-4">
      {/* Light source selector */}
      <div className="space-y-2">
        <p className="text-xs text-[#55556a] uppercase tracking-wider font-medium">Light source</p>
        <div className="space-y-1.5">
          {LIGHT_SOURCES.map(({ id, label, emoji, desc }) => (
            <button
              key={id}
              onClick={() => setLightSource(id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                lightSource === id
                  ? 'bg-[#ff6b4a]/10 border-[#ff6b4a]/30'
                  : 'bg-[#12121a] border-[#1a1a24] hover:border-[#252530]'
              }`}
            >
              <span className="text-lg leading-none mt-0.5">{emoji}</span>
              <div>
                <p className={`text-xs font-medium ${lightSource === id ? 'text-[#ff6b4a]' : 'text-[#f0f0f5]'}`}>{label}</p>
                <p className="text-[10px] text-[#55556a] mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Steps + colour info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: baseHex }} />
          <div>
            <p className="text-xs font-mono text-[#f0f0f5]">{baseHex}</p>
            <p className="text-[10px] text-[#55556a]">{tempLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#55556a]">Steps</span>
          <div className="flex bg-[#0a0a0f] rounded-lg p-0.5">
            {STEP_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setSteps(n)}
                className={`w-6 h-6 rounded-md text-xs font-medium transition-colors ${
                  steps === n ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' : 'text-[#55556a] hover:text-[#8888a0]'
                }`}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
        {[
          { id:'results', label:'Results',  icon: Layers },
          { id:'theory',  label:'Why this works',  icon: BookOpen },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === id ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' : 'text-[#55556a] hover:text-[#8888a0]'
            }`}
          >
            <Icon size={12}/>{label}
          </button>
        ))}
      </div>

      {/* ── RESULTS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-5">
          {/* Full gradient strip */}
          <div>
            <p className="text-[10px] text-[#55556a] mb-2 uppercase tracking-wider">Full range</p>
            <div className="h-10 rounded-xl overflow-hidden flex">
              {[...highlights].reverse().map((c,i) => (
                <div key={`h${i}`} className="flex-1" style={{ backgroundColor: oklchToHex(c) }}/>
              ))}
              <div className="flex-[1.5] border-x-4 border-[#1a1a24]" style={{ backgroundColor: baseHex }}/>
              {shadows.map((c,i) => (
                <div key={`s${i}`} className="flex-1" style={{ backgroundColor: oklchToHex(c) }}/>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-[#55556a] mt-1">
              <span>← Highlights</span>
              <span>Base</span>
              <span>Shadows →</span>
            </div>
          </div>

          {/* Highlight swatches */}
          <SwatchStrip
            colors={[...highlights].reverse()}
            label="Highlights"
            icon={Sun}
            iconClass="text-yellow-400"
            onColorSelect={onColorSelect}
            copied={copied}
            onCopy={copy}
          />

          {/* Shadow swatches */}
          <SwatchStrip
            colors={shadows}
            label="Shadows"
            icon={Moon}
            iconClass="text-indigo-400"
            onColorSelect={onColorSelect}
            copied={copied}
            onCopy={copy}
          />
        </div>
      )}

      {/* ── THEORY TAB ──────────────────────────────────────────────── */}
      {activeTab === 'theory' && (
        <div className="space-y-4 text-xs text-[#8888a0] leading-relaxed">
          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#f0f0f5]">Colour temperature in shadows</h3>
            <p>
              The rule of thumb in traditional painting: <strong className="text-[#f0f0f5]">warm light, cool shadows</strong>.
              When sunlight (warm, around 5500K) hits a surface, the shadows get their light from
              the sky (cool, ~8000K+), so they appear blue-violet.
            </p>
            <p>
              This reverses under artificial cool lighting — shadows take on warm reflected light
              from the room environment. hex&hue shifts shadow hues toward the complementary
              temperature using <strong className="text-[#f0f0f5]">OKLCH</strong>, which preserves
              perceptual brightness better than RGB or HSL shifts.
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#f0f0f5]">Why shadows lose chroma</h3>
            <p>
              Pigment and light both absorb — the darker a shadow, the fewer wavelengths bounce
              back. This naturally desaturates shadows. Artists compensate by adding a{' '}
              <em>tiny</em> amount of the complementary colour rather than just adding black
              (which makes shadows look dead).
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#f0f0f5]">Why OKLCH beats HSL here</h3>
            <p>
              HSL lightness is non-perceptual — a saturated yellow at L:50% looks much
              brighter than a blue at L:50%. OKLCH's lightness channel tracks
              how our eyes actually perceive brightness, so the shadow/highlight ramps
              step evenly without unexpected luminance jumps.
            </p>
          </div>

          <div className="flex gap-2 text-[10px]">
            <span className="px-2 py-1 bg-[#12121a] rounded-lg border border-[#1a1a24] text-[#55556a]">
              Based on Munsell (1905)
            </span>
            <span className="px-2 py-1 bg-[#12121a] rounded-lg border border-[#1a1a24] text-[#55556a]">
              Itten's colour theory
            </span>
            <span className="px-2 py-1 bg-[#12121a] rounded-lg border border-[#1a1a24] text-[#55556a]">
              OKLCH (Björn Ottosson, 2020)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
