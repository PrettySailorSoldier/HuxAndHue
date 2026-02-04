# CHROMATIC SMART FEATURES - INTEGRATION GUIDE

## 🎨 What You've Got

Two new intelligence engines for Chromatic:

1. **`paletteAnalyzer.js`** - Evaluates palette quality with design heuristics
2. **`smartHarmony.js`** - Generates context-aware palettes (UI, brand, editorial, etc.)

---

## 📁 File Structure

Place these files in your `src/utils/` directory:

```
src/
├── utils/
│   ├── colorUtils.js (existing)
│   ├── colorNames.js (existing)
│   ├── paletteAnalyzer.js ← NEW
│   └── smartHarmony.js ← NEW
├── components/
│   ├── PaletteDoctor.jsx ← CREATE THIS
│   ├── ContextSelector.jsx ← CREATE THIS
│   └── (existing components)
└── App.jsx (update this)
```

---

## 🚀 STEP 1: Create PaletteDoctor Component

This shows real-time palette analysis with one-click fixes.

**File: `src/components/PaletteDoctor.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { analyzePalette, addNeutralColor, expandLightnessRange, adjustForReadability } from '../utils/paletteAnalyzer';
import { oklchToHex } from '../utils/colorUtils';

export default function PaletteDoctor({ colors, onApplyFix }) {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (colors && colors.length > 0) {
      setAnalysis(analyzePalette(colors));
    }
  }, [colors]);

  if (!analysis || !colors || colors.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">Generate a palette to see analysis</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#4ade80'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    return '#f87171'; // Red
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'high') return <AlertCircle size={16} className="text-red-400" />;
    if (severity === 'medium') return <AlertCircle size={16} className="text-yellow-400" />;
    return <AlertCircle size={16} className="text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-bg-elevated rounded-xl p-5 border border-[#1a1a24]">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="text-5xl font-display font-bold"
            style={{ color: getScoreColor(analysis.healthScore) }}
          >
            {analysis.healthScore}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Palette Health
            </h3>
            <p className="text-xs text-text-secondary">
              {analysis.summary.quality} · {analysis.summary.recommendation}
            </p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="flex gap-2 h-2 rounded-full overflow-hidden bg-bg-deep">
          <div 
            className="bg-green-500 transition-all"
            style={{ width: `${analysis.healthScore}%` }}
          />
        </div>
      </div>

      {/* Issues & Fixes */}
      {analysis.issues.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
            Issues Found ({analysis.issues.length})
          </h4>
          
          {analysis.issues.map((issue, i) => (
            <div 
              key={i}
              className="bg-bg-elevated rounded-lg p-4 border border-[#1a1a24] hover:border-[#252530] transition-colors"
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-text-primary mb-1">
                    {issue.title}
                  </h5>
                  <p className="text-xs text-text-secondary mb-2">
                    {issue.message}
                  </p>
                  <p className="text-xs text-text-muted">
                    💡 {issue.recommendation}
                  </p>
                </div>
                
                {issue.fixable && (
                  <button
                    onClick={() => {
                      // Apply the appropriate fix
                      let fixed;
                      if (issue.type === 'saturation' && issue.message.includes('highly saturated')) {
                        fixed = addNeutralColor(colors);
                      } else if (issue.type === 'contrast') {
                        fixed = expandLightnessRange(colors);
                      } else if (issue.type === 'readability') {
                        fixed = adjustForReadability(colors);
                      }
                      
                      if (fixed) onApplyFix(fixed);
                    }}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg text-xs font-medium transition-colors shrink-0"
                  >
                    Fix
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Issues */}
      {analysis.issues.length === 0 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400 shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-green-400 mb-1">
                No Issues Found
              </h5>
              <p className="text-xs text-green-300/70">
                This palette follows design best practices
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium flex items-center gap-2">
            <TrendingUp size={12} />
            Suggested Improvements
          </h4>
          
          {analysis.improvements.slice(0, 3).map((improvement, i) => (
            <div key={i} className="text-xs text-text-muted bg-bg-elevated rounded-lg p-3 border border-[#1a1a24]">
              <span className="text-accent mr-1">•</span>
              {improvement.action}
            </div>
          ))}
        </div>
      )}

      {/* Usage Guidelines */}
      {Object.keys(analysis.usageMap).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
            Recommended Usage
          </h4>
          
          <div className="space-y-2">
            {Object.entries(analysis.usageMap).map(([role, colorIndex]) => (
              <div 
                key={role}
                className="flex items-center gap-3 bg-bg-elevated rounded-lg p-2 border border-[#1a1a24]"
              >
                <div 
                  className="w-8 h-8 rounded-lg shadow shrink-0"
                  style={{ backgroundColor: oklchToHex(colors[colorIndex]) }}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-primary capitalize">
                    {role.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {oklchToHex(colors[colorIndex])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Metrics Summary */}
      <div className="bg-bg-elevated rounded-lg p-4 border border-[#1a1a24] space-y-3">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
          Metrics
        </h4>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-text-muted mb-1">Saturation Range</p>
            <p className="text-text-primary font-medium">
              {(analysis.visualMetrics.saturationRange.spread * 100).toFixed(0)}%
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Lightness Range</p>
            <p className="text-text-primary font-medium">
              {(analysis.visualMetrics.lightnessDistribution.range * 100).toFixed(0)}%
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Readability</p>
            <p className="text-text-primary font-medium">
              {analysis.readability.passingPercentage.toFixed(0)}% passing
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Temperature</p>
            <p className="text-text-primary font-medium">
              {analysis.visualMetrics.temperatureBalance.isBalanced ? 'Balanced' : 
               analysis.visualMetrics.temperatureBalance.warmPercentage > 50 ? 'Warm' : 'Cool'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 STEP 2: Create ContextSelector Component

Let users choose design context for smart palette generation.

**File: `src/components/ContextSelector.jsx`**

```jsx
import { Layout, Zap, BookOpen, Minus, Sparkles, Briefcase } from 'lucide-react';
import { getContextMetadata } from '../utils/smartHarmony';

const CONTEXT_ICONS = {
  ui: Layout,
  brand: Zap,
  editorial: BookOpen,
  minimalist: Minus,
  vibrant: Sparkles,
  professional: Briefcase
};

export default function ContextSelector({ selectedContext, onContextSelect }) {
  const contexts = getContextMetadata();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
          Design Context
        </h3>
        <span className="text-[10px] text-text-muted">
          {contexts[selectedContext]?.colorCount || 5} colors
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(contexts).map(([id, meta]) => {
          const Icon = CONTEXT_ICONS[id];
          const isSelected = selectedContext === id;

          return (
            <button
              key={id}
              onClick={() => onContextSelect(id)}
              className={`
                group relative p-3 rounded-xl border transition-all text-left
                ${isSelected 
                  ? 'bg-accent/10 border-accent/40' 
                  : 'bg-bg-elevated border-[#1a1a24] hover:border-[#252530]'
                }
              `}
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon 
                  size={16} 
                  className={isSelected ? 'text-accent' : 'text-text-muted group-hover:text-text-secondary'}
                />
                <h4 className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                  {meta.name}
                </h4>
              </div>
              
              <p className="text-[10px] text-text-muted mb-2 line-clamp-2">
                {meta.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {meta.characteristics.slice(0, 2).map((char, i) => (
                  <span 
                    key={i}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-bg-deep text-text-muted"
                  >
                    {char}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Context info */}
      <div className="bg-bg-elevated rounded-lg p-3 border border-[#1a1a24]">
        <p className="text-xs text-text-secondary">
          {contexts[selectedContext]?.description}
        </p>
      </div>
    </div>
  );
}
```

---

## 🔧 STEP 3: Update App.jsx

Add the new features to your main app.

**Updates to make:**

### 3.1 Add imports

```jsx
// Add to existing imports
import PaletteDoctor from './components/PaletteDoctor';
import ContextSelector from './components/ContextSelector';
import { generateSmartHarmony } from './utils/smartHarmony';
import { analyzePalette } from './utils/paletteAnalyzer';
```

### 3.2 Add state

```jsx
// Add to existing state in App component
const [designContext, setDesignContext] = useState('ui');
```

### 3.3 Update harmony generation

Replace the `updateHarmony` function with:

```jsx
const updateHarmony = useCallback((harmonyType) => {
  if (!selectedColor) return;
  
  let colors;
  
  // If using smart context, generate context-aware palette
  if (harmonyType === 'smart') {
    colors = generateSmartHarmony(selectedColor, designContext);
  } else {
    // Original geometric harmonies
    switch (harmonyType) {
      case 'complementary': colors = getComplementary(selectedColor); break;
      case 'split-complementary': colors = getSplitComplementary(selectedColor); break;
      case 'triadic': colors = getTriadic(selectedColor); break;
      case 'tetradic': colors = getTetradic(selectedColor); break;
      case 'analogous': colors = getAnalogous(selectedColor, 5, 25); break;
      case 'monochromatic': colors = getMonochromatic(selectedColor); break;
      default: colors = getTriadic(selectedColor);
    }
  }
  
  setHarmonyColors(colors);
  setSelectedHarmony(harmonyType);
}, [selectedColor, designContext]);
```

### 3.4 Add handler for palette fixes

```jsx
const handleApplyFix = useCallback((fixedColors) => {
  setActivePalette(fixedColors);
  setMoodPalette(fixedColors);
  setHarmonyColors(fixedColors);
  addToHistory(fixedColors, 'auto-fixed palette');
}, [addToHistory]);
```

### 3.5 Add new tab

Update TABS array:

```jsx
const TABS = [
  { id: 'harmonies', label: 'Harmonies', icon: Grid3X3 },
  { id: 'smart', label: 'Smart', icon: Sparkles }, // ← NEW
  { id: 'mood', label: 'Moods', icon: Sparkles },
  { id: 'extract', label: 'Extract', icon: Image },
  { id: 'gradient', label: 'Gradients', icon: Blend },
  { id: 'mixer', label: 'Mixer', icon: Layers },
  { id: 'inspire', label: 'Inspire', icon: BookOpen },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'doctor', label: 'Doctor', icon: TrendingUp }, // ← NEW
];
```

### 3.6 Add new tab content

In the main content area where tab content is rendered:

```jsx
{activeTab === 'smart' && (
  <div className="space-y-6">
    <ContextSelector 
      selectedContext={designContext}
      onContextSelect={(context) => {
        setDesignContext(context);
        updateHarmony('smart');
      }}
    />
    
    <button
      onClick={() => updateHarmony('smart')}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/80 rounded-xl transition-colors"
    >
      <Sparkles size={16} />
      <span className="text-sm font-medium">Generate Smart Palette</span>
    </button>

    {harmonyColors.length > 0 && (
      <>
        <PaletteDisplay 
          colors={harmonyColors} 
          title={`${designContext} palette`} 
          format={colorFormat} 
          onColorClick={handleColorSelect} 
        />
        
        <div className="h-28 rounded-2xl overflow-hidden flex shadow-xl">
          {harmonyColors.map((color, i) => (
            <div 
              key={i} 
              className="flex-1 relative group cursor-pointer transition-all hover:flex-[1.5]" 
              style={{ backgroundColor: oklchToHex(color) }} 
              onClick={() => handleColorSelect(color)} 
            />
          ))}
        </div>
      </>
    )}
  </div>
)}

{activeTab === 'doctor' && (
  <PaletteDoctor 
    colors={activePalette.length > 0 ? activePalette : harmonyColors} 
    onApplyFix={handleApplyFix}
  />
)}
```

---

## 🎬 USAGE EXAMPLES

### Example 1: Generate UI Palette

```jsx
// User selects blue (#3b82f6)
// User chooses "UI/UX" context
// Clicks "Generate Smart Palette"

// Result: 6 colors
// - Primary blue (accessible)
// - Light blue background
// - Deep blue accent
// - Neutral grays
// - Success green
// - Error red
```

### Example 2: Fix Over-Saturated Palette

```jsx
// User generates vibrant triadic palette
// Switches to "Doctor" tab
// Sees issue: "Over-saturated palette - 75/100 score"
// Clicks "Fix" button
// Palette updated with neutral added
// New score: 88/100
```

### Example 3: Brand Identity

```jsx
// User picks coral pink
// Chooses "Branding" context
// Gets:
//   - Bold coral primary
//   - Sophisticated teal secondary (near-complement)
//   - Supporting peachy tone
//   - Warm and cool neutrals
```

---

## 🎨 VISUAL FEATURES YOU'LL SEE

### PaletteDoctor Tab
- **Health Score**: Big number (0-100) with color coding
- **Issues List**: Cards with severity icons and one-click fixes
- **Usage Guidelines**: Which color to use for what (primary, accent, background, text)
- **Metrics**: Saturation range, lightness contrast, readability %

### Smart Tab
- **Context Cards**: 6 design contexts with icons and descriptions
- **Characteristics Tags**: Shows what each context optimizes for
- **Generate Button**: Creates context-aware palette
- **Live Preview**: See the palette with proper hierarchy

---

## 🚀 DEPLOYMENT CHECKLIST

After integrating:

1. Test each context type with various base colors
2. Verify fixes actually improve scores
3. Check mobile responsiveness on new components
4. Test keyboard navigation
5. Add analytics tracking for context selection
6. Consider adding tooltips for complex metrics

---

## 💡 FUTURE ENHANCEMENTS

Once this is working, consider:

1. **AI Design Consultant**: Use Claude API for natural language feedback
2. **Export with Usage Guide**: Generate CSS with comments on usage
3. **Contrast Checker**: Live WCAG compliance for text on backgrounds
4. **Color Blindness Simulator**: Show how palette looks to different users
5. **Palette from Screenshot**: Upload UI screenshot, extract + analyze
6. **"Near" Harmony Variations**: Show 3 variations of each harmony type

---

## 📊 METRICS TO TRACK

For product analytics:

- Most popular design context
- Average health score improvement after fixes
- Which issues are most common
- Context switching patterns
- Time from generation to export

---

## 🎯 KEY USER FLOWS

**Flow 1: "Make my palette better"**
1. Generate any palette
2. Click "Doctor" tab
3. See health score + issues
4. Click "Fix" on top issue
5. Score improves
6. Export

**Flow 2: "I need a UI palette"**
1. Pick base color
2. Click "Smart" tab
3. Select "UI/UX" context
4. Click generate
5. Get accessible palette with semantic colors
6. Switch to "Preview" to see in UI mockup
7. Export

**Flow 3: "Explore contexts"**
1. Same base color
2. Try all 6 contexts
3. Compare results
4. Pick best fit
5. Fine-tune in "Doctor"
6. Export

---

## 🐛 DEBUGGING TIPS

If analysis shows unexpected results:

1. **Check color values**: Ensure OKLCH values are valid (L: 0-1, C: 0-0.4, H: 0-360)
2. **Log analysis object**: `console.log(analyzePalette(colors))`
3. **Test with known-good palette**: Try with manually created high-score palette
4. **Check imports**: Verify culori functions are imported correctly

---

Need me to create any of these components in full, or help debug integration?
