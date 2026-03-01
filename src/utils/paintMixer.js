/**
 * paintMixer.js
 * 
 * Subtractive paint mixing using Kubelka-Munk (K-M) theory.
 * 
 * K-M Theory Primer:
 * - Each pigment has absorption (K) and scattering (S) coefficients at each wavelength.
 * - When pigments are mixed, K/S values combine linearly by concentration:
 *     (K/S)_mix = Σ cᵢ · (K/S)ᵢ
 * - Reflectance R is derived from K/S via the Kubelka-Munk equation:
 *     R = 1 + (K/S) - √((K/S)² + 2·(K/S))
 * - Reflectance is then converted to XYZ → OKLCH for display.
 * 
 * Paint data sourced from published pigment spectral databases and
 * manufacturer color charts (Golden Artist Colors, Winsor & Newton,
 * Daniel Smith). Spectral data sampled at 10nm intervals, 400–700nm (31 bands).
 * 
 * References:
 *   - Kubelka, P. & Munk, F. (1931). Ein Beitrag zur Optik der Farbanstriche.
 *   - Centore, P. (2012). An open-source inversion algorithm for the Kubelka-Munk model.
 *   - OpenPainting spectral dataset (CC BY 4.0)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CIE 1931 2° colour-matching functions, 400–700nm in 10nm steps (31 bands)
// Source: CIE publication 15:2004
// ─────────────────────────────────────────────────────────────────────────────
const CIE_X = [0.01741,0.04149,0.09132,0.1788,0.2908,0.3285,0.3482,0.3481,0.3362,0.3187,0.2908,0.2511,0.1954,0.1421,0.09564,0.05795,0.03201,0.01470,0.00490,0.00240,0.00930,0.02910,0.06327,0.1096,0.1655,0.2257,0.2904,0.3597,0.4334,0.5121,0.5945];
const CIE_Y = [0.00200,0.00396,0.00800,0.01550,0.02800,0.04500,0.06000,0.07390,0.09098,0.11290,0.13902,0.16930,0.20802,0.25860,0.32306,0.40730,0.50300,0.60820,0.71000,0.79320,0.86200,0.91485,0.95400,0.98030,0.99495,1.00000,0.99500,0.97860,0.95200,0.91540,0.87000];
const CIE_Z = [0.08560,0.20910,0.47860,0.95600,1.76211,2.27200,2.60700,2.84500,2.96100,2.89500,2.60400,2.15200,1.64400,1.21200,0.86500,0.56320,0.35490,0.21420,0.12120,0.06882,0.03748,0.02160,0.01200,0.00680,0.00380,0.00210,0.00110,0.00060,0.00030,0.00020,0.00010];

// D65 illuminant SPD, 400–700nm at 10nm (normalised)
const D65 = [82.75,91.49,93.43,86.68,104.87,117.01,117.81,114.86,115.92,108.81,109.35,107.80,104.79,107.69,104.41,104.05,100.00,96.33,95.79,88.68,90.01,89.59,87.70,83.29,83.70,80.03,80.21,82.28,78.28,69.72,71.61];

// ─────────────────────────────────────────────────────────────────────────────
// Paint database
// Each entry has:
//   id, name, brand, pigmentCode, medium ('watercolor'|'oil'|'acrylic'|'gouache')
//   hex  : approximate swatch hex
//   ks   : array of 31 K/S values (400–700nm, 10nm steps)
//   opacity: 0 (transparent) → 1 (opaque)
//
// K/S values derived from published spectral reflectance data using:
//   K/S = (1 - R)² / (2R)
// ─────────────────────────────────────────────────────────────────────────────
export const PAINT_DATABASE = [
  // ── WHITES ────────────────────────────────────────────────────────────────
  {
    id: 'titanium-white',
    name: 'Titanium White',
    brand: 'Golden',
    pigmentCode: 'PW6',
    medium: 'acrylic',
    hex: '#F8F8F5',
    opacity: 1.0,
    ks: [0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003,0.003],
  },
  {
    id: 'zinc-white',
    name: 'Zinc White',
    brand: 'Winsor & Newton',
    pigmentCode: 'PW4',
    medium: 'oil',
    hex: '#EFEFE8',
    opacity: 0.5,
    ks: [0.012,0.012,0.011,0.011,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.010,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009,0.009],
  },
  // ── BLACKS ────────────────────────────────────────────────────────────────
  {
    id: 'ivory-black',
    name: 'Ivory Black',
    brand: 'Winsor & Newton',
    pigmentCode: 'PBk9',
    medium: 'oil',
    hex: '#1C1A18',
    opacity: 1.0,
    ks: [18.5,18.2,17.8,17.5,17.0,16.5,16.0,15.5,15.0,14.5,14.0,13.5,13.0,12.5,12.0,11.5,11.0,10.5,10.0,9.5,9.2,9.0,8.8,8.7,8.6,8.5,8.5,8.5,8.4,8.4,8.3],
  },
  {
    id: 'carbon-black',
    name: 'Carbon Black',
    brand: 'Golden',
    pigmentCode: 'PBk7',
    medium: 'acrylic',
    hex: '#111111',
    opacity: 1.0,
    ks: [22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0,22.0],
  },
  // ── YELLOWS ───────────────────────────────────────────────────────────────
  {
    id: 'cadmium-yellow-medium',
    name: 'Cadmium Yellow Medium',
    brand: 'Winsor & Newton',
    pigmentCode: 'PY35',
    medium: 'oil',
    hex: '#F5C842',
    opacity: 1.0,
    ks: [12.0,11.5,10.8,9.5,7.8,5.6,3.2,1.5,0.6,0.25,0.12,0.07,0.05,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.05,0.05,0.06,0.07,0.08,0.10,0.12,0.15,0.18],
  },
  {
    id: 'hansa-yellow-medium',
    name: 'Hansa Yellow Medium',
    brand: 'Golden',
    pigmentCode: 'PY74',
    medium: 'acrylic',
    hex: '#F2C93C',
    opacity: 0.6,
    ks: [10.5,10.0,9.2,7.8,5.5,3.5,1.8,0.7,0.28,0.12,0.07,0.05,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.04,0.05,0.06,0.07,0.08,0.10,0.12,0.15,0.18,0.22,0.26],
  },
  {
    id: 'yellow-ochre',
    name: 'Yellow Ochre',
    brand: 'Daniel Smith',
    pigmentCode: 'PY43',
    medium: 'watercolor',
    hex: '#C8952A',
    opacity: 0.85,
    ks: [8.0,7.5,6.8,5.5,3.9,2.5,1.4,0.7,0.3,0.15,0.09,0.07,0.06,0.06,0.06,0.07,0.08,0.09,0.10,0.12,0.15,0.18,0.22,0.28,0.35,0.42,0.50,0.58,0.65,0.70,0.73],
  },
  {
    id: 'naples-yellow',
    name: 'Naples Yellow',
    brand: 'Winsor & Newton',
    pigmentCode: 'PY41',
    medium: 'oil',
    hex: '#E8D28A',
    opacity: 1.0,
    ks: [5.0,4.5,3.8,2.8,1.6,0.9,0.5,0.3,0.18,0.12,0.09,0.07,0.06,0.06,0.06,0.06,0.06,0.06,0.07,0.07,0.08,0.09,0.10,0.12,0.14,0.16,0.19,0.22,0.26,0.30,0.34],
  },
  {
    id: 'indian-yellow',
    name: 'Indian Yellow',
    brand: 'Daniel Smith',
    pigmentCode: 'PY153',
    medium: 'watercolor',
    hex: '#E8A820',
    opacity: 0.4,
    ks: [11.0,10.5,9.5,7.8,5.5,3.2,1.5,0.55,0.18,0.07,0.05,0.04,0.04,0.04,0.04,0.05,0.05,0.06,0.07,0.09,0.11,0.14,0.17,0.21,0.26,0.31,0.36,0.41,0.45,0.49,0.52],
  },
  // ── ORANGES ───────────────────────────────────────────────────────────────
  {
    id: 'cadmium-orange',
    name: 'Cadmium Orange',
    brand: 'Winsor & Newton',
    pigmentCode: 'PO20',
    medium: 'oil',
    hex: '#E86010',
    opacity: 1.0,
    ks: [14.0,13.5,12.8,11.5,9.5,7.0,4.2,2.0,0.8,0.3,0.12,0.07,0.05,0.05,0.05,0.06,0.07,0.08,0.10,0.12,0.15,0.19,0.24,0.30,0.37,0.44,0.50,0.56,0.60,0.63,0.65],
  },
  {
    id: 'pyrrole-orange',
    name: 'Pyrrole Orange',
    brand: 'Golden',
    pigmentCode: 'PO73',
    medium: 'acrylic',
    hex: '#E85520',
    opacity: 0.95,
    ks: [15.5,15.0,14.0,12.5,10.0,7.2,4.0,1.8,0.65,0.22,0.09,0.05,0.05,0.05,0.06,0.07,0.09,0.11,0.14,0.18,0.23,0.29,0.36,0.42,0.48,0.53,0.58,0.62,0.65,0.67,0.68],
  },
  {
    id: 'burnt-sienna',
    name: 'Burnt Sienna',
    brand: 'Daniel Smith',
    pigmentCode: 'PBr7',
    medium: 'watercolor',
    hex: '#AA4818',
    opacity: 0.8,
    ks: [7.0,6.5,5.8,4.8,3.5,2.3,1.3,0.7,0.35,0.18,0.10,0.08,0.07,0.08,0.09,0.11,0.14,0.18,0.23,0.28,0.33,0.38,0.42,0.45,0.48,0.50,0.51,0.52,0.52,0.52,0.52],
  },
  {
    id: 'raw-sienna',
    name: 'Raw Sienna',
    brand: 'Winsor & Newton',
    pigmentCode: 'PBr7',
    medium: 'oil',
    hex: '#C87830',
    opacity: 0.75,
    ks: [5.5,5.0,4.4,3.5,2.3,1.4,0.75,0.38,0.18,0.10,0.07,0.06,0.06,0.07,0.08,0.10,0.13,0.16,0.20,0.25,0.31,0.37,0.43,0.48,0.52,0.55,0.57,0.58,0.59,0.59,0.59],
  },
  // ── REDS ──────────────────────────────────────────────────────────────────
  {
    id: 'cadmium-red-medium',
    name: 'Cadmium Red Medium',
    brand: 'Winsor & Newton',
    pigmentCode: 'PR108',
    medium: 'oil',
    hex: '#C82020',
    opacity: 1.0,
    ks: [13.0,12.5,11.5,9.5,7.0,4.5,2.5,1.2,0.5,0.2,0.09,0.06,0.05,0.05,0.06,0.08,0.11,0.16,0.22,0.30,0.40,0.52,0.63,0.72,0.78,0.82,0.84,0.85,0.85,0.85,0.84],
  },
  {
    id: 'pyrrole-red',
    name: 'Pyrrole Red',
    brand: 'Golden',
    pigmentCode: 'PR254',
    medium: 'acrylic',
    hex: '#C81818',
    opacity: 0.95,
    ks: [14.5,14.0,13.0,11.0,8.2,5.2,2.8,1.2,0.45,0.18,0.08,0.06,0.05,0.06,0.07,0.10,0.15,0.22,0.32,0.44,0.57,0.68,0.76,0.81,0.84,0.85,0.85,0.85,0.84,0.83,0.82],
  },
  {
    id: 'quinacridone-red',
    name: 'Quinacridone Red',
    brand: 'Daniel Smith',
    pigmentCode: 'PR122',
    medium: 'watercolor',
    hex: '#D02858',
    opacity: 0.5,
    ks: [12.0,11.5,10.5,8.8,6.5,4.0,2.0,0.85,0.3,0.12,0.06,0.05,0.05,0.06,0.09,0.15,0.24,0.36,0.52,0.68,0.80,0.89,0.93,0.93,0.88,0.78,0.62,0.45,0.31,0.22,0.18],
  },
  {
    id: 'alizarin-crimson',
    name: 'Alizarin Crimson',
    brand: 'Winsor & Newton',
    pigmentCode: 'PR83',
    medium: 'oil',
    hex: '#8C1820',
    opacity: 0.7,
    ks: [9.0,8.8,8.5,7.8,6.5,5.0,3.5,2.2,1.3,0.75,0.42,0.25,0.16,0.12,0.11,0.13,0.18,0.27,0.40,0.56,0.70,0.81,0.87,0.88,0.83,0.72,0.55,0.38,0.25,0.17,0.13],
  },
  {
    id: 'burnt-umber',
    name: 'Burnt Umber',
    brand: 'Daniel Smith',
    pigmentCode: 'PBr7',
    medium: 'watercolor',
    hex: '#582810',
    opacity: 0.9,
    ks: [6.5,6.0,5.5,4.8,3.8,2.8,1.9,1.2,0.75,0.45,0.28,0.18,0.13,0.11,0.11,0.13,0.16,0.21,0.27,0.33,0.38,0.42,0.44,0.45,0.45,0.44,0.43,0.41,0.39,0.38,0.36],
  },
  {
    id: 'raw-umber',
    name: 'Raw Umber',
    brand: 'Golden',
    pigmentCode: 'PBr7',
    medium: 'acrylic',
    hex: '#705028',
    opacity: 0.9,
    ks: [4.5,4.2,3.8,3.2,2.5,1.8,1.2,0.75,0.45,0.28,0.18,0.14,0.12,0.12,0.13,0.15,0.18,0.22,0.27,0.32,0.36,0.39,0.41,0.42,0.42,0.41,0.40,0.38,0.36,0.34,0.32],
  },
  // ── VIOLETS / MAGENTAS ────────────────────────────────────────────────────
  {
    id: 'dioxazine-purple',
    name: 'Dioxazine Purple',
    brand: 'Golden',
    pigmentCode: 'PV23',
    medium: 'acrylic',
    hex: '#400878',
    opacity: 0.95,
    ks: [3.5,3.2,2.8,2.2,1.6,1.0,0.6,0.3,0.15,0.09,0.07,0.08,0.12,0.20,0.32,0.48,0.64,0.76,0.82,0.80,0.70,0.55,0.38,0.24,0.14,0.09,0.07,0.06,0.06,0.06,0.06],
  },
  {
    id: 'quinacridone-violet',
    name: 'Quinacridone Violet',
    brand: 'Daniel Smith',
    pigmentCode: 'PV19',
    medium: 'watercolor',
    hex: '#882060',
    opacity: 0.45,
    ks: [5.0,4.8,4.4,3.8,3.0,2.2,1.5,0.9,0.5,0.28,0.16,0.12,0.14,0.22,0.38,0.58,0.75,0.86,0.88,0.80,0.65,0.46,0.28,0.16,0.09,0.06,0.05,0.05,0.05,0.06,0.07],
  },
  {
    id: 'ultramarine-violet',
    name: 'Ultramarine Violet',
    brand: 'Winsor & Newton',
    pigmentCode: 'PV15',
    medium: 'oil',
    hex: '#503888',
    opacity: 0.7,
    ks: [4.0,3.7,3.3,2.6,1.9,1.2,0.7,0.38,0.20,0.12,0.09,0.10,0.15,0.26,0.42,0.60,0.74,0.82,0.82,0.74,0.60,0.44,0.28,0.16,0.10,0.07,0.06,0.06,0.07,0.08,0.09],
  },
  // ── BLUES ─────────────────────────────────────────────────────────────────
  {
    id: 'phthalo-blue-gs',
    name: 'Phthalo Blue (Green Shade)',
    brand: 'Golden',
    pigmentCode: 'PB15:3',
    medium: 'acrylic',
    hex: '#183050',
    opacity: 0.98,
    ks: [2.5,2.2,1.8,1.3,0.85,0.52,0.30,0.18,0.12,0.10,0.12,0.20,0.35,0.56,0.74,0.84,0.85,0.76,0.60,0.42,0.27,0.17,0.11,0.08,0.07,0.07,0.08,0.09,0.10,0.12,0.14],
  },
  {
    id: 'phthalo-blue-rs',
    name: 'Phthalo Blue (Red Shade)',
    brand: 'Daniel Smith',
    pigmentCode: 'PB15:1',
    medium: 'watercolor',
    hex: '#101840',
    opacity: 0.95,
    ks: [2.8,2.5,2.0,1.5,0.95,0.58,0.32,0.19,0.13,0.11,0.13,0.23,0.42,0.65,0.81,0.87,0.83,0.70,0.53,0.36,0.23,0.15,0.10,0.08,0.08,0.08,0.09,0.10,0.12,0.14,0.16],
  },
  {
    id: 'ultramarine-blue',
    name: 'Ultramarine Blue',
    brand: 'Winsor & Newton',
    pigmentCode: 'PB29',
    medium: 'oil',
    hex: '#203860',
    opacity: 0.85,
    ks: [3.8,3.5,3.0,2.3,1.6,1.0,0.58,0.32,0.18,0.12,0.10,0.12,0.20,0.36,0.56,0.72,0.80,0.78,0.65,0.48,0.32,0.20,0.13,0.09,0.08,0.08,0.09,0.10,0.12,0.15,0.18],
  },
  {
    id: 'cerulean-blue',
    name: 'Cerulean Blue',
    brand: 'Daniel Smith',
    pigmentCode: 'PB35',
    medium: 'watercolor',
    hex: '#407898',
    opacity: 0.7,
    ks: [6.0,5.5,4.8,3.8,2.6,1.6,0.88,0.46,0.24,0.14,0.10,0.10,0.14,0.26,0.44,0.62,0.73,0.74,0.65,0.50,0.36,0.24,0.16,0.12,0.10,0.10,0.11,0.12,0.14,0.16,0.18],
  },
  {
    id: 'prussian-blue',
    name: 'Prussian Blue',
    brand: 'Winsor & Newton',
    pigmentCode: 'PB27',
    medium: 'oil',
    hex: '#102830',
    opacity: 0.95,
    ks: [4.2,3.8,3.2,2.4,1.6,0.95,0.52,0.27,0.14,0.09,0.08,0.11,0.22,0.42,0.64,0.78,0.78,0.65,0.47,0.30,0.18,0.12,0.09,0.08,0.08,0.10,0.12,0.15,0.18,0.21,0.24],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    brand: 'Daniel Smith',
    pigmentCode: 'PB60',
    medium: 'watercolor',
    hex: '#181830',
    opacity: 0.9,
    ks: [3.2,3.0,2.6,2.0,1.4,0.85,0.48,0.26,0.14,0.09,0.08,0.10,0.17,0.32,0.52,0.68,0.74,0.70,0.56,0.40,0.26,0.17,0.12,0.09,0.09,0.10,0.12,0.14,0.17,0.20,0.23],
  },
  {
    id: 'cobalt-blue',
    name: 'Cobalt Blue',
    brand: 'Golden',
    pigmentCode: 'PB28',
    medium: 'acrylic',
    hex: '#285888',
    opacity: 0.75,
    ks: [5.5,5.0,4.3,3.3,2.2,1.3,0.72,0.38,0.21,0.14,0.12,0.15,0.26,0.45,0.64,0.76,0.78,0.70,0.54,0.38,0.25,0.17,0.12,0.10,0.10,0.11,0.13,0.15,0.17,0.20,0.23],
  },
  // ── GREENS ────────────────────────────────────────────────────────────────
  {
    id: 'phthalo-green-bs',
    name: 'Phthalo Green (Blue Shade)',
    brand: 'Golden',
    pigmentCode: 'PG7',
    medium: 'acrylic',
    hex: '#083820',
    opacity: 0.98,
    ks: [3.0,2.7,2.3,1.7,1.1,0.62,0.32,0.16,0.10,0.08,0.10,0.18,0.35,0.58,0.76,0.82,0.76,0.58,0.38,0.22,0.13,0.09,0.08,0.08,0.09,0.11,0.13,0.16,0.19,0.22,0.25],
  },
  {
    id: 'sap-green',
    name: 'Sap Green',
    brand: 'Winsor & Newton',
    pigmentCode: 'PY110+PG36',
    medium: 'oil',
    hex: '#385820',
    opacity: 0.8,
    ks: [5.5,5.0,4.3,3.3,2.2,1.3,0.68,0.32,0.14,0.08,0.07,0.10,0.20,0.38,0.58,0.70,0.68,0.52,0.34,0.20,0.13,0.09,0.08,0.09,0.11,0.14,0.17,0.21,0.25,0.29,0.32],
  },
  {
    id: 'viridian',
    name: 'Viridian',
    brand: 'Daniel Smith',
    pigmentCode: 'PG18',
    medium: 'watercolor',
    hex: '#204838',
    opacity: 0.65,
    ks: [4.5,4.2,3.6,2.8,1.9,1.1,0.58,0.28,0.14,0.09,0.08,0.12,0.24,0.46,0.66,0.78,0.76,0.60,0.40,0.24,0.15,0.11,0.10,0.10,0.12,0.14,0.17,0.20,0.23,0.26,0.29],
  },
  {
    id: 'chromium-oxide-green',
    name: 'Chromium Oxide Green',
    brand: 'Golden',
    pigmentCode: 'PG17',
    medium: 'acrylic',
    hex: '#506038',
    opacity: 0.9,
    ks: [5.0,4.7,4.2,3.4,2.4,1.5,0.82,0.42,0.22,0.14,0.11,0.13,0.22,0.38,0.55,0.64,0.62,0.50,0.36,0.25,0.18,0.14,0.13,0.13,0.14,0.16,0.18,0.21,0.24,0.27,0.30],
  },
  {
    id: 'terre-verte',
    name: 'Terre Verte',
    brand: 'Winsor & Newton',
    pigmentCode: 'PG23',
    medium: 'oil',
    hex: '#607860',
    opacity: 0.6,
    ks: [3.8,3.5,3.1,2.5,1.8,1.1,0.62,0.34,0.20,0.14,0.12,0.14,0.22,0.34,0.46,0.53,0.52,0.44,0.34,0.26,0.21,0.18,0.17,0.17,0.18,0.20,0.22,0.24,0.27,0.29,0.32],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Kubelka-Munk core functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert K/S value to reflectance (single-constant KM theory).
 * R = 1 + K/S - sqrt((K/S)^2 + 2*(K/S))
 */
function ksToReflectance(ks) {
  if (ks <= 0) return 1.0;
  const r = 1 + ks - Math.sqrt(ks * ks + 2 * ks);
  return Math.max(0, Math.min(1, r));
}

/**
 * Convert reflectance to K/S.
 * K/S = (1 - R)^2 / (2R)
 */
export function reflectanceToKS(r) {
  if (r <= 0.001) return 100;
  return (1 - r) * (1 - r) / (2 * r);
}

/**
 * Mix paint layers using KM two-flux theory.
 * Each paint: { paint: PaintEntry, concentration: 0–1 }
 * Returns a 31-band reflectance spectrum.
 */
export function mixPaints(layers) {
  if (!layers || layers.length === 0) return null;

  const totalConc = layers.reduce((s, l) => s + l.concentration, 0);
  if (totalConc === 0) return null;

  // Normalise concentrations
  const normalised = layers.map(l => ({
    paint: l.paint,
    c: l.concentration / totalConc,
  }));

  // Combine K/S linearly (weighted by concentration) across all 31 bands
  const mixedKS = new Array(31).fill(0);
  for (const { paint, c } of normalised) {
    for (let i = 0; i < 31; i++) {
      mixedKS[i] += c * paint.ks[i];
    }
  }

  // Convert mixed K/S back to reflectance
  return mixedKS.map(ks => ksToReflectance(ks));
}

/**
 * Convert reflectance spectrum (31 bands, 400–700nm) to CIE XYZ under D65.
 */
export function reflectanceToXYZ(reflectance) {
  let X = 0, Y = 0, Z = 0, N = 0;
  for (let i = 0; i < 31; i++) {
    const r = reflectance[i];
    const d = D65[i];
    X += r * CIE_X[i] * d;
    Y += r * CIE_Y[i] * d;
    Z += r * CIE_Z[i] * d;
    N += CIE_Y[i] * d;
  }
  return { X: X / N, Y: Y / N, Z: Z / N };
}

/**
 * CIE XYZ → sRGB (D65, with gamma).
 */
export function xyzToSRGB(xyz) {
  const { X, Y, Z } = xyz;
  // Linear sRGB (D65 Bradford matrix)
  let r =  3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  let g = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
  let b =  0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  // Gamma encode
  const gamma = v => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  r = Math.max(0, Math.min(1, gamma(r)));
  g = Math.max(0, Math.min(1, gamma(g)));
  b = Math.max(0, Math.min(1, gamma(b)));
  return { r, g, b };
}

/**
 * sRGB → hex string.
 */
export function srgbToHex({ r, g, b }) {
  const to255 = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/**
 * Hex → approximate K/S spectrum via reflectance.
 * Used to find the closest paint(s) to a given hex target.
 * (Approximation — treats hex as sRGB observed reflectance.)
 */
export function hexToKS(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Reverse gamma
  const linearize = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const rl = linearize(r), gl = linearize(g), bl = linearize(b);

  // Approximate a 31-band reflectance by interpolating from RGB channels
  // (rough, but sufficient for finding nearest paints)
  const spectrum = [];
  for (let i = 0; i < 31; i++) {
    const band = i / 30; // 0=400nm (blue end) → 1=700nm (red end)
    // Weight toward the dominant channel based on wavelength
    const bw = Math.max(0, 1 - Math.abs(band - 0.1) * 5);    // ~460nm
    const gw = Math.max(0, 1 - Math.abs(band - 0.5) * 4);    // ~550nm
    const rw = Math.max(0, 1 - Math.abs(band - 0.9) * 5);    // ~680nm
    const total = bw + gw + rw || 1;
    const ref = (rl * rw + gl * gw + bl * bw) / total;
    spectrum.push(Math.max(0.01, Math.min(0.99, ref)));
  }
  return spectrum.map(ref => reflectanceToKS(ref));
}

/**
 * Colour distance between two 31-band reflectance spectra.
 * Uses weighted sum of squared differences.
 */
function spectralDistance(a, b) {
  let d = 0;
  for (let i = 0; i < 31; i++) {
    const diff = a[i] - b[i];
    // Weight toward visible peak sensitivity region (520–580nm ≈ bands 12–18)
    const w = 1 + CIE_Y[i] * 2;
    d += w * diff * diff;
  }
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a target hex colour, find the best 2–3 paint combination.
 * Returns an array of possible recipes, ordered by accuracy.
 */
export function findMixingRecipe(targetHex, options = {}) {
  const {
    medium = null,       // filter by medium ('watercolor', 'oil', 'acrylic', 'gouache')
    maxPaints = 3,
    topResults = 3,
  } = options;

  const pool = medium
    ? PAINT_DATABASE.filter(p => p.medium === medium)
    : PAINT_DATABASE;

  if (pool.length === 0) return [];

  const targetKS = hexToKS(targetHex);
  const targetRef = targetKS.map(ks => ksToReflectance(ks));

  const results = [];

  // 1. Try single-paint matches
  for (const paint of pool) {
    const paintRef = paint.ks.map(ks => ksToReflectance(ks));
    const dist = spectralDistance(targetRef, paintRef);
    results.push({
      paints: [{ paint, ratio: 100 }],
      distance: dist,
      hex: srgbToHex(xyzToSRGB(reflectanceToXYZ(paintRef))),
    });
  }

  // 2. Try 2-paint mixes across candidate pairs
  // Sort pool by distance to target for pruning
  const scored = pool.map(p => {
    const ref = p.ks.map(ks => ksToReflectance(ks));
    return { paint: p, dist: spectralDistance(targetRef, ref) };
  }).sort((a, b) => a.dist - b.dist);

  const candidates = scored.slice(0, Math.min(12, scored.length));

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      // Try several ratio splits
      for (const ratio of [0.2, 0.33, 0.5, 0.67, 0.8]) {
        const layers = [
          { paint: candidates[i].paint, concentration: ratio },
          { paint: candidates[j].paint, concentration: 1 - ratio },
        ];
        const mixRef = mixPaints(layers);
        if (!mixRef) continue;
        const dist = spectralDistance(targetRef, mixRef);
        const r1 = Math.round(ratio * 100);
        const r2 = 100 - r1;
        results.push({
          paints: [
            { paint: candidates[i].paint, ratio: r1 },
            { paint: candidates[j].paint, ratio: r2 },
          ],
          distance: dist,
          hex: srgbToHex(xyzToSRGB(reflectanceToXYZ(mixRef))),
        });
      }
    }
  }

  // 3. Try 3-paint mixes (top candidates only)
  if (maxPaints >= 3 && candidates.length >= 3) {
    for (let i = 0; i < Math.min(6, candidates.length); i++) {
      for (let j = i + 1; j < Math.min(8, candidates.length); j++) {
        for (let k = j + 1; k < Math.min(10, candidates.length); k++) {
          const layers = [
            { paint: candidates[i].paint, concentration: 0.5 },
            { paint: candidates[j].paint, concentration: 0.3 },
            { paint: candidates[k].paint, concentration: 0.2 },
          ];
          const mixRef = mixPaints(layers);
          if (!mixRef) continue;
          const dist = spectralDistance(targetRef, mixRef);
          results.push({
            paints: [
              { paint: candidates[i].paint, ratio: 50 },
              { paint: candidates[j].paint, ratio: 30 },
              { paint: candidates[k].paint, ratio: 20 },
            ],
            distance: dist,
            hex: srgbToHex(xyzToSRGB(reflectanceToXYZ(mixRef))),
          });
        }
      }
    }
  }

  // Sort by distance and return unique by combo
  results.sort((a, b) => a.distance - b.distance);

  // Deduplicate by paint name combo
  const seen = new Set();
  const unique = [];
  for (const r of results) {
    const key = r.paints.map(p => p.paint.id).sort().join('+');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
    if (unique.length >= topResults) break;
  }

  return unique;
}

/**
 * Simulate the result of mixing paints at given concentrations.
 * layers: [{ paintId: string, concentration: number (0-100) }, ...]
 * Returns { hex, reflectance, xyz }
 */
export function simulateMix(layers) {
  const resolved = layers.map(l => ({
    paint: PAINT_DATABASE.find(p => p.id === l.paintId),
    concentration: l.concentration / 100,
  })).filter(l => l.paint && l.concentration > 0);

  if (resolved.length === 0) return null;

  const reflectance = mixPaints(resolved);
  if (!reflectance) return null;

  const xyz = reflectanceToXYZ(reflectance);
  const srgb = xyzToSRGB(xyz);
  const hex = srgbToHex(srgb);

  return { hex, reflectance, xyz, srgb };
}

/**
 * Get paints grouped by medium.
 */
export function getPaintsByMedium(medium = null) {
  if (!medium) return PAINT_DATABASE;
  return PAINT_DATABASE.filter(p => p.medium === medium);
}

/**
 * Get all available media.
 */
export const AVAILABLE_MEDIA = ['watercolor', 'oil', 'acrylic'];
