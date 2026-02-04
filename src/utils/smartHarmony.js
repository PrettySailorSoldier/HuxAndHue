// smartHarmony.js - Context-Aware Palette Generation
// Generates palettes based on design context, not just geometric color theory

import { toOklch, oklchToHex } from './colorUtils';

/**
 * Main smart harmony generator - routes to context-specific functions
 */
export function generateSmartHarmony(baseColor, context = 'ui', options = {}) {
  const strategies = {
    ui: generateUIHarmony,
    brand: generateBrandHarmony,
    editorial: generateEditorialHarmony,
    minimalist: generateMinimalistHarmony,
    vibrant: generateVibrantHarmony,
    professional: generateProfessionalHarmony
  };

  const generator = strategies[context] || strategies.ui;
  return generator(baseColor, options);
}

/**
 * UI/UX HARMONY - Accessible, hierarchical, functional
 * Needs: primary, secondary, accent, neutrals, semantic colors
 */
function generateUIHarmony(base, options = {}) {
  const { includeSemantics = true } = options;
  
  const palette = {
    primary: {
      ...base,
      l: clamp(base.l, 0.45, 0.65), // Ensure mid-range for accessibility
      c: Math.max(base.c || 0, 0.15) // Ensure visible saturation
    },
    
    // Secondary: analogous but muted for backgrounds
    secondary: {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 30),
      c: (base.c || 0) * 0.25,
      l: 0.96
    },
    
    // Tertiary background
    tertiary: {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) - 20),
      c: (base.c || 0) * 0.15,
      l: 0.98
    },
    
    // Accent: adjusted complement with high contrast
    accent: {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 180),
      c: Math.min(0.22, (base.c || 0) * 1.3), // Boost but cap chroma
      l: base.l > 0.6 ? 0.42 : 0.68 // Ensure contrast with primary
    },
    
    // Neutral light
    neutralLight: {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.01,
      l: 0.95
    },
    
    // Neutral dark
    neutralDark: {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.02,
      l: 0.15
    }
  };

  // Add semantic colors if requested
  if (includeSemantics) {
    palette.success = generateSemanticGreen(base);
    palette.warning = generateSemanticYellow(base);
    palette.error = generateSemanticRed(base);
    palette.info = generateSemanticBlue(base);
  }

  return Object.values(palette);
}

/**
 * BRAND HARMONY - Bold, memorable, limited
 * Needs: strong primary, sophisticated secondary, flexible neutral
 */
function generateBrandHarmony(base, options = {}) {
  const { colorCount = 5 } = options;
  
  // Ensure primary is bold
  const primary = {
    ...base,
    c: Math.max(base.c || 0, 0.18), // Ensure saturation
    l: clamp(base.l, 0.35, 0.65) // Ensure visibility
  };

  // Sophisticated secondary - "near complement" not exact opposite
  const complementAngle = 150 + (Math.random() - 0.5) * 40; // 130-170° instead of exactly 180°
  const secondary = {
    mode: 'oklch',
    h: normalizeHue((primary.h || 0) + complementAngle),
    c: (primary.c || 0) * 0.75,
    l: primary.l > 0.5 ? primary.l - 0.25 : primary.l + 0.25
  };

  const palette = [
    primary,
    secondary,
    
    // Supporting color - analogous to primary
    {
      mode: 'oklch',
      h: normalizeHue((primary.h || 0) + 40),
      c: (primary.c || 0) * 0.6,
      l: primary.l
    },
    
    // Warm neutral
    {
      mode: 'oklch',
      h: primary.h || 0,
      c: 0.03,
      l: 0.85
    },
    
    // Cool neutral (dark)
    {
      mode: 'oklch',
      h: (primary.h || 0) + 180,
      c: 0.02,
      l: 0.12
    }
  ];

  return palette.slice(0, colorCount);
}

/**
 * EDITORIAL HARMONY - Sophisticated, refined, cultural
 * Needs: elegant primaries, subtle variations, rich blacks
 */
function generateEditorialHarmony(base, options = {}) {
  const { style = 'classic' } = options; // classic, modern, bold
  
  // Editorial colors are often desaturated for sophistication
  const desaturationFactor = style === 'bold' ? 0.8 : 0.6;
  
  const palette = [
    // Primary - refined version of base
    {
      ...base,
      c: (base.c || 0) * desaturationFactor,
      l: clamp(base.l, 0.3, 0.6)
    },
    
    // Split complement - but subtle
    {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 150),
      c: (base.c || 0) * 0.5,
      l: base.l * 1.2
    },
    {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 210),
      c: (base.c || 0) * 0.5,
      l: base.l * 0.8
    },
    
    // Rich warm neutral
    {
      mode: 'oklch',
      h: 40, // Warm hue
      c: 0.015,
      l: 0.92
    },
    
    // Deep rich black
    {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.01,
      l: 0.08
    },
    
    // Accent for pull quotes
    {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 90),
      c: Math.min((base.c || 0) * 1.5, 0.18),
      l: 0.5
    }
  ];

  return palette;
}

/**
 * MINIMALIST HARMONY - Limited, intentional, breathing room
 * Needs: 3-4 colors max, high contrast, lots of negative space
 */
function generateMinimalistHarmony(base, options = {}) {
  const { allowColor = true } = options;
  
  if (!allowColor) {
    // Pure monochrome
    return [
      { mode: 'oklch', l: 0.98, c: 0, h: 0 },
      { mode: 'oklch', l: 0.15, c: 0, h: 0 },
      { mode: 'oklch', l: 0.50, c: 0, h: 0 }
    ];
  }

  // Minimal color - one accent, rest neutral
  return [
    // Main accent - punchy
    {
      ...base,
      c: Math.max(base.c || 0, 0.16),
      l: 0.55
    },
    
    // Near white
    {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.005,
      l: 0.98
    },
    
    // Near black
    {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.01,
      l: 0.12
    },
    
    // Optional subtle tint
    {
      mode: 'oklch',
      h: base.h || 0,
      c: 0.03,
      l: 0.93
    }
  ];
}

/**
 * VIBRANT HARMONY - Energetic, bold, saturated
 * Needs: high chroma, diverse hues, dynamic contrast
 */
function generateVibrantHarmony(base, options = {}) {
  const { intensity = 'high' } = options; // medium, high, extreme
  
  const chromaMultiplier = {
    medium: 1.2,
    high: 1.4,
    extreme: 1.6
  }[intensity];

  // Generate near-triadic with high saturation
  const baseHue = base.h || 0;
  const hueOffsets = [0, 115, 235]; // Not exactly 120° apart
  
  const palette = hueOffsets.map((offset, i) => ({
    mode: 'oklch',
    h: normalizeHue(baseHue + offset + (Math.random() - 0.5) * 20),
    c: Math.min(0.28, (base.c || 0.15) * chromaMultiplier),
    l: 0.5 + (Math.random() - 0.5) * 0.3 // Vary lightness for interest
  }));

  // Add complementary accent
  palette.push({
    mode: 'oklch',
    h: normalizeHue(baseHue + 180 + (Math.random() - 0.5) * 30),
    c: Math.min(0.25, (base.c || 0.15) * chromaMultiplier),
    l: 0.6
  });

  // Add one neutral for balance
  palette.push({
    mode: 'oklch',
    h: baseHue,
    c: 0.02,
    l: 0.95
  });

  return palette;
}

/**
 * PROFESSIONAL HARMONY - Corporate, trustworthy, balanced
 * Needs: blues/neutrals, conservative saturation, clear hierarchy
 */
function generateProfessionalHarmony(base, options = {}) {
  const { sector = 'tech' } = options; // tech, finance, healthcare, legal
  
  // Sector-specific adjustments
  const sectorHues = {
    tech: [210, 240], // Blues
    finance: [210, 140], // Blue-green
    healthcare: [200, 160], // Blue-teal
    legal: [220, 40] // Blue-warm neutral
  };

  const preferredHues = sectorHues[sector] || sectorHues.tech;
  
  const palette = [
    // Primary - shift toward professional hues
    {
      mode: 'oklch',
      h: preferredHues[0],
      c: 0.12, // Conservative saturation
      l: 0.50
    },
    
    // Secondary
    {
      mode: 'oklch',
      h: preferredHues[1],
      c: 0.10,
      l: 0.60
    },
    
    // Accent - slightly more saturated
    {
      mode: 'oklch',
      h: preferredHues[0] + 180,
      c: 0.15,
      l: 0.55
    },
    
    // Light neutral
    {
      mode: 'oklch',
      h: preferredHues[0],
      c: 0.01,
      l: 0.96
    },
    
    // Medium gray
    {
      mode: 'oklch',
      h: preferredHues[0],
      c: 0.01,
      l: 0.60
    },
    
    // Dark neutral
    {
      mode: 'oklch',
      h: preferredHues[0],
      c: 0.015,
      l: 0.18
    }
  ];

  return palette;
}

// ============================================================================
// "NEAR HARMONY" GENERATORS - Imperfect but interesting
// ============================================================================

/**
 * Near-Triadic - Triadic with slight variations
 */
export function generateNearTriadic(base, options = {}) {
  const { variation = 15 } = options; // degrees of variation
  
  const vary = () => (Math.random() - 0.5) * variation * 2;
  
  return [
    base,
    {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 120 + vary()),
      c: (base.c || 0) * (0.7 + Math.random() * 0.6),
      l: base.l + (Math.random() - 0.5) * 0.25
    },
    {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + 240 + vary()),
      c: (base.c || 0) * (0.7 + Math.random() * 0.6),
      l: base.l + (Math.random() - 0.5) * 0.25
    }
  ];
}

/**
 * Near-Complementary - Complement with offset
 */
export function generateNearComplementary(base, options = {}) {
  const { offset = 20 } = options; // degrees from true complement
  
  const complementHue = normalizeHue((base.h || 0) + 180 + (Math.random() - 0.5) * offset * 2);
  
  return [
    base,
    {
      mode: 'oklch',
      h: complementHue,
      c: (base.c || 0) * (0.8 + Math.random() * 0.4),
      l: base.l > 0.5 ? base.l - 0.3 : base.l + 0.3
    }
  ];
}

/**
 * Golden Ratio Harmony - Uses golden angle (137.5°)
 */
export function generateGoldenHarmony(base, options = {}) {
  const { count = 5 } = options;
  const goldenAngle = 137.508;
  
  return Array.from({ length: count }, (_, i) => ({
    mode: 'oklch',
    h: normalizeHue((base.h || 0) + goldenAngle * i),
    c: (base.c || 0) * (0.6 + Math.random() * 0.8),
    l: 0.35 + (Math.sin(i * Math.PI / count) * 0.4) // Vary lightness in wave
  }));
}

// ============================================================================
// SEMANTIC COLOR GENERATORS - Success, Error, Warning, Info
// ============================================================================

function generateSemanticGreen(baseColor) {
  // Success - green but harmonized with base
  const baseHue = baseColor.h || 0;
  
  // If base is already greenish, use it; otherwise use standard green
  const targetHue = (baseHue >= 90 && baseHue <= 150) ? baseHue : 140;
  
  return {
    mode: 'oklch',
    h: targetHue,
    c: 0.16,
    l: 0.55
  };
}

function generateSemanticRed(baseColor) {
  // Error - red but harmonized
  const baseHue = baseColor.h || 0;
  const targetHue = (baseHue >= 0 && baseHue <= 30) || baseHue >= 330 ? baseHue : 10;
  
  return {
    mode: 'oklch',
    h: targetHue,
    c: 0.20,
    l: 0.52
  };
}

function generateSemanticYellow(baseColor) {
  // Warning - orange/yellow
  return {
    mode: 'oklch',
    h: 70, // Orange-yellow
    c: 0.18,
    l: 0.65
  };
}

function generateSemanticBlue(baseColor) {
  // Info - blue
  const baseHue = baseColor.h || 0;
  const targetHue = (baseHue >= 200 && baseHue <= 260) ? baseHue : 230;
  
  return {
    mode: 'oklch',
    h: targetHue,
    c: 0.14,
    l: 0.58
  };
}

// ============================================================================
// ADVANCED HARMONY TECHNIQUES
// ============================================================================

/**
 * Monochromatic with Intentional Variation
 * Not just lightness steps - adds subtle hue shifts
 */
export function generateAdvancedMonochromatic(base, options = {}) {
  const { count = 5, hueShift = 5 } = options;
  
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 to 1
    
    return {
      mode: 'oklch',
      h: normalizeHue((base.h || 0) + (t - 0.5) * hueShift * 2), // Subtle hue shift
      c: (base.c || 0) * (0.3 + t * 0.7), // Gradually increase saturation
      l: 0.2 + t * 0.7 // Light to dark
    };
  });
}

/**
 * Temperature-Based Harmony
 * Generate palette biased toward warm or cool
 */
export function generateTemperatureHarmony(base, options = {}) {
  const { temperature = 'warm', diversity = 'medium' } = options;
  
  const warmHues = [0, 30, 50]; // Red, orange, yellow range
  const coolHues = [180, 210, 240]; // Cyan, blue, violet range
  
  const targetHues = temperature === 'warm' ? warmHues : coolHues;
  const diversitySpread = { low: 20, medium: 40, high: 60 }[diversity];
  
  return targetHues.map(hue => ({
    mode: 'oklch',
    h: normalizeHue(hue + (Math.random() - 0.5) * diversitySpread),
    c: 0.10 + Math.random() * 0.12,
    l: 0.4 + Math.random() * 0.3
  }));
}

/**
 * Analogous with Depth
 * Analogous harmony but with lightness/saturation variation
 */
export function generateAnalogousWithDepth(base, options = {}) {
  const { spread = 30, count = 5 } = options;
  const baseHue = base.h || 0;
  
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    const hueOffset = -spread / 2 + t * spread;
    
    return {
      mode: 'oklch',
      h: normalizeHue(baseHue + hueOffset),
      c: (base.c || 0) * (0.5 + Math.sin(t * Math.PI) * 0.5), // Vary chroma in wave
      l: base.l + (Math.cos(t * Math.PI) * 0.2) // Vary lightness
    };
  });
}

/**
 * Contrast-Optimized Palette
 * Ensures maximum WCAG compliance
 */
export function generateContrastOptimized(base, options = {}) {
  const { style = 'light' } = options; // light or dark theme
  
  if (style === 'light') {
    return [
      // Primary
      { ...base, l: 0.45, c: Math.max(base.c || 0, 0.15) },
      
      // Secondary
      { mode: 'oklch', h: normalizeHue((base.h || 0) + 120), l: 0.52, c: 0.12 },
      
      // Accent
      { mode: 'oklch', h: normalizeHue((base.h || 0) + 180), l: 0.40, c: 0.18 },
      
      // Light background
      { mode: 'oklch', h: base.h || 0, l: 0.98, c: 0.01 },
      
      // Text color
      { mode: 'oklch', h: base.h || 0, l: 0.15, c: 0.02 }
    ];
  } else {
    return [
      // Primary
      { ...base, l: 0.65, c: Math.max(base.c || 0, 0.15) },
      
      // Secondary
      { mode: 'oklch', h: normalizeHue((base.h || 0) + 120), l: 0.58, c: 0.12 },
      
      // Accent
      { mode: 'oklch', h: normalizeHue((base.h || 0) + 180), l: 0.70, c: 0.18 },
      
      // Dark background
      { mode: 'oklch', h: base.h || 0, l: 0.08, c: 0.01 },
      
      // Text color
      { mode: 'oklch', h: base.h || 0, l: 0.95, c: 0.02 }
    ];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function normalizeHue(hue) {
  while (hue < 0) hue += 360;
  while (hue >= 360) hue -= 360;
  return hue;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get context metadata for UI display
 */
export function getContextMetadata() {
  return {
    ui: {
      name: 'UI/UX',
      description: 'Accessible, hierarchical palettes for user interfaces',
      colorCount: 6,
      characteristics: ['High contrast', 'WCAG compliant', 'Clear hierarchy']
    },
    brand: {
      name: 'Branding',
      description: 'Bold, memorable palettes for brand identity',
      colorCount: 5,
      characteristics: ['High saturation', 'Distinctive', 'Flexible']
    },
    editorial: {
      name: 'Editorial',
      description: 'Sophisticated palettes for publishing and content',
      colorCount: 6,
      characteristics: ['Refined', 'Elegant', 'Readable']
    },
    minimalist: {
      name: 'Minimalist',
      description: 'Limited palettes emphasizing negative space',
      colorCount: 4,
      characteristics: ['Intentional', 'Restrained', 'Breathing room']
    },
    vibrant: {
      name: 'Vibrant',
      description: 'Energetic palettes with high saturation',
      colorCount: 5,
      characteristics: ['Bold', 'Dynamic', 'Attention-grabbing']
    },
    professional: {
      name: 'Professional',
      description: 'Corporate palettes conveying trust and stability',
      colorCount: 6,
      characteristics: ['Conservative', 'Trustworthy', 'Balanced']
    }
  };
}
