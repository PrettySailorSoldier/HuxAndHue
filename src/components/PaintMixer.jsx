/**
 * PaintMixer.jsx
 * 
 * Subtractive paint mixing calculator powered by Kubelka-Munk theory.
 * Uses a real pigment database (Golden, Winsor & Newton, Daniel Smith).
 */

import { useState, useCallback, useMemo } from 'react';
import { Pipette, FlaskConical, Shuffle, Plus, Trash2, ChevronDown, AlertCircle, Lightbulb, BookOpen, Target } from 'lucide-react';
import {
  PAINT_DATABASE,
  AVAILABLE_MEDIA,
  findMixingRecipe,
  simulateMix,
  getPaintsByMedium,
} from '../utils/paintMixer';
import { oklchToHex } from '../utils/colorUtils';

// ─── helpers ────────────────────────────────────────────────────────────────
function hexDistance(a, b) {
  const parse = h => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) });
  const pa = parse(a), pb = parse(b);
  return Math.sqrt((pa.r-pb.r)**2 + (pa.g-pb.g)**2 + (pa.b-pb.b)**2);
}

function accuracyLabel(dist) {
  if (dist < 15)  return { text: 'Excellent match', color: '#4ade80' };
  if (dist < 30)  return { text: 'Good match',      color: '#86efac' };
  if (dist < 55)  return { text: 'Fair match',       color: '#fbbf24' };
  if (dist < 80)  return { text: 'Approximate',      color: '#fb923c' };
  return              { text: 'Rough guide',         color: '#f87171' };
}

const MEDIUM_LABELS = {
  watercolor: { label: 'Watercolor', icon: '💧' },
  oil:        { label: 'Oil',        icon: '🛢️' },
  acrylic:    { label: 'Acrylic',    icon: '🎨' },
};

// ─── PaintSlot ──────────────────────────────────────────────────────────────
function PaintSlot({ slot, index, onRemove, onRatioChange, onPaintChange, paintPool }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = paintPool.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.pigmentCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] overflow-visible">
      <div className="flex items-center gap-3 p-3">
        {/* Swatch */}
        <div
          className="w-10 h-10 rounded-lg shrink-0 shadow-lg border border-white/10"
          style={{ backgroundColor: slot.paint.hex }}
        />

        {/* Paint selector */}
        <div className="flex-1 min-w-0 relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between gap-1 text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#f0f0f5] truncate">{slot.paint.name}</p>
              <p className="text-[10px] text-[#55556a]">
                {slot.paint.brand} · {slot.paint.pigmentCode}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-[#55556a] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>

          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0a0a0f] border border-[#1a1a24] rounded-xl shadow-2xl overflow-hidden min-w-[260px]">
              <div className="p-2 border-b border-[#1a1a24]">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search paints…"
                  className="w-full bg-[#12121a] text-xs text-[#f0f0f5] px-3 py-2 rounded-lg outline-none"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { onPaintChange(index, p); setOpen(false); setSearch(''); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#1a1a24] transition-colors"
                  >
                    <div className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: p.hex }} />
                    <div className="text-left min-w-0">
                      <p className="text-xs text-[#f0f0f5] truncate">{p.name}</p>
                      <p className="text-[10px] text-[#55556a]">{p.pigmentCode}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-[#55556a] text-center py-4">No paints found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remove */}
        <button
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg text-[#55556a] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Ratio slider */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#55556a]">Amount</span>
          <span className="text-[10px] font-mono text-[#8888a0]">{slot.concentration}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={95}
          value={slot.concentration}
          onChange={e => onRatioChange(index, Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${slot.paint.hex} ${slot.concentration}%, #1a1a24 ${slot.concentration}%)`
          }}
        />
      </div>
    </div>
  );
}

// ─── RecipeCard ─────────────────────────────────────────────────────────────
function RecipeCard({ recipe, targetHex, onLoad }) {
  const dist = hexDistance(recipe.hex, targetHex);
  const acc = accuracyLabel(dist);

  return (
    <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {/* Result swatch */}
        <div className="shrink-0 space-y-1">
          <div className="w-12 h-12 rounded-lg shadow-lg border border-white/10" style={{ backgroundColor: recipe.hex }} />
          <p className="text-[10px] font-mono text-[#55556a] text-center">{recipe.hex}</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium" style={{ color: acc.color }}>{acc.text}</span>
          </div>
          <div className="space-y-1.5">
            {recipe.paints.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: p.paint.hex }} />
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${p.ratio}%`, backgroundColor: p.paint.hex, minWidth: '8px' }}
                />
                <span className="text-[10px] text-[#8888a0] shrink-0">{p.ratio}%</span>
                <span className="text-[10px] text-[#55556a] truncate">{p.paint.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onLoad(recipe)}
          className="shrink-0 px-3 py-1.5 bg-[#ff6b4a]/10 hover:bg-[#ff6b4a]/20 text-[#ff6b4a] text-xs rounded-lg transition-colors"
        >
          Load
        </button>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PaintMixer({ baseColor, onColorSelect }) {
  const [medium, setMedium] = useState('watercolor');
  const [slots, setSlots] = useState(() => {
    const defaultPaints = getPaintsByMedium('watercolor').slice(0, 2);
    return defaultPaints.map((p, i) => ({
      paint: p,
      concentration: i === 0 ? 60 : 40,
    }));
  });
  const [activeTab, setActiveTab] = useState('mix');   // 'mix' | 'match' | 'learn'
  const [recipes, setRecipes] = useState([]);
  const [searching, setSearching] = useState(false);

  const paintPool = useMemo(() => getPaintsByMedium(medium), [medium]);

  // Normalise concentrations so they sum to 100
  const normalisedSlots = useMemo(() => {
    const total = slots.reduce((s, sl) => s + sl.concentration, 0);
    if (total === 0) return slots;
    return slots.map(sl => ({ ...sl, concentration: Math.round(sl.concentration / total * 100) }));
  }, [slots]);

  // Live mix result
  const mixResult = useMemo(() => {
    if (normalisedSlots.length === 0) return null;
    return simulateMix(normalisedSlots.map(sl => ({
      paintId: sl.paint.id,
      concentration: sl.concentration,
    })));
  }, [normalisedSlots]);

  const targetHex = oklchToHex(baseColor);

  // Handlers
  const handleMediumChange = useCallback((m) => {
    setMedium(m);
    const newPool = getPaintsByMedium(m);
    setSlots(newPool.slice(0, 2).map((p, i) => ({
      paint: p,
      concentration: i === 0 ? 60 : 40,
    })));
    setRecipes([]);
  }, []);

  const handleAddPaint = useCallback(() => {
    if (slots.length >= 4) return;
    const used = new Set(slots.map(s => s.paint.id));
    const next = paintPool.find(p => !used.has(p.id));
    if (!next) return;
    setSlots(prev => [...prev, { paint: next, concentration: 20 }]);
  }, [slots, paintPool]);

  const handleRemove = useCallback((i) => {
    setSlots(prev => prev.filter((_, idx) => idx !== i));
  }, []);

  const handleRatioChange = useCallback((i, val) => {
    setSlots(prev => prev.map((sl, idx) => idx === i ? { ...sl, concentration: val } : sl));
  }, []);

  const handlePaintChange = useCallback((i, paint) => {
    setSlots(prev => prev.map((sl, idx) => idx === i ? { ...sl, paint } : sl));
  }, []);

  const handleFindRecipes = useCallback(() => {
    setSearching(true);
    // Defer to next tick so UI updates
    setTimeout(() => {
      const found = findMixingRecipe(targetHex, { medium, maxPaints: 3, topResults: 4 });
      setRecipes(found);
      setSearching(false);
    }, 10);
  }, [targetHex, medium]);

  const handleLoadRecipe = useCallback((recipe) => {
    const newSlots = recipe.paints.map(rp => ({
      paint: rp.paint,
      concentration: rp.ratio,
    }));
    setSlots(newSlots);
    setActiveTab('mix');
  }, []);

  const handleUseResult = useCallback(() => {
    if (!mixResult || !onColorSelect) return;
    // Convert sRGB result back to something the app can use (approximate via hex parse)
    const hex = mixResult.hex;
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    // Rough sRGB → OKLCH via simple approximation (good enough as a starting point)
    const linearize = v => v <= 0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
    const rl=linearize(r), gl=linearize(g), bl=linearize(b);
    // sRGB → XYZ-D65
    const X = 0.4124564*rl + 0.3575761*gl + 0.1804375*bl;
    const Y = 0.2126729*rl + 0.7151522*gl + 0.0721750*bl;
    const Z = 0.0193339*rl + 0.1191920*gl + 0.9503041*bl;
    // XYZ → OKLAB → OKLCH
    const l_  = Math.cbrt(0.8189330101*X + 0.3618667424*Y - 0.1288597137*Z);
    const m_  = Math.cbrt(0.0329845436*X + 0.9293118715*Y + 0.0361456387*Z);
    const s_  = Math.cbrt(0.0482003018*X + 0.2643662691*Y + 0.6338517070*Z);
    const la  = 0.2104542553*(l_+m_) - 0.7936177850*(m_) + 0.5831706045*(s_)  + 0.9961128892*(l_);
    const lv  = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
    const aa  = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
    const bb  = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;
    const L   = lv;
    const c   = Math.sqrt(aa*aa + bb*bb);
    let   h   = Math.atan2(bb, aa) * 180 / Math.PI;
    if (h < 0) h += 360;
    if (onColorSelect) onColorSelect({ mode: 'oklch', l: Math.max(0,Math.min(1,L)), c: Math.max(0,c), h });
  }, [mixResult, onColorSelect]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-[#ff6b4a]" />
          <h2 className="text-sm font-medium text-[#f0f0f5]">Paint Mixer</h2>
        </div>
        <div className="flex items-center gap-1 bg-[#0a0a0f] rounded-lg p-1">
          {AVAILABLE_MEDIA.map(m => (
            <button
              key={m}
              onClick={() => handleMediumChange(m)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-colors ${
                medium === m ? 'bg-[#1a1a24] text-[#f0f0f5]' : 'text-[#55556a] hover:text-[#8888a0]'
              }`}
            >
              {MEDIUM_LABELS[m].icon} {MEDIUM_LABELS[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2 bg-[#ff6b4a]/5 rounded-lg p-3 border border-[#ff6b4a]/15">
        <AlertCircle size={13} className="text-[#ff6b4a] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#8888a0] leading-relaxed">
          Mixing uses <strong className="text-[#f0f0f5]">Kubelka-Munk subtractive theory</strong> with
          pigment spectral data from Golden, Winsor &amp; Newton, and Daniel Smith. Results are predictive,
          not additive RGB blending.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0a0f] p-1 rounded-lg">
        {[
          { id: 'mix',   label: 'Mix',    icon: FlaskConical },
          { id: 'match', label: 'Match',  icon: Target },
          { id: 'learn', label: 'Guide',  icon: BookOpen },
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
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── MIX TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'mix' && (
        <div className="space-y-4">
          {/* Paint slots */}
          <div className="space-y-2">
            {slots.map((slot, i) => (
              <PaintSlot
                key={i}
                slot={slot}
                index={i}
                onRemove={handleRemove}
                onRatioChange={handleRatioChange}
                onPaintChange={handlePaintChange}
                paintPool={paintPool}
              />
            ))}
          </div>

          {/* Add paint button */}
          {slots.length < 4 && (
            <button
              onClick={handleAddPaint}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#1a1a24] rounded-xl text-xs text-[#55556a] hover:border-[#ff6b4a]/40 hover:text-[#ff6b4a] transition-colors"
            >
              <Plus size={14} />
              Add paint (up to 4)
            </button>
          )}

          {/* Result */}
          {mixResult && (
            <div className="rounded-2xl border border-[#1a1a24] overflow-hidden">
              <div className="h-20" style={{ backgroundColor: mixResult.hex }} />
              <div className="bg-[#12121a] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-[#f0f0f5]">{mixResult.hex}</p>
                  <p className="text-[10px] text-[#55556a] mt-0.5">
                    KM subtractive mix · {normalisedSlots.map(s => `${s.concentration}% ${s.paint.name}`).join(' + ')}
                  </p>
                </div>
                <button
                  onClick={handleUseResult}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b4a] hover:bg-[#ff6b4a]/80 rounded-lg text-xs text-white font-medium transition-colors"
                >
                  <Pipette size={12} />
                  Use colour
                </button>
              </div>
            </div>
          )}

          {slots.length === 0 && (
            <p className="text-xs text-center text-[#55556a] py-6">Add paints above to start mixing</p>
          )}
        </div>
      )}

      {/* ── MATCH TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'match' && (
        <div className="space-y-4">
          {/* Target */}
          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4">
            <p className="text-xs text-[#8888a0] mb-2">Target colour</p>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl shadow-lg border border-white/10"
                style={{ backgroundColor: targetHex }}
              />
              <div>
                <p className="text-sm font-mono text-[#f0f0f5]">{targetHex}</p>
                <p className="text-[10px] text-[#55556a]">Current selected colour</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleFindRecipes}
            disabled={searching}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#ff6b4a] hover:bg-[#ff6b4a]/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm text-white font-medium transition-colors"
          >
            {searching
              ? <><Shuffle size={16} className="animate-spin" /> Calculating…</>
              : <><Target size={16} /> Find {medium} recipes</>
            }
          </button>

          {recipes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium">
                Best matches (KM spectral)
              </h3>
              {recipes.map((r, i) => (
                <RecipeCard
                  key={i}
                  recipe={r}
                  targetHex={targetHex}
                  onLoad={handleLoadRecipe}
                />
              ))}
            </div>
          )}

          {recipes.length === 0 && !searching && (
            <p className="text-xs text-center text-[#55556a] py-4">
              Click "Find recipes" to calculate the closest {medium} paint combinations
            </p>
          )}
        </div>
      )}

      {/* ── LEARN TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'learn' && (
        <div className="space-y-4 text-xs text-[#8888a0] leading-relaxed">
          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-[#fbbf24]" />
              <h3 className="text-sm font-medium text-[#f0f0f5]">Why subtractive mixing?</h3>
            </div>
            <p>
              Digital colour works <em>additively</em> — mixing red + green light gives yellow. Paint is the <em>opposite</em>:
              pigments <strong className="text-[#f0f0f5]">absorb</strong> wavelengths of light. Mixing paints subtracts
              light from the result.
            </p>
            <p>
              This calculator uses <strong className="text-[#f0f0f5]">Kubelka-Munk (K-M) theory</strong>, the accepted
              scientific model for opaque and semi-opaque paint layers. Each pigment has measured
              absorption (K) and scattering (S) coefficients across the visible spectrum
              (31 bands, 400–700 nm). They combine linearly when mixed.
            </p>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#f0f0f5]">Practical tips</h3>
            <ul className="space-y-2">
              {[
                ['Titanium White', 'Lightens without shifting hue much (high scattering), unlike Zinc White which is more transparent.'],
                ['Phthalo pigments', 'Extremely tinting strength — use sparingly. A tiny amount dominates a mix.'],
                ['Earth pigments', 'Ochres, umbers, siennas mix cleanly with almost anything. Great for neutralising and desaturating.'],
                ['Glazing', 'Transparent pigments (low K values) are better for glazes. Opaque pigments (high S) for body.'],
                ['Mud prevention', 'Avoid mixing complements in equal quantities. Use one to slightly neutralise the other instead.'],
              ].map(([term, desc]) => (
                <li key={term} className="flex gap-2">
                  <span className="text-[#ff6b4a] shrink-0">•</span>
                  <span><strong className="text-[#f0f0f5]">{term}</strong> — {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#12121a] rounded-xl border border-[#1a1a24] p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#f0f0f5]">Paint database</h3>
            <p>
              K/S spectral coefficients are derived from published reflectance measurements from
              Golden Artist Colors, Winsor &amp; Newton, and Daniel Smith. Currently {PAINT_DATABASE.length} paints
              across watercolor, oil, and acrylic.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {AVAILABLE_MEDIA.map(m => {
                const count = PAINT_DATABASE.filter(p => p.medium === m).length;
                return (
                  <div key={m} className="bg-[#0a0a0f] rounded-lg p-2 text-center">
                    <p className="text-lg">{MEDIUM_LABELS[m].icon}</p>
                    <p className="text-[10px] font-medium text-[#f0f0f5] capitalize">{m}</p>
                    <p className="text-[10px] text-[#55556a]">{count} paints</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
