// paletteAnalyzer.js - Design Intelligence for Color Palettes
// Analyzes palettes based on design principles, not just color theory math

import { formatHex, wcagContrast, differenceEuclidean } from 'culori';

/**
 * Main analysis function - returns comprehensive palette evaluation
 */
export function analyzePalette(colors) {
  if (!colors || colors.length === 0) {
    return null;
  }

  const visualMetrics = analyzeVisualMetrics(colors);
  const designMetrics = analyzeDesignQuality(colors);
  const readability = analyzeReadability(colors);
  const issues = identifyIssues(colors, visualMetrics, designMetrics, readability);
  const improvements = suggestImprovements(colors, issues);
  const usageMap = generateUsageMap(colors, visualMetrics);
  const healthScore = calculateHealthScore(visualMetrics, designMetrics, readability, issues);

  return {
    healthScore,
    visualMetrics,
    designMetrics,
    readability,
    issues,
    improvements,
    usageMap,
    summary: generateSummary(healthScore, issues, visualMetrics)
  };
}

/**
 * VISUAL METRICS - Quantitative color properties
 */
function analyzeVisualMetrics(colors) {
  const chromaValues = colors.map(c => c.c || 0);
  const lightnessValues = colors.map(c => c.l || 0);
  const hueValues = colors.map(c => c.h || 0).filter(h => h !== undefined);

  return {
    saturationRange: {
      min: Math.min(...chromaValues),
      max: Math.max(...chromaValues),
      average: average(chromaValues),
      spread: Math.max(...chromaValues) - Math.min(...chromaValues),
      distribution: categorizeSaturation(chromaValues)
    },
    lightnessDistribution: {
      min: Math.min(...lightnessValues),
      max: Math.max(...lightnessValues),
      average: average(lightnessValues),
      range: Math.max(...lightnessValues) - Math.min(...lightnessValues),
      distribution: categorizeLightness(lightnessValues),
      hasContrast: Math.max(...lightnessValues) - Math.min(...lightnessValues) > 0.4
    },
    hueHarmony: {
      spread: calculateHueSpread(hueValues),
      isMonochromatic: hueValues.length > 0 && isMonochromatic(hueValues),
      isAnalogous: hueValues.length > 0 && isAnalogous(hueValues),
      diversity: calculateHueDiversity(hueValues)
    },
    temperatureBalance: analyzeTemperature(colors),
    colorCount: colors.length,
    uniqueHues: countUniqueHues(hueValues)
  };
}

/**
 * DESIGN QUALITY METRICS - Qualitative assessments
 */
function analyzeDesignQuality(colors) {
  return {
    hasNeutral: detectNeutral(colors),
    hasAnchor: detectAnchorColor(colors),
    hasHierarchy: checkVisualHierarchy(colors),
    hasDiversity: checkColorDiversity(colors),
    isBalanced: checkBalance(colors),
    neutralCount: countNeutrals(colors),
    accentCount: countAccents(colors)
  };
}

/**
 * READABILITY ANALYSIS - WCAG compliance and contrast
 */
function analyzeReadability(colors) {
  const pairs = [];
  const hexColors = colors.map(c => formatHex(c));
  
  for (let i = 0; i < hexColors.length; i++) {
    for (let j = i + 1; j < hexColors.length; j++) {
      const contrast = wcagContrast(hexColors[i], hexColors[j]);
      pairs.push({
        colors: [i, j],
        contrast,
        passesAA: contrast >= 4.5,
        passesAALarge: contrast >= 3,
        passesAAA: contrast >= 7
      });
    }
  }

  const passingPairs = pairs.filter(p => p.passesAA).length;
  const totalPairs = pairs.length;

  return {
    pairs,
    passingPairs,
    totalPairs,
    passingPercentage: totalPairs > 0 ? (passingPairs / totalPairs) * 100 : 0,
    bestContrast: Math.max(...pairs.map(p => p.contrast)),
    worstContrast: Math.min(...pairs.map(p => p.contrast)),
    hasGoodTextOptions: pairs.some(p => p.passesAAA)
  };
}

/**
 * ISSUE IDENTIFICATION - Find problems with actionable fixes
 */
function identifyIssues(colors, visualMetrics, designMetrics, readability) {
  const issues = [];

  // Issue 1: Over-saturated palette
  if (visualMetrics.saturationRange.min > 0.15) {
    issues.push({
      type: 'saturation',
      severity: 'medium',
      title: 'Over-saturated palette',
      message: 'All colors are highly saturated. This can be visually overwhelming.',
      recommendation: 'Add at least one neutral (low chroma) color for balance.',
      fixable: true
    });
  }

  // Issue 2: Under-saturated palette
  if (visualMetrics.saturationRange.max < 0.08) {
    issues.push({
      type: 'saturation',
      severity: 'medium',
      title: 'Under-saturated palette',
      message: 'All colors are muted. Palette may lack visual interest.',
      recommendation: 'Add a more saturated accent color to create focal points.',
      fixable: true
    });
  }

  // Issue 3: Poor lightness distribution
  if (!visualMetrics.lightnessDistribution.hasContrast) {
    issues.push({
      type: 'contrast',
      severity: 'high',
      title: 'Insufficient lightness contrast',
      message: 'Colors are too similar in lightness. This reduces visual hierarchy.',
      recommendation: 'Expand the lightness range to include both light and dark values.',
      fixable: true
    });
  }

  // Issue 4: Readability problems
  if (readability.passingPercentage < 30) {
    issues.push({
      type: 'readability',
      severity: 'high',
      title: 'Poor text readability',
      message: `Only ${Math.round(readability.passingPercentage)}% of color pairs meet WCAG AA standards.`,
      recommendation: 'Increase lightness contrast between colors for better text readability.',
      fixable: true
    });
  }

  // Issue 5: Missing neutral
  if (!designMetrics.hasNeutral && colors.length > 3) {
    issues.push({
      type: 'composition',
      severity: 'medium',
      title: 'No neutral color',
      message: 'Palette lacks a neutral for backgrounds and breathing room.',
      recommendation: 'Add a desaturated color (chroma < 0.05) for flexibility.',
      fixable: true
    });
  }

  // Issue 6: Too many colors
  if (colors.length > 7) {
    issues.push({
      type: 'composition',
      severity: 'low',
      title: 'Large palette',
      message: 'Palettes with more than 7 colors can be difficult to apply consistently.',
      recommendation: 'Consider focusing on 5-7 core colors for better cohesion.',
      fixable: false
    });
  }

  // Issue 7: Too few colors
  if (colors.length < 3 && colors.length > 0) {
    issues.push({
      type: 'composition',
      severity: 'low',
      title: 'Limited palette',
      message: 'Very small palettes may lack versatility for complex designs.',
      recommendation: 'Consider adding 1-2 more colors for more design options.',
      fixable: true
    });
  }

  // Issue 8: No clear hierarchy
  if (!designMetrics.hasHierarchy && colors.length > 2) {
    issues.push({
      type: 'hierarchy',
      severity: 'medium',
      title: 'Unclear visual hierarchy',
      message: 'Colors are too similar in visual weight.',
      recommendation: 'Ensure one color stands out as primary through saturation or lightness.',
      fixable: true
    });
  }

  // Issue 9: All warm or all cool
  const tempBalance = visualMetrics.temperatureBalance;
  if (tempBalance.warmPercentage > 90 || tempBalance.coolPercentage > 90) {
    issues.push({
      type: 'temperature',
      severity: 'low',
      title: 'Temperature imbalance',
      message: `Palette is ${tempBalance.warmPercentage > 90 ? 'all warm' : 'all cool'} colors.`,
      recommendation: 'Consider adding a contrasting temperature for balance.',
      fixable: true
    });
  }

  return issues;
}

/**
 * IMPROVEMENT SUGGESTIONS
 */
function suggestImprovements(colors, issues) {
  const improvements = [];

  // Suggest based on issues
  issues.forEach(issue => {
    if (issue.fixable) {
      improvements.push({
        type: issue.type,
        priority: issue.severity === 'high' ? 1 : issue.severity === 'medium' ? 2 : 3,
        action: issue.recommendation
      });
    }
  });

  // General improvements
  if (colors.length >= 3) {
    improvements.push({
      type: 'refinement',
      priority: 3,
      action: 'Fine-tune hue relationships for more sophisticated harmony.',
      details: 'Instead of exact geometric harmonies, try ±5-15° variations.'
    });
  }

  return improvements.sort((a, b) => a.priority - b.priority);
}

/**
 * USAGE MAP - Suggest which color for which purpose
 */
function generateUsageMap(colors, visualMetrics) {
  const roles = {};
  
  // Find primary (most saturated + mid lightness)
  const primaryIndex = findPrimaryColor(colors);
  if (primaryIndex !== -1) roles.primary = primaryIndex;

  // Find accent (high saturation, contrasting hue)
  const accentIndex = findAccentColor(colors, primaryIndex);
  if (accentIndex !== -1) roles.accent = accentIndex;

  // Find neutral (lowest saturation)
  const neutralIndex = findNeutralColor(colors);
  if (neutralIndex !== -1) roles.neutral = neutralIndex;

  // Find background (light + low saturation)
  const bgIndex = findBackgroundColor(colors);
  if (bgIndex !== -1) roles.background = bgIndex;

  // Find text (dark + readable)
  const textIndex = findTextColor(colors);
  if (textIndex !== -1) roles.text = textIndex;

  return roles;
}

/**
 * HEALTH SCORE - 0-100 overall palette quality
 */
function calculateHealthScore(visualMetrics, designMetrics, readability, issues) {
  let score = 100;

  // Deduct for issues
  issues.forEach(issue => {
    if (issue.severity === 'high') score -= 15;
    if (issue.severity === 'medium') score -= 10;
    if (issue.severity === 'low') score -= 5;
  });

  // Bonus for good practices
  if (designMetrics.hasNeutral) score += 5;
  if (designMetrics.hasHierarchy) score += 5;
  if (visualMetrics.lightnessDistribution.hasContrast) score += 5;
  if (readability.passingPercentage > 50) score += 10;
  if (visualMetrics.hueHarmony.diversity > 0.3) score += 5;

  return Math.max(0, Math.min(100, score));
}

/**
 * SUMMARY - Human-readable overview
 */
function generateSummary(healthScore, issues, visualMetrics) {
  let quality = 'Needs improvement';
  if (healthScore >= 80) quality = 'Excellent';
  else if (healthScore >= 60) quality = 'Good';
  else if (healthScore >= 40) quality = 'Fair';

  const criticalIssues = issues.filter(i => i.severity === 'high').length;
  
  return {
    quality,
    score: healthScore,
    criticalIssueCount: criticalIssues,
    recommendation: criticalIssues > 0 
      ? 'Address critical issues first for best results.'
      : 'Fine-tune for perfection or use as-is.'
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function categorizeSaturation(chromaValues) {
  const high = chromaValues.filter(c => c > 0.15).length;
  const medium = chromaValues.filter(c => c > 0.08 && c <= 0.15).length;
  const low = chromaValues.filter(c => c <= 0.08).length;
  return { high, medium, low };
}

function categorizeLightness(lightnessValues) {
  const light = lightnessValues.filter(l => l > 0.7).length;
  const medium = lightnessValues.filter(l => l >= 0.3 && l <= 0.7).length;
  const dark = lightnessValues.filter(l => l < 0.3).length;
  return { light, medium, dark };
}

function calculateHueSpread(hues) {
  if (hues.length < 2) return 0;
  const sorted = [...hues].sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1]);
  }
  // Also check wraparound
  maxGap = Math.max(maxGap, 360 - sorted[sorted.length - 1] + sorted[0]);
  return maxGap;
}

function isMonochromatic(hues) {
  if (hues.length < 2) return false;
  const maxDiff = Math.max(...hues) - Math.min(...hues);
  return maxDiff < 30;
}

function isAnalogous(hues) {
  if (hues.length < 2) return false;
  const maxDiff = Math.max(...hues) - Math.min(...hues);
  return maxDiff > 30 && maxDiff < 90;
}

function calculateHueDiversity(hues) {
  if (hues.length < 2) return 0;
  const sorted = [...hues].sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i] - sorted[i - 1];
  }
  totalGap += 360 - sorted[sorted.length - 1] + sorted[0];
  return totalGap / 360; // 0-1 scale
}

function analyzeTemperature(colors) {
  let warmCount = 0;
  let coolCount = 0;
  let neutralCount = 0;

  colors.forEach(color => {
    const h = color.h || 0;
    if (h >= 0 && h < 60 || h >= 300 && h < 360) warmCount++; // Red-Yellow
    else if (h >= 120 && h < 240) coolCount++; // Green-Blue
    else neutralCount++;
  });

  const total = colors.length;
  return {
    warmCount,
    coolCount,
    neutralCount,
    warmPercentage: (warmCount / total) * 100,
    coolPercentage: (coolCount / total) * 100,
    isBalanced: Math.abs(warmCount - coolCount) <= 1
  };
}

function countUniqueHues(hues) {
  const tolerance = 15; // degrees
  const unique = [];
  hues.forEach(h => {
    if (!unique.some(u => Math.abs(u - h) < tolerance)) {
      unique.push(h);
    }
  });
  return unique.length;
}

function detectNeutral(colors) {
  return colors.some(c => (c.c || 0) < 0.05);
}

function detectAnchorColor(colors) {
  // Primary should be mid-lightness and reasonably saturated
  return colors.some(c => {
    const l = c.l || 0;
    const chroma = c.c || 0;
    return l >= 0.4 && l <= 0.7 && chroma >= 0.12;
  });
}

function checkVisualHierarchy(colors) {
  if (colors.length < 2) return true;
  
  // Check if there's variation in both saturation and lightness
  const chromaValues = colors.map(c => c.c || 0);
  const lightnessValues = colors.map(c => c.l || 0);
  
  const chromaRange = Math.max(...chromaValues) - Math.min(...chromaValues);
  const lightnessRange = Math.max(...lightnessValues) - Math.min(...lightnessValues);
  
  return chromaRange > 0.08 || lightnessRange > 0.3;
}

function checkColorDiversity(colors) {
  if (colors.length < 2) return false;
  
  const hues = colors.map(c => c.h || 0).filter(h => h !== undefined);
  return countUniqueHues(hues) >= Math.min(3, colors.length);
}

function checkBalance(colors) {
  const lightness = colors.map(c => c.l || 0);
  const avg = average(lightness);
  return avg >= 0.35 && avg <= 0.65; // Not too light or too dark overall
}

function countNeutrals(colors) {
  return colors.filter(c => (c.c || 0) < 0.05).length;
}

function countAccents(colors) {
  return colors.filter(c => (c.c || 0) > 0.18).length;
}

function findPrimaryColor(colors) {
  let bestIndex = -1;
  let bestScore = -1;

  colors.forEach((color, i) => {
    const l = color.l || 0;
    const chroma = color.c || 0;
    
    // Score based on mid-lightness and good saturation
    const lightnessScore = 1 - Math.abs(l - 0.6);
    const chromaScore = Math.min(chroma / 0.2, 1);
    const score = lightnessScore * chromaScore;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  });

  return bestIndex;
}

function findAccentColor(colors, primaryIndex) {
  if (colors.length < 2) return -1;
  
  let bestIndex = -1;
  let bestChroma = -1;

  colors.forEach((color, i) => {
    if (i === primaryIndex) return;
    const chroma = color.c || 0;
    if (chroma > bestChroma) {
      bestChroma = chroma;
      bestIndex = i;
    }
  });

  return bestIndex;
}

function findNeutralColor(colors) {
  let bestIndex = -1;
  let lowestChroma = Infinity;

  colors.forEach((color, i) => {
    const chroma = color.c || 0;
    if (chroma < lowestChroma) {
      lowestChroma = chroma;
      bestIndex = i;
    }
  });

  return lowestChroma < 0.1 ? bestIndex : -1;
}

function findBackgroundColor(colors) {
  let bestIndex = -1;
  let bestScore = -1;

  colors.forEach((color, i) => {
    const l = color.l || 0;
    const chroma = color.c || 0;
    
    // Good backgrounds are light and low saturation
    if (l > 0.85 && chroma < 0.1) {
      const score = l * (1 - chroma);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
  });

  return bestIndex;
}

function findTextColor(colors) {
  let bestIndex = -1;
  let bestScore = -1;

  colors.forEach((color, i) => {
    const l = color.l || 0;
    
    // Good text colors are very dark
    if (l < 0.3) {
      if (l < bestScore || bestScore === -1) {
        bestScore = l;
        bestIndex = i;
      }
    }
  });

  return bestIndex;
}

/**
 * PALETTE FIXING FUNCTIONS - Return new palettes with improvements
 */
export function addNeutralColor(colors) {
  // Add a neutral based on average hue
  const hues = colors.map(c => c.h || 0).filter(h => h !== undefined);
  const avgHue = hues.length > 0 ? average(hues) : 0;

  return [
    ...colors,
    {
      mode: 'oklch',
      l: 0.90,
      c: 0.02,
      h: avgHue
    }
  ];
}

export function expandLightnessRange(colors) {
  // Spread lightness values across a wider range
  const sorted = [...colors].sort((a, b) => (a.l || 0) - (b.l || 0));
  
  return sorted.map((color, i, arr) => {
    const targetL = 0.2 + (i / (arr.length - 1)) * 0.6; // Spread from 0.2 to 0.8
    return {
      ...color,
      l: targetL
    };
  });
}

export function adjustForReadability(colors) {
  // Ensure at least one very light and one very dark color
  const lightest = colors.reduce((max, c) => c.l > max.l ? c : max, colors[0]);
  const darkest = colors.reduce((min, c) => c.l < min.l ? c : min, colors[0]);

  return colors.map(color => {
    if (color === lightest && color.l < 0.9) {
      return { ...color, l: 0.92 };
    }
    if (color === darkest && color.l > 0.2) {
      return { ...color, l: 0.15 };
    }
    return color;
  });
}

export function balancePalette(colors) {
  // Ensure good saturation distribution
  const targetChromas = [0.20, 0.14, 0.08, 0.03, 0.01];
  
  return colors.map((color, i) => ({
    ...color,
    c: targetChromas[i % targetChromas.length]
  }));
}

export function ensureHierarchy(colors) {
  // Make first color the clear primary
  return colors.map((color, i) => {
    if (i === 0) {
      return {
        ...color,
        l: 0.6,
        c: Math.max(color.c || 0, 0.18)
      };
    }
    return color;
  });
}
