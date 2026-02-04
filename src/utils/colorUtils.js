import { 
  converter, 
  formatHex, 
  wcagContrast, 
  differenceEuclidean, 
  random, 
  displayable 
} from 'culori';

const oklch = converter('oklch');

export const toOklch = (color) => {
  const c = oklch(color);
  // Ensure values are numbers and handle undefined hues
  return {
    mode: 'oklch',
    l: c.l || 0,
    c: c.c || 0,
    h: c.h || 0
  };
};

export const oklchToHex = (color) => {
  try {
    return formatHex(color);
  } catch (e) {
    return '#000000';
  }
};

export const generateMoodPalette = (mood, baseColor) => {
  const base = toOklch(baseColor);
  // Simplified logic for moods
  const palettes = {
    happy: [0, 30, 60, 180, 240],
    calm: [180, 200, 220, 240, 0],
    energetic: [0, 45, 90, 15, 300],
    // ... add more moods as needed
  };
  
  const offsets = palettes[mood] || [0, 30, 60, 90, 120];
  
  return offsets.map(offset => ({
    mode: 'oklch',
    l: base.l,
    c: base.c,
    h: (base.h + offset) % 360
  }));
};

export const generateRandomHarmony = ({ count = 5 }) => {
  const base = { mode: 'oklch', l: 0.6 + Math.random() * 0.2, c: 0.1 + Math.random() * 0.1, h: Math.random() * 360 };
  return getAnalogous(base, count, 30);
};

export const getComplementary = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 180) % 360 }
  ];
};

export const getSplitComplementary = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 150) % 360 },
    { ...c, h: (c.h + 210) % 360 }
  ];
};

export const getTriadic = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 120) % 360 },
    { ...c, h: (c.h + 240) % 360 }
  ];
};

export const getTetradic = (color) => {
  const c = toOklch(color);
  return [
    c,
    { ...c, h: (c.h + 90) % 360 },
    { ...c, h: (c.h + 180) % 360 },
    { ...c, h: (c.h + 270) % 360 }
  ];
};

export const getAnalogous = (color, count = 5, slice = 30) => {
  const c = toOklch(color);
  return Array.from({ length: count }, (_, i) => ({
    ...c,
    h: (c.h + (i - Math.floor(count / 2)) * (slice / count)) % 360
  }));
};

export const getMonochromatic = (color, count = 5) => {
  const c = toOklch(color);
  return Array.from({ length: count }, (_, i) => ({
    ...c,
    l: Math.max(0, Math.min(1, c.l - 0.4 + (i * 0.8 / (count - 1))))
  }));
};

export { wcagContrast };
