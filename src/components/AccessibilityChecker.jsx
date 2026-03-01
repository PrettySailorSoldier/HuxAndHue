/**
 * AccessibilityChecker.jsx
 * 
 * WCAG contrast ratio checker + colour blindness simulation.
 * Uses the relative luminance formula from WCAG 2.x specification.
 * Colour-blindness simulation uses the Brettel/Viénot/Mollon matrix method.
 */

import { useState, useMemo } from 'react';
import { Eye, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { oklchToHex } from '../utils/colorUtils';

// ─── WCAG helpers ─────────────────────────────────────────────────────────────

function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const lin = v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const [light, dark] = l1 > l2 ? [l1,l2] : [l2,l1];
  return (light+0.05)/(dark+0.05);
}

// WCAG 2.1 thresholds
const WCAG = {
  AA_normal:  4.5,
  AA_large:   3.0,
  AAA_normal: 7.0,
  AAA_large:  4.5,
};

function getWcagResult(ratio) {
  return {
    AA_normal:  ratio >= WCAG.AA_normal,
    AA_large:   ratio >= WCAG.AA_large,
    AAA_normal: ratio >= WCAG.AAA_normal,
    AAA_large:  ratio >= WCAG.AAA_large,
  };
}

// ─── Colour Blindness Simulation ─────────────────────────────────────────────
// Uses the Brettel (1997) + Viénot (1999) linear-in-LMS simulation.
// sRGB → LMS (D65) → simulate → LMS → sRGB

// sRGB linearise
const linearize = v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
const delinearize = v => v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4)-0.055;
const clamp = v => Math.max(0, Math.min(1, v));

// Hunt-Pointer-Estévez sRGB→LMS (D65)
function srgbToLms(r, g, b) {
  const rl=linearize(r), gl=linearize(g), bl=linearize(b);
  return [
     0.4002*rl + 0.7076*gl - 0.0808*bl,
    -0.2263*rl + 1.1653*gl + 0.0457*bl,
     0.0000*rl + 0.0000*gl + 0.9182*bl,
  ];
}

function lmsToSrgb(L, M, S) {
  const rl =  1.8599364*L - 1.1293816*M + 0.2198974*S;
  const gl =  0.3611914*L + 0.6388125*M - 0.0000064*S;
  const bl =  0.0000000*L + 0.0000000*M + 1.0890636*S;
  return [
    clamp(delinearize(rl)),
    clamp(delinearize(gl)),
    clamp(delinearize(bl)),
  ];
}

// Simulation matrices (Viénot 1999 + Brettel 1997)
const CVD_MATRIX = {
  protanopia: (L, M, S) => {
    // L channel zeroed, estimated from M and S
    const Lsim = 2.02344*M - 2.52581*S;
    return lmsToSrgb(Lsim, M, S);
  },
  deuteranopia: (L, M, S) => {
    const Msim = 0.494207*L + 0.505793*S;
    return lmsToSrgb(L, Msim, S);
  },
  tritanopia: (L, M, S) => {
    const Ssim = -0.395913*L + 0.801109*M;
    return lmsToSrgb(L, M, Ssim);
  },
  achromatopsia: (L, M, S) => {
    const Y = 0.212656*L + 0.715158*M + 0.072186*S;
    return lmsToSrgb(Y, Y, Y);
  },
};

function simulateCVD(hex, type) {
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;
  const [L,M,S] = srgbToLms(r, g, b);
  const [rs, gs, bs] = CVD_MATRIX[type](L,M,S);
  const to255 = v => Math.round(v*255).toString(16).padStart(2,'0');
  return `#${to255(rs)}${to255(gs)}${to255(bs)}`;
}

const CVD_TYPES = [
  { id: 'normal',       label: 'Normal',        description: 'Trichromatic vision' },
  { id: 'protanopia',   label: 'Protanopia',    description: 'Red-blind (~1% men)' },
  { id: 'deuteranopia', label: 'Deuteranopia',  description: 'Green-blind (~1% men)' },
  { id: 'tritanopia',   label: 'Tritanopia',    description: 'Blue-blind (~0.01%)' },
  { id: 'achromatopsia',label: 'Achromatopsia', description: 'No colour vision (~0.003%)' },
];

// ─── sub-components ───────────────────────────────────────────────────────────

function ContrastBadge({ pass }) {
  return pass
    ? <span className="flex items-center gap-1 text-green-400 text-[10px]"><CheckCircle size={11}/> Pass</span>
    : <span className="flex items-center gap-1 text-red-400 text-[10px]"><XCircle size={11}/> Fail</span>;
}

function ContrastPair({ fg, bg, label }) {
  const ratio = contrastRatio(fg, bg);
  const wcag = getWcagResult(ratio);
  const [expanded, setExpanded] = useState(false);

  const overallLevel = wcag.AAA_normal ? 'AAA'
    : wcag.AA_normal ? 'AA'
    : wcag.AA_large ? 'AA Large'
    : 'Fail';
  const levelColor = wcag.AAA_normal ? '#4ade80' : wcag.AA_normal ? '#86efac' : wcag.AA_large ? '#fbbf24' : '#f87171';

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] overflow-hidden">
      {/* Preview */}
      <div
        className="h-16 flex items-center justify-center gap-3 px-4"
        style={{ backgroundColor: bg }}
      >
        <span className="text-lg font-bold" style={{ color: fg }}>Aa</span>
        <span className="text-xs" style={{ color: fg }}>Sample text on this background</span>
      </div>

      {/* Summary row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#0a0a0f] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: fg }} />
            <div className="w-4 h-4 rounded" style={{ backgroundColor: bg }} />
          </div>
          <span className="text-xs text-[#8888a0]">{label}</span>
          <span className="text-xs font-mono text-[#f0f0f5]">{ratio.toFixed(2)}:1</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: levelColor }}>{overallLevel}</span>
          {expanded ? <ChevronUp size={12} className="text-[#55556a]"/> : <ChevronDown size={12} className="text-[#55556a]"/>}
        </div>
      </button>

      {/* Detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#1a1a24]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-[#55556a]">AA Normal text</span>
              <ContrastBadge pass={wcag.AA_normal} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#55556a]">AA Large text</span>
              <ContrastBadge pass={wcag.AA_large} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#55556a]">AAA Normal text</span>
              <ContrastBadge pass={wcag.AAA_normal} />
            </div>
            <div className="flex justify-between">
              <span className="text-[#55556a]">AAA Large text</span>
              <ContrastBadge pass={wcag.AAA_large} />
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#55556a]">
            Large text = 18pt normal or 14pt bold (≥24px or ≥18.67px bold)
          </p>
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AccessibilityChecker({ colors = [], baseColor }) {
  const [activeTab, setActiveTab] = useState('contrast');
  const [cvdType, setCvdType] = useState('normal');

  const hexColors = useMemo(() => colors.map(c => oklchToHex(c)), [colors]);
  const baseHex = baseColor ? oklchToHex(baseColor) : '#7d7df9';

  // All fg/bg pairs from the palette
  const contrastPairs = useMemo(() => {
    if (hexColors.length < 2) return [];
    const pairs = [];
    // Darkest vs lightest (most likely real combination)
    const sorted = [...hexColors].sort((a,b) => relativeLuminance(a) - relativeLuminance(b));
    const darkest = sorted[0];
    const lightest = sorted[sorted.length-1];
    pairs.push({ fg: darkest, bg: lightest, label: `Darkest on Lightest` });
    pairs.push({ fg: lightest, bg: darkest, label: `Lightest on Darkest` });
    // Each colour on white and black
    hexColors.forEach((hex,i) => {
      pairs.push({ fg: hex,   bg: '#ffffff', label: `Color ${i+1} on White` });
      pairs.push({ fg: hex,   bg: '#0a0a0f', label: `Color ${i+1} on Dark` });
    });
    // Adjacent pairs
    for (let i = 0; i < hexColors.length - 1; i++) {
      pairs.push({ fg: hexColors[i], bg: hexColors[i+1], label: `Color ${i+1} on ${i+2}` });
    }
    return pairs;
  }, [hexColors]);

  const passPairs = contrastPairs.filter(p => contrastRatio(p.fg, p.bg) >= WCAG.AA_normal);
  const failPairs = contrastPairs.filter(p => contrastRatio(p.fg, p.bg) < WCAG.AA_normal);

  // Simulated palette
  const simulatedPalette = useMemo(() => {
    if (cvdType === 'normal') return hexColors;
    return hexColors.map(hex => simulateCVD(hex, cvdType));
  }, [hexColors, cvdType]);

  const allColorsForSimulation = useMemo(() => {
    const all = [...hexColors];
    if (baseHex && !all.includes(baseHex)) all.unshift(baseHex);
    return all;
  }, [hexColors, baseHex]);

  const simulatedAll = useMemo(() => {
    if (cvdType === 'normal') return allColorsForSimulation;
    return allColorsForSimulation.map(hex => simulateCVD(hex, cvdType));
  }, [allColorsForSimulation, cvdType]);

  if (!colors.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Eye size={32} className="text-[#55556a] mb-3 opacity-50"/>
        <p className="text-sm text-[#55556a]">Generate a palette to check accessibility</p>
        <p className="text-xs text-[#3a3a4a] mt-1">Any tab with 2+ colours will work</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total pairs', value: contrastPairs.length, color: '#8888a0' },
          { label: 'AA pass', value: passPairs.length, color: '#4ade80' },
          { label: 'Needs work', value: failPairs.length, color: failPairs.length > 0 ? '#f87171' : '#4ade80' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-3 text-center">
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
            <p className="text-[10px] text-[#55556a] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
        {[
          { id: 'contrast',  label: 'Contrast',       icon: AlertCircle },
          { id: 'blindness', label: 'Colour Vision',   icon: Eye },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === id
                ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]'
                : 'text-[#55556a] hover:text-[#8888a0]'
            }`}
          >
            <Icon size={12} />{label}
          </button>
        ))}
      </div>

      {/* ── CONTRAST TAB ──────────────────────────────────────────────── */}
      {activeTab === 'contrast' && (
        <div className="space-y-3">
          {contrastPairs.slice(0, 10).map((pair, i) => (
            <ContrastPair key={i} {...pair} />
          ))}
          {contrastPairs.length === 0 && (
            <p className="text-xs text-center text-[#55556a] py-4">
              Add more colours to compare pairs
            </p>
          )}
          <div className="bg-[#12121a] rounded-lg p-3 border border-[#1a1a24]">
            <p className="text-[10px] text-[#55556a] leading-relaxed">
              <strong className="text-[#8888a0]">WCAG 2.1 AA</strong> requires 4.5:1 for normal text (≥3:1 for large text).
              <strong className="text-[#8888a0]"> AAA</strong> requires 7:1 (4.5:1 large). Most apps target AA as a minimum.
            </p>
          </div>
        </div>
      )}

      {/* ── COLOUR BLINDNESS TAB ──────────────────────────────────────── */}
      {activeTab === 'blindness' && (
        <div className="space-y-4">
          {/* Type selector */}
          <div className="space-y-2">
            <p className="text-xs text-[#55556a] uppercase tracking-wider font-medium">Simulation Type</p>
            <div className="space-y-1.5">
              {CVD_TYPES.map(({ id, label, description }) => (
                <button
                  key={id}
                  onClick={() => setCvdType(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                    cvdType === id
                      ? 'bg-[#ff6b4a]/10 border-[#ff6b4a]/30 text-[#ff6b4a]'
                      : 'bg-[#12121a] border-[#1a1a24] text-[#8888a0] hover:border-[#252530]'
                  }`}
                >
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-[10px] text-[#55556a]">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Before/after palette strip */}
          <div className="space-y-2">
            <p className="text-xs text-[#55556a] uppercase tracking-wider font-medium">
              {cvdType === 'normal' ? 'Your palette' : 'Simulated vision'}
            </p>
            <div className="h-12 rounded-xl overflow-hidden flex">
              {simulatedAll.map((hex, i) => (
                <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
              ))}
            </div>
            {cvdType !== 'normal' && (
              <>
                <p className="text-xs text-[#55556a]">Original palette</p>
                <div className="h-12 rounded-xl overflow-hidden flex">
                  {allColorsForSimulation.map((hex, i) => (
                    <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Individual swatches comparison */}
          {cvdType !== 'normal' && (
            <div className="space-y-2">
              <p className="text-xs text-[#55556a] uppercase tracking-wider font-medium">Side by side</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(allColorsForSimulation.length,4)}, 1fr)` }}>
                {allColorsForSimulation.map((orig, i) => {
                  const sim = simulatedAll[i];
                  return (
                    <div key={i} className="space-y-1">
                      <div className="h-10 rounded-lg" style={{ backgroundColor: orig }} />
                      <div className="h-10 rounded-lg" style={{ backgroundColor: sim }} />
                      <p className="text-[9px] text-[#55556a] font-mono text-center">{sim}</p>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 text-[10px] text-[#55556a]">
                <span>↑ Original</span>
                <span>↓ {CVD_TYPES.find(t=>t.id===cvdType)?.label}</span>
              </div>
            </div>
          )}

          <div className="bg-[#12121a] rounded-lg p-3 border border-[#1a1a24]">
            <p className="text-[10px] text-[#55556a] leading-relaxed">
              Simulation uses the <strong className="text-[#8888a0]">Brettel/Viénot/Mollon (1997/1999)</strong> linear LMS model.
              Combined, protanopia + deuteranopia affect ~8% of men and ~0.5% of women of Northern European descent.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
