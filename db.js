/* ============================================================
   db.js — shared database for all the pages of Old PC Guide
   Static data + calculation functions. No dependencies.
   ============================================================ */

/* ------------------------------------------------------------
   PROCESSORS
   sc  = internal index 0-100 used for estimates, not a score
         from a standardized benchmark
   y   = launch year
   c/t = cores / threads   g = clock GHz
   avx = 0 none | 1 AVX | 2 AVX2 | 3 AVX-512  (SIMD class, also
         used as a speed multiplier; not the exact instruction
         name: on ARM the field is accompanied by arm: 1)
   arm = 1 on Apple Silicon and other ARM: the instructions are NEON,
         not AVX, and the memory is unified
   mem = 0 DDR/DDR2 | 2 DDR3 | 3 DDR4 | 4 DDR5
   mx  = maximum installable RAM on typical motherboards of that
         platform (values consistent with socket/era)
   ------------------------------------------------------------ */
const DB_CPU = {
  p4: [
    { n: "Pentium 4 3.0 GHz (Northwood, HT)",        y: 2003, sc: 6,  c: 1, t: 2, g: 3.0, avx: 0, mem: 0, mx: 4, b32: 1 },
    { n: "Celeron D 3.0 GHz (check the exact model)", y: 2004, sc: 6, c: 1, t: 1, g: 3.0, avx: 0, mem: 0, mx: 4, b32: null },
    { n: "Pentium 4 Prescott 2.8-3.4 GHz (check the exact model)", y: 2004, sc: 8, c: 1, t: 2, g: 3.0, avx: 0, mem: 0, mx: 4, b32: null },
    { n: "Intel Atom N270 (netbook 2008)",          y: 2008, sc: 10, c: 1, t: 2, g: 1.6, avx: 0, mem: 0, mx: 2, b32: 1 }
  ],
  c2: [
    { n: "Pentium Dual-Core E2200",                 y: 2007, sc: 13, c: 2, t: 2, g: 2.2, avx: 0, mem: 0, mx: 8 },
    { n: "Celeron E3300 (Wolfdale)",                y: 2009, sc: 12, c: 2, t: 2, g: 2.5, avx: 0, mem: 0, mx: 8 },
    { n: "Core 2 Duo E6600",                         y: 2006, sc: 17, c: 2, t: 2, g: 2.4, avx: 0, mem: 0, mx: 8 },
    { n: "Core 2 Duo E8400",                         y: 2008, sc: 20, c: 2, t: 2, g: 3.0, avx: 0, mem: 0, mx: 8 },
    { n: "Core 2 Quad Q6600",                        y: 2007, sc: 21, c: 4, t: 4, g: 2.4, avx: 0, mem: 0, mx: 8 },
    { n: "Core 2 Quad Q9400",                        y: 2008, sc: 24, c: 4, t: 4, g: 2.66, avx: 0, mem: 0, mx: 8 }
  ],
  nhm: [
    { n: "Core i3-540 (Westmere)",                   y: 2010, sc: 24, c: 2, t: 4, g: 3.06, avx: 0, mem: 2, mx: 16 },
    { n: "Core i5-650 (Westmere)",                   y: 2010, sc: 26, c: 2, t: 4, g: 3.2, avx: 0, mem: 2, mx: 16 },
    { n: "Core i7-2600 (Sandy Bridge)",             y: 2011, sc: 30, c: 4, t: 8, g: 3.4, avx: 1, mem: 2, mx: 16 },
    { n: "Core i5-2400 (Sandy Bridge)",             y: 2011, sc: 29, c: 4, t: 4, g: 3.1, avx: 1, mem: 2, mx: 16 },
    { n: "Core i5-3350P (Ivy Bridge)",              y: 2012, sc: 30, c: 4, t: 4, g: 3.1, avx: 1, mem: 2, mx: 16 },
    { n: "Core i7-3770 (Ivy Bridge)",               y: 2012, sc: 35, c: 4, t: 8, g: 3.4, avx: 1, mem: 2, mx: 16 }
  ],
  hz: [
    { n: "Core i5-4460 (Haswell)",                   y: 2014, sc: 42, c: 4, t: 4, g: 3.2, avx: 2, mem: 3, mx: 32 },
    { n: "Core i7-4790 (Haswell)",                   y: 2014, sc: 48, c: 4, t: 8, g: 3.6, avx: 2, mem: 3, mx: 32 },
    { n: "Core i5-4570 (Haswell)",                   y: 2013, sc: 44, c: 4, t: 4, g: 3.2, avx: 2, mem: 3, mx: 32 },
    { n: "Core i5-6500 (Skylake)",                   y: 2015, sc: 48, c: 4, t: 4, g: 3.2, avx: 2, mem: 3, mx: 64 },
    { n: "Core i7-6700 (Skylake)",                   y: 2015, sc: 55, c: 4, t: 8, g: 3.4, avx: 2, mem: 3, mx: 64 },
    { n: "Core i5-7500 (Kaby Lake)",                 y: 2017, sc: 50, c: 4, t: 4, g: 3.4, avx: 2, mem: 3, mx: 64 },
    { n: "Core i7-7700 (Kaby Lake)",                 y: 2017, sc: 58, c: 4, t: 8, g: 3.6, avx: 2, mem: 3, mx: 64 },
    { n: "Core i5-8400 (Coffee Lake)",               y: 2017, sc: 55, c: 6, t: 6, g: 2.8, avx: 2, mem: 3, mx: 64 },
    { n: "Core i7-8700 (Coffee Lake)",               y: 2017, sc: 63, c: 6, t: 12, g: 3.2, avx: 2, mem: 3, mx: 64 },
    { n: "Core i5-9400F (Coffee Lake Refresh)",      y: 2019, sc: 57, c: 6, t: 6, g: 2.9, avx: 2, mem: 3, mx: 64 },
    { n: "Core i7-9700 (Coffee Lake Refresh)",       y: 2019, sc: 66, c: 8, t: 8, g: 3.0, avx: 2, mem: 3, mx: 64 }
  ],
  alder: [
    { n: "Core i9-12900K (Alder Lake)",              y: 2021, sc: 72, c: 16, t: 24, g: 3.2, avx: 2, mem: 4, mx: 128 },
    { n: "Core i9-13900K (Raptor Lake)",             y: 2022, sc: 78, c: 24, t: 32, g: 3.0, avx: 2, mem: 4, mx: 128 },
    { n: "Core i7-13700H (laptop)",                 y: 2022, sc: 70, c: 14, t: 20, g: 2.6, avx: 2, mem: 4, mx: 64 },
    { n: "Core Ultra 7 155H (Meteor Lake)",          y: 2023, sc: 76, c: 16, t: 22, g: 2.3, avx: 2, mem: 4, mx: 64 }
  ],
  xe: [
    { n: "Xeon E5-2680 v3 (Haswell-EP)",             y: 2014, sc: 50, c: 12, t: 24, g: 2.5, avx: 2, mem: 3, mx: 256 },
    { n: "Xeon E5-2680 v4 (Broadwell)",             y: 2016, sc: 55, c: 14, t: 28, g: 2.4, avx: 2, mem: 3, mx: 256 },
    { n: "Xeon W-2145 (Skylake)",                   y: 2017, sc: 56, c: 8, t: 16, g: 3.7, avx: 3, mem: 4, mx: 256 },
    { n: "Xeon Silver 4310 (Ice Lake)",             y: 2021, sc: 60, c: 12, t: 24, g: 2.1, avx: 3, mem: 4, mx: 512 },
    { n: "EPYC 7402P (Zen 2, server)",              y: 2019, sc: 62, c: 24, t: 48, g: 2.0, avx: 2, mem: 4, mx: 512 }
  ],
  amdold: [
    { n: "Athlon XP 2800+",                          y: 2003, sc: 6,  c: 1, t: 1, g: 2.2, avx: 0, mem: 0, mx: 4, b32: 1 },
    { n: "Sempron (generic profile, check the model)", y: 2005, sc: 6, c: 1, t: 1, g: 2.0, avx: 0, mem: 0, mx: 4, b32: null },
    { n: "Athlon 64 X2 3800+",                      y: 2005, sc: 12, c: 2, t: 2, g: 2.0, avx: 0, mem: 0, mx: 4 },
    { n: "Athlon II X2 240",                        y: 2009, sc: 14, c: 2, t: 2, g: 2.9, avx: 0, mem: 1, mx: 16 },
    { n: "Phenom II X4 955",                        y: 2009, sc: 16, c: 4, t: 4, g: 2.9, avx: 0, mem: 1, mx: 16 }
  ],
  amdfx: [
    { n: "FX-4350 (Bulldozer)",                      y: 2012, sc: 24, c: 4, t: 4, g: 3.5, avx: 1, mem: 2, mx: 16 },
    { n: "FX-8350 (Piledriver)",                     y: 2012, sc: 29, c: 8, t: 8, g: 4.0, avx: 1, mem: 2, mx: 32 },
    { n: "Athlon 3000G",                            y: 2019, sc: 40, c: 2, t: 4, g: 3.5, avx: 2, mem: 3, mx: 64 },
    { n: "Ryzen 3 2200G",                            y: 2018, sc: 43, c: 4, t: 4, g: 3.5, avx: 2, mem: 3, mx: 64 },
    { n: "Ryzen 5 2400G",                            y: 2018, sc: 47, c: 4, t: 8, g: 3.6, avx: 2, mem: 3, mx: 64 }
  ],
  ryzen: [
    { n: "Ryzen 5 2600",                             y: 2018, sc: 53, c: 6, t: 12, g: 3.4, avx: 2, mem: 3, mx: 64 },
    { n: "Ryzen 5 3600",                             y: 2019, sc: 58, c: 6, t: 12, g: 3.6, avx: 2, mem: 3, mx: 64 },
    { n: "Ryzen 5 5600",                             y: 2022, sc: 64, c: 6, t: 12, g: 3.5, avx: 2, mem: 3, mx: 128 },
    { n: "Ryzen 7 5800X",                            y: 2020, sc: 72, c: 8, t: 16, g: 3.8, avx: 2, mem: 3, mx: 128 },
    { n: "Ryzen 7 3700X",                           y: 2019, sc: 58, c: 8, t: 16, g: 3.6, avx: 2, mem: 3, mx: 64 },
    { n: "Ryzen 5 7600 (Zen 4)",                     y: 2023, sc: 72, c: 6, t: 12, g: 3.8, avx: 3, mem: 4, mx: 128 },
    { n: "Ryzen 7 7700X (Zen 4)",                    y: 2022, sc: 78, c: 8, t: 16, g: 4.5, avx: 3, mem: 4, mx: 128 },
    { n: "Ryzen 9 7950X (Zen 4)",                    y: 2022, sc: 88, c: 16, t: 32, g: 4.5, avx: 3, mem: 4, mx: 128 },
    { n: "Ryzen 9 9950X (Zen 5)",                    y: 2024, sc: 95, c: 16, t: 32, g: 4.3, avx: 3, mem: 4, mx: 128 },
    { n: "Ryzen AI 9 HX 370 (Strix Point)",          y: 2024, sc: 86, c: 12, t: 24, g: 4.0, avx: 3, mem: 4, mx: 128 }
  ],
  mob: [
    { n: "Intel Core i5-4200U (laptop)",             y: 2013, sc: 26, c: 2, t: 4, g: 2.3, avx: 2, mem: 3, mx: 16 },
    { n: "Intel Core i7-4510U (laptop)",             y: 2014, sc: 28, c: 2, t: 4, g: 2.6, avx: 2, mem: 3, mx: 16 }
  ],
  /* Apple Silicon: arm: 1 because the vector instructions are NEON and
     not AVX/AVX-512, and the memory is unified (RAM and GPU share
     the same pool: there is no separate VRAM to subtract). */
  apple: [
    { n: "Apple M1 (base)",                         y: 2020, sc: 80, c: 8, t: 8, g: 3.2, avx: 3, mem: 4, mx: 16, arm: 1 },
    { n: "Apple M2 (base)",                         y: 2022, sc: 86, c: 8, t: 8, g: 3.5, avx: 3, mem: 4, mx: 24, arm: 1 },
    { n: "Apple M3 (base)",                         y: 2023, sc: 90, c: 8, t: 8, g: 4.0, avx: 3, mem: 4, mx: 24, arm: 1 },
    { n: "Apple M4 (base)",                         y: 2024, sc: 95, c: 10, t: 10, g: 4.3, avx: 3, mem: 4, mx: 32, arm: 1 }
  ]
};

const DB_ANNO_MAX = new Date().getFullYear();

/* Models in this list verified in the Microsoft Windows 11 25H2 lists.
   Unconfirmed models still need verification: we do not infer support
   from the generation or the year alone. */
const W11_CPU = new Set([
  "Core i5-8400 (Coffee Lake)",
  "Core i7-8700 (Coffee Lake)",
  "Core i5-9400F (Coffee Lake Refresh)",
  "Core i7-9700 (Coffee Lake Refresh)",
  "Core i9-12900K (Alder Lake)",
  "Core i9-13900K (Raptor Lake)",
  "Core i7-13700H (laptop)",
  "Core Ultra 7 155H (Meteor Lake)",
  "Ryzen 9 9950X (Zen 5)",
  "Ryzen AI 9 HX 370 (Strix Point)",
  "Xeon Silver 4310 (Ice Lake)",
  "Ryzen 5 3600",
  "Ryzen 5 5600",
  "Ryzen 7 5800X",
  "Ryzen 7 3700X",
  "Ryzen 5 7600 (Zen 4)",
  "Ryzen 7 7700X (Zen 4)",
  "Ryzen 9 7950X (Zen 4)",
  "Athlon 3000G"
]);
/* CPU profiles whose model/family is clearly older than the Microsoft
   support thresholds. For CPUs not in any list we do not assume
   incompatibility: we show a manual check. */
const W11_CPU_NON_SUPPORTATE = new Set([
  "Pentium 4 3.0 GHz (Northwood, HT)",
  "Celeron D 3.0 GHz (check the exact model)",
  "Pentium 4 Prescott 2.8-3.4 GHz (check the exact model)",
  "Intel Atom N270 (netbook 2008)",
  "Pentium Dual-Core E2200",
  "Celeron E3300 (Wolfdale)",
  "Core 2 Duo E6600",
  "Core 2 Duo E8400",
  "Core 2 Quad Q6600",
  "Core 2 Quad Q9400",
  "Core i3-540 (Westmere)",
  "Core i5-650 (Westmere)",
  "Core i7-2600 (Sandy Bridge)",
  "Core i5-2400 (Sandy Bridge)",
  "Core i5-3350P (Ivy Bridge)",
  "Core i7-3770 (Ivy Bridge)",
  "Core i5-4460 (Haswell)",
  "Core i7-4790 (Haswell)",
  "Core i5-4570 (Haswell)",
  "Core i5-6500 (Skylake)",
  "Core i7-6700 (Skylake)",
  "Core i5-7500 (Kaby Lake)",
  "Core i7-7700 (Kaby Lake)",
  "Xeon E5-2680 v3 (Haswell-EP)",
  "Xeon E5-2680 v4 (Broadwell)",
  "Athlon XP 2800+",
  "Sempron (generic profile, check the model)",
  "Athlon 64 X2 3800+",
  "Athlon II X2 240",
  "Phenom II X4 955",
  "FX-4350 (Bulldozer)",
  "FX-8350 (Piledriver)",
  "Ryzen 3 2200G",
  "Ryzen 5 2400G",
  "Intel Core i5-4200U (laptop)",
  "Intel Core i7-4510U (laptop)"
]);
for (const k in DB_CPU) DB_CPU[k].forEach(p => {
  p.w11 = W11_CPU.has(p.n) ? 1 : W11_CPU_NON_SUPPORTATE.has(p.n) ? 0 : null;
});

const DB_GRUPPI_CPU = [
  ["Intel Pentium 4 / Celeron / Atom (1999-2008)", "p4"],
  ["Intel Core 2 and Pentium Dual-Core (2006-2010)", "c2"],
  ["Intel Westmere, Sandy Bridge, Ivy Bridge (2010-2013)", "nhm"],
  ["Intel Haswell → Coffee Lake Refresh (2013-2019)", "hz"],
  ["Intel Core 12th/13th gen and Core Ultra (2021-)", "alder"],
  ["Intel Xeon / server (2014-)", "xe"],
  ["AMD Athlon, Sempron, Phenom II (2003-2011)", "amdold"],
  ["AMD FX, Athlon 3000G, Ryzen with APU (2012-2019)", "amdfx"],
  ["AMD Ryzen 2000-9000 and Ryzen AI (2018-)", "ryzen"],
  ["Intel Core laptops (ultrabook 2013-2015)", "mob"],
  ["Apple Silicon (2020-)", "apple"]
];

/* ------------------------------------------------------------
   GRAPHICS CARDS
   v = VRAM in GB (0 = integrated, shared VRAM)
   x = internal index for an indicative estimate, not a benchmark
   z = approximate internal factor for backend/driver, not a
       measure of compatibility or guaranteed performance
   ------------------------------------------------------------ */
const DB_GPU = {
  ig: [
    { n: "Integrated graphics only / no GPU", y: 0, v: 0, x: 0, z: 0, vend: "", d: "This estimate does not calculate the acceleration of integrated graphics: some modern integrated GPUs support dedicated AI backends." }
  ],
  nvold: [
    { n: "GeForce GTX 1050 Ti (4 GB)",              y: 2016, v: 4,  x: 15, z: 1.0, vend: "NVIDIA", d: "4 GB of VRAM: consider small models and check the runtime requirements; Compute Capability 6.1." },
    { n: "GeForce GTX 1060 (6 GB)",                 y: 2016, v: 6,  x: 18, z: 1.0, vend: "NVIDIA", d: "Still in use, but 6 GB strongly limits large models." },
    { n: "GeForce GTX 1650 (4 GB)",                 y: 2019, v: 4,  x: 14, z: 1.0, vend: "NVIDIA", d: "Modest performance: 8 GB of VRAM matters more than raw power." }
  ],
  nv1000: [
    { n: "GeForce GTX 1660 Super (6 GB)",           y: 2019, v: 6,  x: 25, z: 1.0, vend: "NVIDIA", d: "The VRAM limits loadable sizes; performance and support depend on the runtime." },
    { n: "GeForce GTX 1660 Ti (6 GB)",              y: 2019, v: 6,  x: 28, z: 1.0, vend: "NVIDIA", d: "Check available memory, drivers and backend before choosing the model." },
    { n: "GeForce RTX 2060 (6 GB)",                 y: 2019, v: 6,  x: 35, z: 1.0, vend: "NVIDIA", d: "GPU with Tensor Cores; the runtime must support the card and the chosen backend." },
    { n: "GeForce RTX 2060 Super (8 GB)",           y: 2020, v: 8,  x: 40, z: 1.0, vend: "NVIDIA", d: "8 GB of VRAM; check the model requirements, context and headroom for the runtime." },
    { n: "GeForce RTX 3050 (8 GB)",                 y: 2022, v: 8,  x: 28, z: 1.0, vend: "NVIDIA", d: "8 GB desktop card; speed varies with the model, backend and drivers." }
  ],
  nv2000: [
    { n: "GeForce RTX 3060 (8 GB)",                 y: 2022, v: 8,  x: 50, z: 1.0, vend: "NVIDIA", d: "The VRAM limits the largest models; performance depends on the backend." },
    { n: "GeForce RTX 3060 (12 GB)",                y: 2021, v: 12, x: 55, z: 1.0, vend: "NVIDIA", d: "12 GB of VRAM; capacity and speed depend on the model, context and backend." },
    { n: "GeForce RTX 3070 (8 GB)",                 y: 2020, v: 8,  x: 65, z: 1.0, vend: "NVIDIA", d: "The 8 GB capacity sets a limit on loadable models; speed varies by runtime." },
    { n: "GeForce RTX 3070 Ti (8 GB)",              y: 2021, v: 8,  x: 75, z: 1.0, vend: "NVIDIA", d: "8 GB of VRAM; leave headroom for context and buffers and check software support." },
    { n: "GeForce RTX 3080 (10 GB)",                y: 2020, v: 10, x: 85, z: 1.0, vend: "NVIDIA", d: "10 GB of VRAM; estimated speed, depends on the model and backend." },
    { n: "GeForce RTX 3080 Ti (12 GB)",             y: 2021, v: 12, x: 90, z: 1.0, vend: "NVIDIA", d: "12 GB of VRAM; check the headroom for the model, context and buffers." },
    { n: "GeForce RTX 3090 (24 GB)",                y: 2020, v: 24, x: 110, z: 1.0, vend: "NVIDIA", d: "24 GB of VRAM; capacity and performance depend on weights, context, buffers and backend." },
    { n: "GeForce RTX 3060 Ti (8 GB)",              y: 2020, v: 8,  x: 52, z: 1.0, vend: "NVIDIA", d: "Good speed, with the 8 GB as a limit on model size." }
  ],
  nv4000: [
    { n: "GeForce RTX 4060 (8 GB)",                 y: 2023, v: 8,  x: 45, z: 1.0, vend: "NVIDIA", d: "Efficiency and low power draw: 8 GB as the limit." },
    { n: "GeForce RTX 4060 Ti (8 GB)",              y: 2023, v: 8,  x: 52, z: 1.0, vend: "NVIDIA", d: "Good compromise for daily use + AI." },
    { n: "GeForce RTX 4070 (12 GB)",                y: 2023, v: 12, x: 78, z: 1.0, vend: "NVIDIA", d: "12 GB can fit many 7-14B models in Q4; check the context and free memory." },
    { n: "GeForce RTX 4070 Ti (12 GB)",             y: 2023, v: 12, x: 90, z: 1.0, vend: "NVIDIA", d: "12 GB can fit several quantized models, but context and backend reduce the headroom." },
    { n: "GeForce RTX 4080 (16 GB)",                y: 2023, v: 16, x: 95, z: 1.0, vend: "NVIDIA", d: "16 GB allow medium models; context and cache can reduce available memory." },
    { n: "GeForce RTX 4080 Super (16 GB)",          y: 2024, v: 16, x: 102, z: 1.0, vend: "NVIDIA", d: "Slightly faster than the 4080, same 16 GB ceiling." },
    { n: "GeForce RTX 4070 Ti Super (16 GB)",       y: 2024, v: 16, x: 98, z: 1.0, vend: "NVIDIA", d: "The 16 GB offer headroom for medium models; actual availability depends on the context." },
    { n: "GeForce RTX 4090 (24 GB)",                y: 2022, v: 24, x: 120, z: 1.0, vend: "NVIDIA", d: "24 GB of VRAM; performance and loadable sizes depend on the model and backend." }
  ],
  nv5000: [
    { n: "GeForce RTX 5060 Ti (16 GB)",             y: 2025, v: 16, x: 92, z: 1.0, vend: "NVIDIA", d: "16 GB of VRAM; check requirements and room for context and buffers." },
    { n: "GeForce RTX 5060 Ti (8 GB)",              y: 2025, v: 8,  x: 90, z: 1.0, vend: "NVIDIA", d: "Fast, but 8 GB limits large models." },
    { n: "GeForce RTX 5070 (12 GB)",                y: 2025, v: 12, x: 115, z: 1.0, vend: "NVIDIA", d: "12 GB can fit many 7-14B Q4 models; the context uses additional memory." },
    { n: "GeForce RTX 5070 Ti (16 GB)",             y: 2025, v: 16, x: 140, z: 1.0, vend: "NVIDIA", d: "16 GB offer more headroom for medium models, depending on quantization and context." },
    { n: "GeForce RTX 5080 (16 GB)",                y: 2025, v: 16, x: 165, z: 1.0, vend: "NVIDIA", d: "16 GB; models beyond this capacity require partial offload or system memory." },
    { n: "GeForce RTX 5090 (32 GB)",                y: 2025, v: 32, x: 230, z: 1.0, vend: "NVIDIA", d: "32 GB: suitable for large models, but a 70B Q4 does not fully fit in VRAM." }
  ],
  amd: [
    { n: "Radeon RX 580 (8 GB)",                     y: 2016, v: 8,  x: 15, z: 0.85, vend: "AMD", d: "Check the support of your specific card in the runtime and backend of the chosen system." },
    { n: "Radeon RX 6600 (8 GB)",                    y: 2021, v: 8,  x: 22, z: 0.85, vend: "AMD", d: "Support and performance vary with runtime, drivers, backend and operating system." },
    { n: "Radeon RX 6700 XT (12 GB)",                y: 2021, v: 12, x: 40, z: 0.9,  vend: "AMD", d: "With 12 GB of VRAM it is a good base for medium-large models." },
    { n: "Radeon RX 6750 XT (12 GB)",                y: 2022, v: 12, x: 48, z: 0.9,  vend: "AMD", d: "12 GB of VRAM; backend and drivers heavily affect performance." },
    { n: "Radeon RX 7600 (8 GB)",                    y: 2023, v: 8,  x: 42, z: 0.85, vend: "AMD", d: "8 GB of VRAM; speed and compatibility depend on backend, drivers and operating system." },
    { n: "Radeon RX 7800 XT (16 GB)",                y: 2023, v: 16, x: 62, z: 0.9,  vend: "AMD", d: "16 GB of VRAM; check runtime compatibility, drivers and the memory required by the model." },
    { n: "Radeon RX 7900 GRE (16 GB)",               y: 2024, v: 16, x: 68, z: 0.9,  vend: "AMD", d: "16 GB; availability for medium models depends on the context and backend." },
    { n: "Radeon RX 7900 XT (20 GB)",                y: 2022, v: 20, x: 78, z: 0.9,  vend: "AMD", d: "20 GB of VRAM; capacity and performance depend on the model and backend." },
    { n: "Radeon RX 7900 XTX (24 GB)",               y: 2022, v: 24, x: 85, z: 0.95, vend: "AMD", d: "24 GB of VRAM; check the runtime support and headroom for the context." }
  ],
  r97: [
    { n: "Radeon RX 9060 XT (8 GB)",                 y: 2025, v: 8,  x: 48, z: 0.9,  vend: "AMD", d: "New generation: fast on 7-8B, 8 GB as the limit." },
    { n: "Radeon RX 9060 XT (16 GB)",                y: 2025, v: 16, x: 50, z: 0.9,  vend: "AMD", d: "16 GB of VRAM; check software support, drivers and memory for context and buffers." },
    { n: "Radeon RX 9070 (16 GB)",                   y: 2025, v: 16, x: 78, z: 0.9,  vend: "AMD", d: "Model capacity and speed depend on the runtime and the compatible backend." },
    { n: "Radeon RX 9070 XT (16 GB)",                y: 2025, v: 16, x: 88, z: 0.9,  vend: "AMD", d: "16 GB of VRAM; check model size, context and backend support." }
  ],
  arc: [
    { n: "Intel Arc A770 (16 GB)",                   y: 2022, v: 16, x: 40, z: 0.8, vend: "Intel", d: "Check the supported backend and the driver/runtime versions for this card." },
    { n: "Intel Arc A380 (6 GB)",                    y: 2022, v: 6,  x: 15, z: 0.8, vend: "Intel", d: "6 GB of VRAM; check backend support and how much memory remains for context and buffers." }
  ],
  /* Not part of DB_GRUPPI_GPU: it is a choice only for the home page,
     which has a VRAM field. The sub-pages do not have that field, so
     this entry must not appear there (it would be read as 0 GB of VRAM). */
  manuale: [
    { n: "Another card (I'll enter the VRAM)", y: 0, v: 0, x: 0, z: 1, vend: "", d: "Card not listed: only specify its memory. Capacity is calculated, speed remains a very rough estimate." }
  ]
};
/* GPU compatibility depends on the motherboard, firmware, power supply,
   case and drivers: it cannot be reliably inferred from the CPU year alone. */

const DB_GRUPPI_GPU = [
  ["Integrated graphics", "ig"],
  ["NVIDIA GeForce GTX (old)", "nvold"],
  ["NVIDIA GeForce GTX / RTX 16xx-20xx", "nv1000"],
  ["NVIDIA GeForce RTX 30xx", "nv2000"],
  ["NVIDIA GeForce RTX 40xx", "nv4000"],
  ["NVIDIA GeForce RTX 50xx", "nv5000"],
  ["AMD Radeon RX (6000-7000)", "amd"],
  ["AMD Radeon RX 9000 (RDNA 4)", "r97"],
  ["Intel Arc", "arc"]
];
/* This row only lives on the home page: the VRAM field exists there, nowhere else. */
const DB_GRUPPI_GPU_HOME = DB_GRUPPI_GPU.concat([["Manual entry", "manuale"]]);

/* ------------------------------------------------------------
   AI MODELS
   p   = parameters in billions
   dim = Q4_K_M file size in GB
   ram = RAM required in GB (with a 2048-token context)
   mc  = internal CPU threshold (0-100) used as a heuristic filter, not
         a manufacturer requirement nor an objective usability measure.
         The memory estimate considers a reference context; the real
         usage depends on the runtime and configuration.
   ------------------------------------------------------------ */
const DB_MODELLI = [
  { n: "Qwen3 0.6B",              f: "Qwen",     p: 0.6, dim: 0.4, ram: 1.0,  mc: 4,  t: "Text",        d: "Example of a small model for tests and simple requests." },
  { n: "Qwen2.5 0.5B Instruct",   f: "Qwen",     p: 0.5, dim: 0.4, ram: 1.0,  mc: 4,  t: "Text",        d: "Compact instruct variant; capability and language depend on the request." },
  { n: "Qwen2.5 1.5B Instruct",   f: "Qwen",     p: 1.5, dim: 1.0, ram: 2.0,  mc: 4,  t: "Text",        d: "Small instruct variant; check language, format and requirements." },
  { n: "Llama 3.2 1B Instruct",   f: "Llama",    p: 1.2, dim: 0.8, ram: 1.5,  mc: 4,  t: "Text",        d: "Compact instruct variant of the Llama 3.2 family." },
  { n: "SmolLM2 1.7B Instruct",   f: "SmolLM",   p: 1.7, dim: 1.2, ram: 2.0,  mc: 12, t: "Text",        d: "Small instruct variant; check language and quality in your case." },
  { n: "Qwen3 1.7B",              f: "Qwen",     p: 1.7, dim: 1.2, ram: 2.0,  mc: 12, t: "Text",        d: "Compact text model; reasoning functions and quality depend on the mode, version and request." },
  { n: "Granite 3.3 2B Instruct", f: "Granite",  p: 2.0, dim: 1.5, ram: 2.5,  mc: 12, t: "Text",        d: "Instruct variant of the Granite family; license and specifications must be checked." },
  { n: "Ministral 3B",            f: "Mistral",  p: 3.0, dim: 1.9, ram: 3.0,  mc: 12, t: "Text",        d: "Model of the Mistral family; check the version and the actual requirements." },
  { n: "Qwen2.5 3B",              f: "Qwen",     p: 3.1, dim: 1.9, ram: 3.2,  mc: 12, t: "Text",        d: "Small text model; try the requests in the desired language." },
  { n: "Llama 3.2 3B Instruct",   f: "Llama",    p: 3.2, dim: 2.0, ram: 3.2,  mc: 12, t: "Text",        d: "Instruct variant of the Llama 3.2 family." },
  { n: "Phi-4-mini-instruct",     f: "Phi",      p: 3.8, dim: 2.5, ram: 4.0,  mc: 20, t: "Text",        d: "Instructed variant; quality on numerical and logical tasks to be verified with representative requests." },
  { n: "Qwen3 4B",                f: "Qwen",     p: 4.0, dim: 2.6, ram: 4.0,  mc: 20, t: "Text",        d: "Text model; format, language and available modes depend on the chosen runtime." },
  { n: "Gemma 3 4B",              f: "Gemma",    p: 4.3, dim: 3.4, ram: 5.0,  mc: 20, t: "Text / Vision", d: "Multimodal variant for text and images; the runtime and backend must support image input." },
  { n: "Mistral 7B Instruct v0.3",f: "Mistral",  p: 7.2, dim: 4.4, ram: 6.0,  mc: 24, t: "Text",        d: "Instruct variant of about 7B; quality and speed depend on the use case." },
  { n: "Qwen2.5 7B Instruct",     f: "Qwen",     p: 7.6, dim: 4.7, ram: 6.3,  mc: 24, t: "Text",        d: "Instruct variant of about 7B; try language, quality and requirements in your case." },
  { n: "Llama 3.1 8B Instruct",   f: "Llama",    p: 8.0, dim: 4.9, ram: 6.8,  mc: 24, t: "Text",        d: "Multilingual instruct variant; the answer depends on the version and request." },
  { n: "Qwen3 8B",                f: "Qwen",     p: 8.2, dim: 5.0, ram: 7.0,  mc: 24, t: "Text",        d: "Example of a text model; check the format and the supported context." },
  { n: "Gemma 3 12B",             f: "Gemma",    p: 12.2, dim: 8.1, ram: 10.0, mc: 36, t: "Text / Vision", d: "Multimodal model for text and images; check the backend, context and variant requirements." },
  { n: "Qwen2.5 14B Instruct",    f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Text",        d: "Example of a 14B model; check the version, quantization and context." },
  { n: "Qwen3 14B",               f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Text",        d: "Example of a 14B model; try the model on the desired task." },
  { n: "Phi-4 14B",               f: "Phi",      p: 14.7, dim: 9.0, ram: 11.5, mc: 36, t: "Text",        d: "Example of a 14B model; quality varies by task and version." },
  { n: "Mistral Small 3.1 24B",   f: "Mistral",  p: 24.4, dim: 15.0, ram: 18.0,mc: 46, t: "Text / Vision", d: "Multimodal model for text and images; check the runtime support and the version requirements." },
  { n: "Gemma 3 27B",             f: "Gemma",    p: 27.4, dim: 17.0, ram: 20.0,mc: 46, t: "Text / Vision", d: "Multimodal variant for text and images; check memory, context and backend." },
  { n: "Qwen3 30B-A3B (MoE)",     f: "Qwen",     p: 30.5, dim: 19.0, ram: 22.0,mc: 52, t: "Text",        d: "MoE architecture: active parameters alone do not determine memory and speed." },
  { n: "Qwen3 32B",               f: "Qwen",     p: 32.8, dim: 20.0, ram: 24.0,mc: 52, t: "Text",        d: "Example of a large model; check the version, quantization and memory." },
  { n: "DeepSeek-R1-Distill-Llama-70B", f: "DeepSeek", p: 70.6, dim: 42.0, ram: 48.0, mc: 62, t: "Reasoning", d: "Large distilled variant; check the size, quantization and actual memory." },
  { n: "Llama 3.3 70B Instruct",   f: "Llama",   p: 70.6, dim: 42.5, ram: 48.0, mc: 62, t: "Text",        d: "Large instruct variant; check file, context, license and memory." },
  { n: "GPT-OSS 120B (MoE)",       f: "GPT-OSS", p: 117.0, dim: 63.0, ram: 70.0, mc: 68, t: "Reasoning", d: "Large MoE architecture; check the actual requirements of the quantization." },
  { n: "Qwen2.5-Coder 1.5B",      f: "Qwen",     p: 1.5, dim: 1.0, ram: 2.0,  mc: 4, t: "Code",        d: "Code-oriented variant; quality and speed depend on the request and hardware." },
  { n: "DeepSeek-Coder 6.7B",     f: "DeepSeek", p: 6.7, dim: 4.1, ram: 5.5,  mc: 24, t: "Code",        d: "Code-oriented variant; check availability, license and version requirements." },
  { n: "Qwen2.5-Coder 7B",        f: "Qwen",     p: 7.6, dim: 4.7, ram: 6.3,  mc: 24, t: "Code",        d: "Code-oriented family; compare the quality on the task you care about." },
  { n: "Qwen2.5-Coder 14B",       f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Code",        d: "Code-oriented variant; quality and requirements depend on the version." },
  { n: "Qwen3-Coder 30B-A3B",     f: "Qwen",     p: 30.5, dim: 19.0, ram: 22.0,mc: 52, t: "Code",        d: "Code-oriented MoE architecture; check memory and runtime." },
  { n: "DeepSeek-R1-Distill-Qwen-1.5B", f: "DeepSeek", p: 1.5, dim: 1.1, ram: 2.2, mc: 4, t: "Reasoning", d: "Compact distilled variant; quality and answer style depend on the version and request." },
  { n: "DeepSeek-R1-Distill-Qwen-7B",   f: "DeepSeek", p: 7.6, dim: 4.7, ram: 6.5, mc: 24, t: "Reasoning", d: "Distilled variant of the R1 family; quality and style vary by version and task." },
  { n: "SmolVLM2 2.2B",           f: "SmolLM",   p: 2.2, dim: 1.5, ram: 3.0,  mc: 12, t: "Text / Vision", d: "Visual and textual model; the runtime must support image input and CPU inference can be slow." },
  { n: "Qwen2.5-VL 3B",           f: "Qwen",     p: 3.8, dim: 3.0, ram: 5.0,  mc: 20, t: "Text / Vision", d: "Multimodal variant for text and images; check the formats supported by the runtime." }
];

const DB_DISTRO = [
  { n: "antiX 26.1 (32-bit)",           s: 0, b32: 1,  e: 22, top: 1, d: "One of the options installable on some 32-bit x86 CPUs; check release, support and compatibility before using it online." },
  { n: "Debian 12 i386 (LTS until 2028)", s: 0, b32: 1, e: 26, d: "i386 support limited to libraries on a 64-bit kernel in Debian 13; Debian 12 is the last release with an i386 installation and its LTS ends in June 2028." },
  { n: "Linux Mint XFCE",              s: 10, e: 999, top: 1, d: "A simple option with the Xfce desktop; space and compatibility vary with the version, drivers and machine." },
  { n: "Xubuntu",                       s: 12, e: 999, d: "Xfce desktop on an Ubuntu base; check requirements, support and compatibility of the chosen version." },
  { n: "Lubuntu (LXQt, supported release)", s: 12, e: 999, d: "LXQt desktop; check that the downloaded version is still within its support period." },
  { n: "Zorin OS 18.1 Lite",             s: 16, e: 999, d: "Xfce desktop with a familiar interface; check the requirements and compatibility of the machine." },
  { n: "Debian stable (64-bit)",         s: 20, e: 999, d: "Flexible system with several desktop options; requirements and resource use depend on the installation." },
  { n: "Ubuntu LTS (64-bit)",            s: 26, e: 999, d: "Extensive documentation and driver availability; check the requirements of the current LTS version." },
  { n: "Fedora Workstation",            s: 44, e: 999, d: "System with frequent updates; check graphics card support and the requirements of the release." },
  { n: "Manjaro / Arch",                s: 58, e: 999, d: "Distributions with rolling updates; suitable for those who want a more hands-on way to configure and maintain the system." }
];

/* ----------------------------------------------------------------
   SCORE CONSTANTS
   ---------------------------------------------------------------- */
const DB_RAMSCORE = { 1: 4, 2: 10, 3: 16, 4: 26, 6: 36, 8: 48, 12: 58, 16: 68, 24: 78, 32: 86, 48: 93, 64: 97, 128: 100 };
/* The year does not enter the AI estimate: it is a summary of the era,
   while the capability comes from CPU and RAM. These weights also remain an estimate. */
function db_punteggioPc(ram, cpu){
  return Math.round((DB_RAMSCORE[ram] || 0) * 0.45 + cpu.sc * 0.55);
}
const DB_MEMBOOST = [0.55, 0.8, 1.0, 1.2, 1.4];
const DB_LIVELLI = [
  { s: 18, n: "Very limited", d: "Limited resources: check the runtime requirements and free memory." },
  { s: 32, n: "Limited",       d: "Start with small models and check the required instructions." },
  { s: 50, n: "Essential",     d: "CPU and RAM allow some options; the result varies by model." },
  { s: 70, n: "Fair",         d: "More headroom for models and programs, with requirements to check." },
  { s: 999, n: "Ample",        d: "The headroom is greater, but VRAM, memory and runtime remain decisive." }
];

/* ----------------------------------------------------------------
   SHARED FUNCTIONS
   ---------------------------------------------------------------- */
function db_livello(sc){
  for (const l of DB_LIVELLI) if (sc < l.s) return l;
  return DB_LIVELLI[DB_LIVELLI.length - 1];
}
/* ----------------------------------------------------------------
   YEAR ↔ PROCESSOR SYNC (used by every page)
   The year is a description of the machine's era and helps to
   contextualize some operating system verdicts; the AI score
   instead uses RAM and CPU. When choosing a processor, the year
   is synchronized as a reference, but it can be corrected by hand.
   - choosing a processor adjusts the year automatically to its
     launch year;
   - if the year was written by the user ("input" event), the written
     value wins and the year is no longer touched;
   - if the CPU is "custom" (y = 0) there is no year to infer.
   cercaCpu(cpuEl) → CPU object {n, y} or null.
   hintEl (text below the field) and combo (list to reorder)
   are optional.
   ---------------------------------------------------------------- */
function db_annoSync(annoEl, cpuEl, cercaCpu, hintEl, combo){
  const base = hintEl ? hintEl.textContent : "";
  const testoManuale = combo
    ? "Year entered manually: it may differ from the CPU launch if the PC was assembled or bought later."
    : "Year written by hand.";
  const stato = { manuale: false };

  function segnaManuale(){
    stato.manuale = true;
    if (hintEl) hintEl.textContent = testoManuale;
    if (combo) combo.aggiorna();
  }
  function leggi(){
    try { return cercaCpu(cpuEl); } catch (e){ return null; }
  }
  function sincronizza(){
    const cpu = leggi();
    if (!cpu || !cpu.y || stato.manuale) return false;
    if (Number(annoEl.value) === cpu.y) return true;
    annoEl.value = cpu.y;
    if (hintEl)
      hintEl.textContent = "Set to " + cpu.y + ", the launch year of the " + cpu.n +
        ": adjust it yourself if the PC was bought later.";
    return true;
  }
  function resetta(val){
    stato.manuale = false;
    if (val !== undefined && val !== null) annoEl.value = val;
    if (hintEl) hintEl.textContent = base;
    if (combo) combo.aggiorna();
  }
  annoEl.addEventListener("input", segnaManuale);
  cpuEl.addEventListener("change", sincronizza);
  return { stato: stato, sincronizza: sincronizza, segnaManuale: segnaManuale, resetta: resetta };
}
function db_num(n, d){ return n.toFixed(d === undefined ? 1 : d); }
function db_tokTesto(v){
  if (v >= 10) return "≈ " + Math.round(v);
  if (v >= 1)  return "≈ " + db_num(v);
  return "≈ " + db_num(v, 2);
}
/* Speed estimates are not a guaranteed value: we show them as a
   range instead of a single number. By default the margin is ±25%;
   when the card was entered manually (only VRAM known) it rises to ±40%,
   because without the model, bandwidth and drivers the error is much larger.
   `db_largoSet` is turned on by the home page, the other pages stay at ±25%. */
let db_largo = false;
function db_largoSet(v){ db_largo = !!v; }
function db_tokRange(v){
  if (!(v > 0)) return "—";
  const k = db_largo ? 0.6 : 0.75;
  const r = x => x >= 10 ? String(Math.round(x)) : db_num(x, x >= 3 ? 0 : 1);
  return "est. ≈ " + r(v * k) + "–" + r(v * (2 - k)) + " tok/s";
}
function db_param(p){
  if (p < 1)  return Math.round(p * 1000) + "M";
  if (p < 10) return db_num(p, 1) + "B";
  return Math.floor(p) + "B";
}
function db_hasCompito(modello, compito){
  return !!(modello && String(modello.t || "").split(/\s*\/\s*/).includes(compito));
}
function db_memName(i){ return ["DDR/DDR2 (≤2008)","DDR2 (2004-2008)","DDR3 (2009-2018)","DDR4 (2014-2023)","DDR5 (2020-)"][i] || "DDR"; }
function db_avxName(i){ return ["no SIMD","AVX","AVX2","AVX-512"][i]; }
/* Labels shown to the user: on Apple Silicon the ISA is ARM with
   NEON and the memory is unified, so "AVX-512" and "DDR5" would be
   wrong information even though the internal multiplier remains. */
function db_simdName(c){ return c && c.arm ? "NEON (ARM)" : db_avxName(c ? c.avx : 0); }
function db_memLabel(c){ return c && c.arm ? "unified memory" : db_memName(c ? c.mem : 0); }

if (typeof document !== "undefined") {
  document.querySelectorAll("#anno, #cmpAAnno, #cmpBAnno").forEach(el => { el.max = DB_ANNO_MAX; });
  document.querySelectorAll("#annoSito, .annoCorrente").forEach(el => { el.textContent = DB_ANNO_MAX; });
}

/* token/s on CPU: grows with the score, collapses with the size */
function db_stimaCpu(p, ctx){
  let v = (1.6 + ctx.sc * 0.30) * Math.min(2.4, Math.max(0.10, 2.8 / p));
  v = Math.min(v, 2 + ctx.sc * 0.32);
  /* The avx field encodes x86 SIMD; on ARM it does not equal AVX-512. */
  v *= ctx.arm ? 1 : ([0.42, 0.82, 1.0, 1.12][ctx.avx] || 1);
  v *= DB_MEMBOOST[ctx.mem] !== undefined ? DB_MEMBOOST[ctx.mem] : 1;
  return Math.max(0.25, v);
}
/* token/s on GPU: the x index is calibrated on a 7B Q4 in VRAM.
   The advantage on small models is capped at 1.8x because at some
   point inference is limited by memory bandwidth, not by compute power. */
function db_stimaGpu(p, gpu){
  if (!gpu || !gpu.x) return 0;
  return gpu.x * Math.min(1.8, Math.max(0.3, 7 / p));
}
function db_stimaTok(p, ctx, dim){
  const gpu = ctx.gpu;
  const onGpu = gpu && gpu.v > 0 && gpu.v >= dim;
  const cpu = db_stimaCpu(p, ctx);
  if (!onGpu) return cpu;
  const g = db_stimaGpu(p, gpu) * (gpu.z || 1);
  // on tiny models the GPU gives no real advantage (launch overhead)
  return Math.max(cpu * 1.15, p < 2 ? Math.min(g, cpu * 1.8) : g);
}
function db_gpuAttivo(ctx, dim){
  const gpu = ctx.gpu;
  return !!(gpu && gpu.v > 0 && gpu.v >= dim);
}

/* ----------------------------------------------------------------
   SEARCH for the "Search…" fields
   With processors the family words are ignored, so
   "ryzen 5 3600" finds the exact model and "i5 2400" finds
   "Core i5-2400". With graphics cards instead the vendor names
   matter: searching "radeon" must return only the Radeons.
   ---------------------------------------------------------------- */
function db_normalizza(s){
  return String(s).toLowerCase()
    .replace(/intel|processor|laptop|ultrabook/g, " ")
    .replace(/[^\w]+/g, " ")
    .trim();
}
function db_normalizzaGpu(s){
  return String(s).toLowerCase().replace(/[^\w]+/g, " ").trim();
}
/* sort by relevance: the beginning of the name counts more than the end */
function db_punteggio(hay, parole){
  let p = 0;
  if (hay.indexOf(parole[0]) === 0) p += 100;
  if (hay.indexOf(" " + parole[0]) !== -1) p += 40;
  parole.forEach(w => { if (hay.indexOf(w) !== -1) p += 5; });
  return p;
}
function db_cerca(query, lista, tipo){
  const norm = tipo === "gpu" ? db_normalizzaGpu : db_normalizza;
  const q = norm(query);
  if (!q) return lista;
  const parole = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const p of lista){
    const hay = norm(p.n) + " " + p.y;
    // every typed word must appear in the name
    if (parole.every(w => hay.indexOf(w) !== -1)) out.push({ p: p, r: db_punteggio(norm(p.n), parole) });
  }
  out.sort((a, b) => b.r - a.r);
  return out.map(x => x.p);
}
function db_tutteCpu(){
  const out = [];
  for (const k in DB_CPU) DB_CPU[k].forEach(p => out.push(p));
  return out;
}
function db_tutteGpu(){
  const out = [];
  for (const k in DB_GPU) DB_GPU[k].forEach(p => out.push(p));
  return out;
}

/* note: if you ever want to switch to an ES module, rename the
   declarations with export and import them with "type=module" */
if (typeof window !== "undefined"){
  window.DB_CPU = DB_CPU;
  window.DB_MODELLI = DB_MODELLI;
}