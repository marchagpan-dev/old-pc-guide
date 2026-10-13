/* ============================================================
   db.js — database condiviso da tutte le pagine di Guida PC Vecchi
   Dati statici + funzioni di calcolo. Nessuna dipendenza.
   ============================================================ */

/* ------------------------------------------------------------
   PROCESSORI
   sc  = indice interno 0-100 usato per le stime, non un punteggio
         ottenuto da un benchmark standardizzato
   y   = anno di lancio
   c/t = core / thread   g = clock GHz
   avx = 0 nessuno | 1 AVX | 2 AVX2 | 3 AVX-512  (classe SIMD, usata
        anche come moltiplicatore di velocità; non è il nome esatto
        delle istruzioni: su ARM il campo è accompagnato da arm: 1)
   arm = 1 su Apple Silicon e altre ARM: le istruzioni sono NEON,
        non AVX, e la memoria è unificata
   mem = 0 DDR/DDR2 | 2 DDR3 | 3 DDR4 | 4 DDR5
   mx  = RAM massima installabile sulle schede madri tipiche di quella
         piattaforma (valori coerenti per socket/epoca)
   ------------------------------------------------------------ */
const DB_CPU = {
  p4: [
    { n: "Pentium 4 3.0 GHz (Northwood, HT)",        y: 2003, sc: 6,  c: 1, t: 2, g: 3.0, avx: 0, mem: 0, mx: 4, b32: 1 },
    { n: "Celeron D 3.0 GHz (verifica il modello esatto)", y: 2004, sc: 6, c: 1, t: 1, g: 3.0, avx: 0, mem: 0, mx: 4, b32: null },
    { n: "Pentium 4 Prescott 2.8-3.4 GHz (verifica il modello esatto)", y: 2004, sc: 8, c: 1, t: 2, g: 3.0, avx: 0, mem: 0, mx: 4, b32: null },
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
    { n: "Core i7-13700H (portatile)",              y: 2022, sc: 70, c: 14, t: 20, g: 2.6, avx: 2, mem: 4, mx: 64 },
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
    { n: "Sempron (profilo generico, verifica modello)", y: 2005, sc: 6, c: 1, t: 1, g: 2.0, avx: 0, mem: 0, mx: 4, b32: null },
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
    { n: "Intel Core i5-4200U (portatile)",         y: 2013, sc: 26, c: 2, t: 4, g: 2.3, avx: 2, mem: 3, mx: 16 },
    { n: "Intel Core i7-4510U (portatile)",         y: 2014, sc: 28, c: 2, t: 4, g: 2.6, avx: 2, mem: 3, mx: 16 }
  ],
  /* Apple Silicon: arm: 1 perché le istruzioni vettoriali sono NEON e
     non AVX/AVX-512, e la memoria è unificata (RAM e GPU condividono
     lo stesso pool: non c'è una VRAM separata da sottrarre). */
  apple: [
    { n: "Apple M1 (base)",                         y: 2020, sc: 80, c: 8, t: 8, g: 3.2, avx: 3, mem: 4, mx: 16, arm: 1 },
    { n: "Apple M2 (base)",                         y: 2022, sc: 86, c: 8, t: 8, g: 3.5, avx: 3, mem: 4, mx: 24, arm: 1 },
    { n: "Apple M3 (base)",                         y: 2023, sc: 90, c: 8, t: 8, g: 4.0, avx: 3, mem: 4, mx: 24, arm: 1 },
    { n: "Apple M4 (base)",                         y: 2024, sc: 95, c: 10, t: 10, g: 4.3, avx: 3, mem: 4, mx: 32, arm: 1 }
  ]
};

const DB_ANNO_MAX = new Date().getFullYear();

/* Modelli di questo elenco verificati nelle liste Microsoft di Windows 11 25H2.
   I modelli non confermati restano da verificare: non deduciamo il supporto
   dalla sola generazione o dall'anno. */
const W11_CPU = new Set([
  "Core i5-8400 (Coffee Lake)",
  "Core i7-8700 (Coffee Lake)",
  "Core i5-9400F (Coffee Lake Refresh)",
  "Core i7-9700 (Coffee Lake Refresh)",
  "Core i9-12900K (Alder Lake)",
  "Core i9-13900K (Raptor Lake)",
  "Core i7-13700H (portatile)",
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
/* Profili di CPU per cui il modello/la famiglia è chiaramente precedente
   alle soglie di supporto Microsoft. Per le CPU non presenti in nessuna
   lista non presumiamo l'incompatibilità: mostriamo una verifica manuale. */
const W11_CPU_NON_SUPPORTATE = new Set([
  "Pentium 4 3.0 GHz (Northwood, HT)",
  "Celeron D 3.0 GHz (verifica il modello esatto)",
  "Pentium 4 Prescott 2.8-3.4 GHz (verifica il modello esatto)",
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
  "Sempron (profilo generico, verifica modello)",
  "Athlon 64 X2 3800+",
  "Athlon II X2 240",
  "Phenom II X4 955",
  "FX-4350 (Bulldozer)",
  "FX-8350 (Piledriver)",
  "Ryzen 3 2200G",
  "Ryzen 5 2400G",
  "Intel Core i5-4200U (portatile)",
  "Intel Core i7-4510U (portatile)"
]);
for (const k in DB_CPU) DB_CPU[k].forEach(p => {
  p.w11 = W11_CPU.has(p.n) ? 1 : W11_CPU_NON_SUPPORTATE.has(p.n) ? 0 : null;
});

const DB_GRUPPI_CPU = [
  ["Intel Pentium 4 / Celeron / Atom (1999-2008)", "p4"],
  ["Intel Core 2 e Pentium Dual-Core (2006-2010)", "c2"],
  ["Intel Westmere, Sandy Bridge, Ivy Bridge (2010-2013)", "nhm"],
  ["Intel Haswell → Coffee Lake Refresh (2013-2019)", "hz"],
  ["Intel Core 12ª/13ª gen e Core Ultra (2021-)", "alder"],
  ["Intel Xeon / server (2014-)", "xe"],
  ["AMD Athlon, Sempron, Phenom II (2003-2011)", "amdold"],
  ["AMD FX, Athlon 3000G, Ryzen con APU (2012-2019)", "amdfx"],
  ["AMD Ryzen 2000-9000 e Ryzen AI (2018-)", "ryzen"],
  ["Intel Core portatili (ultrabook 2013-2015)", "mob"],
  ["Apple Silicon (2020-)", "apple"]
];

/* ------------------------------------------------------------
   SCHEDE GRAFICHE
   v = VRAM in GB (0 = integrata, VRAM condivisa)
   x = indice interno per una stima indicativa, non un benchmark
   z = fattore interno approssimativo per backend/driver, non una
       misura della compatibilità o delle prestazioni garantite
   ------------------------------------------------------------ */
const DB_GPU = {
  ig: [
    { n: "Solo grafica integrata / nessuna GPU", y: 0, v: 0, x: 0, z: 0, vend: "", d: "Questa stima non calcola l'accelerazione della grafica integrata: alcune GPU integrate moderne supportano backend AI dedicati." }
  ],
  nvold: [
    { n: "GeForce GTX 1050 Ti (4 GB)",              y: 2016, v: 4,  x: 15, z: 1.0, vend: "NVIDIA", d: "4 GB di VRAM: valuta modelli piccoli e verifica i requisiti del runtime; Compute Capability 6.1." },
    { n: "GeForce GTX 1060 (6 GB)",                 y: 2016, v: 6,  x: 18, z: 1.0, vend: "NVIDIA", d: "Ancora usata, ma 6 GB limitano molto i modelli grandi." },
    { n: "GeForce GTX 1650 (4 GB)",                 y: 2019, v: 4,  x: 14, z: 1.0, vend: "NVIDIA", d: "Prestazioni modeste: meglio 8 GB di VRAM che potenza." }
  ],
  nv1000: [
    { n: "GeForce GTX 1660 Super (6 GB)",           y: 2019, v: 6,  x: 25, z: 1.0, vend: "NVIDIA", d: "La VRAM limita le dimensioni caricabili; prestazioni e supporto dipendono dal runtime." },
    { n: "GeForce GTX 1660 Ti (6 GB)",              y: 2019, v: 6,  x: 28, z: 1.0, vend: "NVIDIA", d: "Controlla memoria disponibile, driver e backend prima di scegliere il modello." },
    { n: "GeForce RTX 2060 (6 GB)",                 y: 2019, v: 6,  x: 35, z: 1.0, vend: "NVIDIA", d: "GPU con Tensor Core; il runtime deve supportare la scheda e il backend scelto." },
    { n: "GeForce RTX 2060 Super (8 GB)",           y: 2020, v: 8,  x: 40, z: 1.0, vend: "NVIDIA", d: "8 GB di VRAM; verifica requisiti del modello, contesto e margine per il runtime." },
    { n: "GeForce RTX 3050 (8 GB)",                 y: 2022, v: 8,  x: 28, z: 1.0, vend: "NVIDIA", d: "Scheda desktop da 8 GB; la velocità varia con modello, backend e driver." }
  ],
  nv2000: [
    { n: "GeForce RTX 3060 (8 GB)",                 y: 2022, v: 8,  x: 50, z: 1.0, vend: "NVIDIA", d: "La VRAM limita i modelli più grandi; le prestazioni dipendono dal backend." },
    { n: "GeForce RTX 3060 (12 GB)",                y: 2021, v: 12, x: 55, z: 1.0, vend: "NVIDIA", d: "12 GB di VRAM; capacità e velocità dipendono da modello, contesto e backend." },
    { n: "GeForce RTX 3070 (8 GB)",                 y: 2020, v: 8,  x: 65, z: 1.0, vend: "NVIDIA", d: "La capacità di 8 GB pone un limite ai modelli caricabili; la velocità varia per runtime." },
    { n: "GeForce RTX 3070 Ti (8 GB)",              y: 2021, v: 8,  x: 75, z: 1.0, vend: "NVIDIA", d: "8 GB di VRAM; lascia margine per contesto e buffer e verifica il supporto software." },
    { n: "GeForce RTX 3080 (10 GB)",                y: 2020, v: 10, x: 85, z: 1.0, vend: "NVIDIA", d: "10 GB di VRAM; velocità stimata, dipende dal modello e dal backend." },
    { n: "GeForce RTX 3080 Ti (12 GB)",             y: 2021, v: 12, x: 90, z: 1.0, vend: "NVIDIA", d: "12 GB di VRAM; verifica il margine per modello, contesto e buffer." },
    { n: "GeForce RTX 3090 (24 GB)",                y: 2020, v: 24, x: 110, z: 1.0, vend: "NVIDIA", d: "24 GB di VRAM; capacità e prestazioni dipendono da pesi, contesto, buffer e backend." },
    { n: "GeForce RTX 3060 Ti (8 GB)",              y: 2020, v: 8,  x: 52, z: 1.0, vend: "NVIDIA", d: "Buona velocità, con gli 8 GB come limite alla taglia dei modelli." }
  ],
  nv4000: [
    { n: "GeForce RTX 4060 (8 GB)",                 y: 2023, v: 8,  x: 45, z: 1.0, vend: "NVIDIA", d: "Efficienza e basso consumo: 8 GB di limite." },
    { n: "GeForce RTX 4060 Ti (8 GB)",              y: 2023, v: 8,  x: 52, z: 1.0, vend: "NVIDIA", d: "Buon compromesso per uso quotidiano + AI." },
    { n: "GeForce RTX 4070 (12 GB)",                y: 2023, v: 12, x: 78, z: 1.0, vend: "NVIDIA", d: "12 GB possono ospitare molti modelli 7-14B in Q4; controlla il contesto e la memoria libera." },
    { n: "GeForce RTX 4070 Ti (12 GB)",             y: 2023, v: 12, x: 90, z: 1.0, vend: "NVIDIA", d: "12 GB possono ospitare diversi modelli quantizzati, ma contesto e backend riducono il margine." },
    { n: "GeForce RTX 4080 (16 GB)",                y: 2023, v: 16, x: 95, z: 1.0, vend: "NVIDIA", d: "16 GB consentono modelli medi; contesto e cache possono ridurre la memoria disponibile." },
    { n: "GeForce RTX 4080 Super (16 GB)",          y: 2024, v: 16, x: 102, z: 1.0, vend: "NVIDIA", d: "Poco più veloce della 4080, stesso tetto di 16 GB." },
    { n: "GeForce RTX 4070 Ti Super (16 GB)",       y: 2024, v: 16, x: 98, z: 1.0, vend: "NVIDIA", d: "I 16 GB offrono margine per modelli medi; disponibilità effettiva dipende dal contesto." },
    { n: "GeForce RTX 4090 (24 GB)",                y: 2022, v: 24, x: 120, z: 1.0, vend: "NVIDIA", d: "24 GB di VRAM; prestazioni e dimensioni caricabili dipendono da modello e backend." }
  ],
  nv5000: [
    { n: "GeForce RTX 5060 Ti (16 GB)",             y: 2025, v: 16, x: 92, z: 1.0, vend: "NVIDIA", d: "16 GB di VRAM; verifica requisiti e spazio per contesto e buffer." },
    { n: "GeForce RTX 5060 Ti (8 GB)",              y: 2025, v: 8,  x: 90, z: 1.0, vend: "NVIDIA", d: "Veloce, ma 8 GB limitano i modelli grandi." },
    { n: "GeForce RTX 5070 (12 GB)",                y: 2025, v: 12, x: 115, z: 1.0, vend: "NVIDIA", d: "12 GB possono ospitare molti modelli 7-14B Q4; il contesto usa ulteriore memoria." },
    { n: "GeForce RTX 5070 Ti (16 GB)",             y: 2025, v: 16, x: 140, z: 1.0, vend: "NVIDIA", d: "16 GB offrono più margine per modelli medi, secondo quantizzazione e contesto." },
    { n: "GeForce RTX 5080 (16 GB)",                y: 2025, v: 16, x: 165, z: 1.0, vend: "NVIDIA", d: "16 GB; i modelli oltre questa capienza richiedono offload parziale o memoria di sistema." },
    { n: "GeForce RTX 5090 (32 GB)",                y: 2025, v: 32, x: 230, z: 1.0, vend: "NVIDIA", d: "32 GB: adatta a modelli grandi, ma un 70B Q4 non entra interamente in VRAM." }
  ],
  amd: [
    { n: "Radeon RX 580 (8 GB)",                     y: 2016, v: 8,  x: 15, z: 0.85, vend: "AMD", d: "Verifica il supporto della specifica scheda nel runtime e nel backend del sistema scelto." },
    { n: "Radeon RX 6600 (8 GB)",                    y: 2021, v: 8,  x: 22, z: 0.85, vend: "AMD", d: "Supporto e prestazioni variano con runtime, driver, backend e sistema operativo." },
    { n: "Radeon RX 6700 XT (12 GB)",                y: 2021, v: 12, x: 40, z: 0.9,  vend: "AMD", d: "Con 12 GB di VRAM è una buona base per modelli medio-grandi." },
    { n: "Radeon RX 6750 XT (12 GB)",                y: 2022, v: 12, x: 48, z: 0.9,  vend: "AMD", d: "12 GB di VRAM; backend e driver incidono molto sulle prestazioni." },
    { n: "Radeon RX 7600 (8 GB)",                    y: 2023, v: 8,  x: 42, z: 0.85, vend: "AMD", d: "8 GB di VRAM; velocità e compatibilità dipendono da backend, driver e sistema operativo." },
    { n: "Radeon RX 7800 XT (16 GB)",                y: 2023, v: 16, x: 62, z: 0.9,  vend: "AMD", d: "16 GB di VRAM; verifica compatibilità del runtime, driver e memoria richiesta dal modello." },
    { n: "Radeon RX 7900 GRE (16 GB)",               y: 2024, v: 16, x: 68, z: 0.9,  vend: "AMD", d: "16 GB; disponibilità per modelli medi dipende da contesto e backend." },
    { n: "Radeon RX 7900 XT (20 GB)",                y: 2022, v: 20, x: 78, z: 0.9,  vend: "AMD", d: "20 GB di VRAM; capacità e prestazioni dipendono da modello e backend." },
    { n: "Radeon RX 7900 XTX (24 GB)",               y: 2022, v: 24, x: 85, z: 0.95, vend: "AMD", d: "24 GB di VRAM; verifica il supporto del runtime e il margine per il contesto." }
  ],
  r97: [
    { n: "Radeon RX 9060 XT (8 GB)",                 y: 2025, v: 8,  x: 48, z: 0.9,  vend: "AMD", d: "Nuova generazione: veloce sui 7-8B, 8 GB come limite." },
    { n: "Radeon RX 9060 XT (16 GB)",                y: 2025, v: 16, x: 50, z: 0.9,  vend: "AMD", d: "16 GB di VRAM; verifica supporto software, driver e memoria per contesto e buffer." },
    { n: "Radeon RX 9070 (16 GB)",                   y: 2025, v: 16, x: 78, z: 0.9,  vend: "AMD", d: "Capacità e velocità dei modelli dipendono dal runtime e dal backend compatibile." },
    { n: "Radeon RX 9070 XT (16 GB)",                y: 2025, v: 16, x: 88, z: 0.9,  vend: "AMD", d: "16 GB di VRAM; controlla dimensione del modello, contesto e supporto del backend." }
  ],
  arc: [
    { n: "Intel Arc A770 (16 GB)",                   y: 2022, v: 16, x: 40, z: 0.8, vend: "Intel", d: "Verifica il backend supportato e le versioni di driver/runtime per questa scheda." },
    { n: "Intel Arc A380 (6 GB)",                    y: 2022, v: 6,  x: 15, z: 0.8, vend: "Intel", d: "6 GB di VRAM; controlla il supporto del backend e quanta memoria resta per contesto e buffer." }
  ],
  /* Non appartiene a DB_GRUPPI_GPU: è una scelta della sola home, che ha
     un campo per la VRAM. Le sotto-pagine non hanno quel campo, quindi
     questa voce lì non deve comparire (verrebbe letta come 0 GB di VRAM). */
  manuale: [
    { n: "Altra scheda (inserisco la VRAM)", y: 0, v: 0, x: 0, z: 1, vend: "", d: "Scheda non in elenco: ne indichi solo la memoria. La capacità si calcola, la velocità resta una stima molto approssimativa." }
  ]
};
/* La compatibilità di una GPU dipende da scheda madre, firmware, alimentatore,
   case e driver: non si deduce in modo affidabile dal solo anno della CPU. */

const DB_GRUPPI_GPU = [
  ["Grafica integrata", "ig"],
  ["NVIDIA GeForce GTX (vecchie)", "nvold"],
  ["NVIDIA GeForce GTX / RTX 16xx-20xx", "nv1000"],
  ["NVIDIA GeForce RTX 30xx", "nv2000"],
  ["NVIDIA GeForce RTX 40xx", "nv4000"],
  ["NVIDIA GeForce RTX 50xx", "nv5000"],
  ["AMD Radeon RX (6000-7000)", "amd"],
  ["AMD Radeon RX 9000 (RDNA 4)", "r97"],
  ["Intel Arc", "arc"]
];
/* Questa riga vive solo in home: lì esiste il campo VRAM, altrove no. */
const DB_GRUPPI_GPU_HOME = DB_GRUPPI_GPU.concat([["Inserimento manuale", "manuale"]]);

/* ------------------------------------------------------------
   MODELLI AI
   p   = parametri in miliardi
   dim = dimensione del file Q4_K_M in GB
   ram = RAM richiesta in GB (con contesto da 2048 token)
   mc  = soglia CPU interna (0-100) usata come filtro euristico, non
         un requisito del produttore né una misura oggettiva di usabilità.
         La stima di memoria considera un contesto di riferimento; il
         consumo reale dipende da runtime e configurazione.
   ------------------------------------------------------------ */
const DB_MODELLI = [
  { n: "Qwen3 0.6B",              f: "Qwen",     p: 0.6, dim: 0.4, ram: 1.0,  mc: 4,  t: "Testo",        d: "Esempio di modello di piccola taglia per prove e richieste semplici." },
  { n: "Qwen2.5 0.5B Instruct",   f: "Qwen",     p: 0.5, dim: 0.4, ram: 1.0,  mc: 4,  t: "Testo",        d: "Variante instruct compatta; capacità e lingua dipendono dalla richiesta." },
  { n: "Qwen2.5 1.5B Instruct",   f: "Qwen",     p: 1.5, dim: 1.0, ram: 2.0,  mc: 4,  t: "Testo",        d: "Variante instruct di piccola taglia; verifica lingua, formato e requisiti." },
  { n: "Llama 3.2 1B Instruct",   f: "Llama",    p: 1.2, dim: 0.8, ram: 1.5,  mc: 4,  t: "Testo",        d: "Variante instruct compatta della famiglia Llama 3.2." },
  { n: "SmolLM2 1.7B Instruct",   f: "SmolLM",   p: 1.7, dim: 1.2, ram: 2.0,  mc: 12, t: "Testo",        d: "Variante instruct di piccola taglia; controlla lingua e qualità nel tuo caso." },
  { n: "Qwen3 1.7B",              f: "Qwen",     p: 1.7, dim: 1.2, ram: 2.0,  mc: 12, t: "Testo",        d: "Modello di testo compatto; funzioni di ragionamento e qualità dipendono da modalità, versione e richiesta." },
  { n: "Granite 3.3 2B Instruct", f: "Granite",  p: 2.0, dim: 1.5, ram: 2.5,  mc: 12, t: "Testo",        d: "Variante instruct della famiglia Granite; licenza e specifiche vanno verificate." },
  { n: "Ministral 3B",            f: "Mistral",  p: 3.0, dim: 1.9, ram: 3.0,  mc: 12, t: "Testo",        d: "Modello della famiglia Mistral; controlla la versione e i requisiti effettivi." },
  { n: "Qwen2.5 3B",              f: "Qwen",     p: 3.1, dim: 1.9, ram: 3.2,  mc: 12, t: "Testo",        d: "Modello di testo di piccola taglia; prova le richieste nella lingua desiderata." },
  { n: "Llama 3.2 3B Instruct",   f: "Llama",    p: 3.2, dim: 2.0, ram: 3.2,  mc: 12, t: "Testo",        d: "Variante instruct della famiglia Llama 3.2." },
  { n: "Phi-4-mini-instruct",     f: "Phi",      p: 3.8, dim: 2.5, ram: 4.0,  mc: 20, t: "Testo",        d: "Variante istruita; qualità nei compiti numerici e logici da verificare con richieste rappresentative." },
  { n: "Qwen3 4B",                f: "Qwen",     p: 4.0, dim: 2.6, ram: 4.0,  mc: 20, t: "Testo",        d: "Modello di testo; formato, lingua e modalità disponibili dipendono dal runtime scelto." },
  { n: "Gemma 3 4B",              f: "Gemma",    p: 4.3, dim: 3.4, ram: 5.0,  mc: 20, t: "Testo / Visione", d: "Variante multimodale per testo e immagini; runtime e backend devono supportare l'input immagine." },
  { n: "Mistral 7B Instruct v0.3",f: "Mistral",  p: 7.2, dim: 4.4, ram: 6.0,  mc: 24, t: "Testo",        d: "Variante instruct da circa 7B; qualità e velocità dipendono dal caso d'uso." },
  { n: "Qwen2.5 7B Instruct",     f: "Qwen",     p: 7.6, dim: 4.7, ram: 6.3,  mc: 24, t: "Testo",        d: "Variante instruct da circa 7B; prova lingua, qualità e requisiti nel tuo caso." },
  { n: "Llama 3.1 8B Instruct",   f: "Llama",    p: 8.0, dim: 4.9, ram: 6.8,  mc: 24, t: "Testo",        d: "Variante instruct multilingue; la risposta dipende da versione e richiesta." },
  { n: "Qwen3 8B",                f: "Qwen",     p: 8.2, dim: 5.0, ram: 7.0,  mc: 24, t: "Testo",        d: "Esempio di modello di testo; verifica il formato e il contesto supportato." },
  { n: "Gemma 3 12B",             f: "Gemma",    p: 12.2, dim: 8.1, ram: 10.0, mc: 36, t: "Testo / Visione", d: "Modello multimodale per testo e immagini; verifica backend, contesto e requisiti della variante." },
  { n: "Qwen2.5 14B Instruct",    f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Testo",        d: "Esempio di modello 14B; verifica versione, quantizzazione e contesto." },
  { n: "Qwen3 14B",               f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Testo",        d: "Esempio di modello 14B; prova il modello sul compito desiderato." },
  { n: "Phi-4 14B",               f: "Phi",      p: 14.7, dim: 9.0, ram: 11.5, mc: 36, t: "Testo",        d: "Esempio di modello 14B; qualità variabile per compito e versione." },
  { n: "Mistral Small 3.1 24B",   f: "Mistral",  p: 24.4, dim: 15.0, ram: 18.0,mc: 46, t: "Testo / Visione", d: "Modello multimodale per testo e immagini; verifica il supporto del runtime e i requisiti della versione." },
  { n: "Gemma 3 27B",             f: "Gemma",    p: 27.4, dim: 17.0, ram: 20.0,mc: 46, t: "Testo / Visione", d: "Variante multimodale per testo e immagini; verifica memoria, contesto e backend." },
  { n: "Qwen3 30B-A3B (MoE)",     f: "Qwen",     p: 30.5, dim: 19.0, ram: 22.0,mc: 52, t: "Testo",        d: "Architettura MoE: i parametri attivi non determinano da soli memoria e velocità." },
  { n: "Qwen3 32B",               f: "Qwen",     p: 32.8, dim: 20.0, ram: 24.0,mc: 52, t: "Testo",        d: "Esempio di modello di grande taglia; verifica versione, quantizzazione e memoria." },
  { n: "DeepSeek-R1-Distill-Llama-70B", f: "DeepSeek", p: 70.6, dim: 42.0, ram: 48.0, mc: 62, t: "Ragionamento", d: "Variante distillata di grande taglia; verifica dimensione, quantizzazione e memoria effettiva." },
  { n: "Llama 3.3 70B Instruct",   f: "Llama",   p: 70.6, dim: 42.5, ram: 48.0, mc: 62, t: "Testo",        d: "Variante instruct di grande taglia; controlla file, contesto, licenza e memoria." },
  { n: "GPT-OSS 120B (MoE)",       f: "GPT-OSS", p: 117.0, dim: 63.0, ram: 70.0, mc: 68, t: "Ragionamento", d: "Architettura MoE di grandi dimensioni; verifica i requisiti effettivi della quantizzazione." },
  { n: "Qwen2.5-Coder 1.5B",      f: "Qwen",     p: 1.5, dim: 1.0, ram: 2.0,  mc: 4, t: "Codice",       d: "Variante orientata al codice; qualità e velocità dipendono da richiesta e hardware." },
  { n: "DeepSeek-Coder 6.7B",     f: "DeepSeek", p: 6.7, dim: 4.1, ram: 5.5,  mc: 24, t: "Codice",       d: "Variante orientata al codice; controlla disponibilità, licenza e requisiti della versione." },
  { n: "Qwen2.5-Coder 7B",        f: "Qwen",     p: 7.6, dim: 4.7, ram: 6.3,  mc: 24, t: "Codice",       d: "Famiglia orientata al codice; confronta la qualità sul compito che ti interessa." },
  { n: "Qwen2.5-Coder 14B",       f: "Qwen",     p: 14.8, dim: 9.0, ram: 11.0, mc: 36, t: "Codice",       d: "Variante orientata al codice; qualità e requisiti dipendono dalla versione." },
  { n: "Qwen3-Coder 30B-A3B",     f: "Qwen",     p: 30.5, dim: 19.0, ram: 22.0,mc: 52, t: "Codice",       d: "Architettura MoE orientata al codice; verifica memoria e runtime." },
  { n: "DeepSeek-R1-Distill-Qwen-1.5B", f: "DeepSeek", p: 1.5, dim: 1.1, ram: 2.2, mc: 4, t: "Ragionamento", d: "Variante distillata compatta; qualità e stile delle risposte dipendono da versione e richiesta." },
  { n: "DeepSeek-R1-Distill-Qwen-7B",   f: "DeepSeek", p: 7.6, dim: 4.7, ram: 6.5, mc: 24, t: "Ragionamento", d: "Variante distillata della famiglia R1; qualità e stile variano per versione e compito." },
  { n: "SmolVLM2 2.2B",           f: "SmolLM",   p: 2.2, dim: 1.5, ram: 3.0,  mc: 12, t: "Testo / Visione", d: "Modello visivo e testuale; il runtime deve supportare l'input immagine e l'inferenza CPU può essere lenta." },
  { n: "Qwen2.5-VL 3B",           f: "Qwen",     p: 3.8, dim: 3.0, ram: 5.0,  mc: 20, t: "Testo / Visione", d: "Variante multimodale per testo e immagini; verifica i formati supportati dal runtime." }
];

const DB_DISTRO = [
  { n: "antiX 26.1 (32 bit)",           s: 0, b32: 1,  e: 22, top: 1, d: "Una delle opzioni installabili su alcune CPU x86 a 32 bit; controlla release, supporto e compatibilità prima di usarla online." },
  { n: "Debian 12 i386 (LTS fino al 2028)", s: 0, b32: 1, e: 26, d: "Supporto i386 limitato alle librerie su kernel a 64 bit in Debian 13; Debian 12 è l'ultima release con installazione i386 e il suo LTS termina a giugno 2028." },
  { n: "Linux Mint XFCE",              s: 10, e: 999, top: 1, d: "Un'opzione semplice con desktop Xfce; spazio e compatibilità variano con versione, driver e macchina." },
  { n: "Xubuntu",                       s: 12, e: 999, d: "Desktop Xfce su base Ubuntu; controlla requisiti, supporto e compatibilità della versione scelta." },
  { n: "Lubuntu (LXQt, versione supportata)", s: 12, e: 999, d: "Desktop LXQt; controlla che la versione scaricata sia ancora nel periodo di supporto." },
  { n: "Zorin OS 18.1 Lite",             s: 16, e: 999, d: "Desktop Xfce con interfaccia familiare; verifica requisiti e compatibilità della macchina." },
  { n: "Debian stable (64 bit)",         s: 20, e: 999, d: "Sistema flessibile con diverse opzioni di desktop; requisiti e consumo dipendono dall'installazione." },
  { n: "Ubuntu LTS (64 bit)",            s: 26, e: 999, d: "Ampia documentazione e disponibilità di driver; controlla i requisiti della versione LTS corrente." },
  { n: "Fedora Workstation",            s: 44, e: 999, d: "Sistema con aggiornamenti frequenti; controlla supporto della scheda grafica e requisiti della release." },
  { n: "Manjaro / Arch",                s: 58, e: 999, d: "Distribuzioni con aggiornamenti continui; adatte a chi vuole configurare e mantenere il sistema in modo più diretto." }
];

/* ----------------------------------------------------------------
   COSTANTI DI PUNTEGGIO
   ---------------------------------------------------------------- */
const DB_RAMSCORE = { 1: 4, 2: 10, 3: 16, 4: 26, 6: 36, 8: 48, 12: 58, 16: 68, 24: 78, 32: 86, 48: 93, 64: 97, 128: 100 };
/* L'anno non entra nella stima dell'AI: è un riepilogo dell'epoca, mentre
   la capacità deriva da CPU e RAM. Anche questi pesi restano una stima. */
function db_punteggioPc(ram, cpu){
  return Math.round((DB_RAMSCORE[ram] || 0) * 0.45 + cpu.sc * 0.55);
}
const DB_MEMBOOST = [0.55, 0.8, 1.0, 1.2, 1.4];
const DB_LIVELLI = [
  { s: 18, n: "Molto limitato", d: "Risorse contenute: verifica requisiti del runtime e memoria libera." },
  { s: 32, n: "Limitato",       d: "Inizia da modelli piccoli e controlla le istruzioni richieste." },
  { s: 50, n: "Essenziale",     d: "CPU e RAM consentono alcune opzioni; il risultato varia per modello." },
  { s: 70, n: "Discreto",       d: "Più margine per modelli e programmi, con requisiti da verificare." },
  { s: 999, n: "Ampio",         d: "Il margine è maggiore, ma VRAM, memoria e runtime restano determinanti." }
];

/* ----------------------------------------------------------------
   FUNZIONI CONDIVISE
   ---------------------------------------------------------------- */
function db_livello(sc){
  for (const l of DB_LIVELLI) if (sc < l.s) return l;
  return DB_LIVELLI[DB_LIVELLI.length - 1];
}
/* ----------------------------------------------------------------
   CORRELAZIONE ANNO ↔ PROCESSORE (usata da tutte le pagine)
   L'anno è una descrizione dell'epoca della macchina e aiuta a
   contestualizzare alcuni verdetti di sistema operativo; il punteggio
   AI usa invece RAM e CPU. Scegliendo un processore, l'anno viene
   sincronizzato come riferimento, ma può essere corretto a mano.
   - scegliendo un processore l'anno si aggiusta da solo sul suo
     anno di lancio;
   - se l'anno l'ha scritto l'utente (evento "input"), vince quello
     scritto e l'anno non viene più toccato;
   - se la CPU è "personalizzata" (y = 0) non c'è anno da dedurre.
   cercaCpu(cpuEl) → oggetto CPU {n, y} oppure null.
   hintEl (testo sotto il campo) e combo (elenco da riordinare)
   sono facoltativi.
   ---------------------------------------------------------------- */
function db_annoSync(annoEl, cpuEl, cercaCpu, hintEl, combo){
  const base = hintEl ? hintEl.textContent : "";
  const testoManuale = combo
    ? "Anno inserito a mano: può differire dal lancio della CPU se il PC è stato assemblato o acquistato più tardi."
    : "Anno scritto a mano.";
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
      hintEl.textContent = "Impostato a " + cpu.y + ", anno di lancio di " + cpu.n +
        ": correggilo tu se il PC è stato comprato più tardi.";
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
function db_num(n, d){ return n.toFixed(d === undefined ? 1 : d).replace(".", ","); }
function db_tokTesto(v){
  if (v >= 10) return "≈ " + Math.round(v);
  if (v >= 1)  return "≈ " + db_num(v);
  return "≈ " + db_num(v, 2);
}
/* Le stime di velocità non sono un valore garantito: le mostriamo come
   intervallo invece di un numero secco. Di default il margine è ±25%;
   quando la scheda è stata inserita a mano (solo VRAM nota) sale a ±40%,
   perché senza modello, banda e driver l'errore è molto più grosso.
   `db_largoSet` la accende la home, le altre pagine restano su ±25%. */
let db_largo = false;
function db_largoSet(v){ db_largo = !!v; }
function db_tokRange(v){
  if (!(v > 0)) return "—";
  const k = db_largo ? 0.6 : 0.75;
  const r = x => x >= 10 ? String(Math.round(x)) : db_num(x, x >= 3 ? 0 : 1);
  return "stima ≈ " + r(v * k) + "–" + r(v * (2 - k)) + " tok/s";
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
function db_avxName(i){ return ["nessun SIMD","AVX","AVX2","AVX-512"][i]; }
/* Etichette da mostrare all'utente: su Apple Silicon l'ISA è ARM con
   NEON e la memoria è unificata, quindi "AVX-512" e "DDR5" sarebbero
   informazioni sbagliate anche se il moltiplicatore interno resta. */
function db_simdName(c){ return c && c.arm ? "NEON (ARM)" : db_avxName(c ? c.avx : 0); }
function db_memLabel(c){ return c && c.arm ? "memoria unificata" : db_memName(c ? c.mem : 0); }

if (typeof document !== "undefined") {
  document.querySelectorAll("#anno, #cmpAAnno, #cmpBAnno").forEach(el => { el.max = DB_ANNO_MAX; });
  document.querySelectorAll("#annoSito, .annoCorrente").forEach(el => { el.textContent = DB_ANNO_MAX; });
}

/* token/s su CPU: cresce col punteggio, crolla colla dimensione */
function db_stimaCpu(p, ctx){
  let v = (1.6 + ctx.sc * 0.30) * Math.min(2.4, Math.max(0.10, 2.8 / p));
  v = Math.min(v, 2 + ctx.sc * 0.32);
  /* Il campo avx codifica SIMD x86; su ARM non equivale ad AVX-512. */
  v *= ctx.arm ? 1 : ([0.42, 0.82, 1.0, 1.12][ctx.avx] || 1);
  v *= DB_MEMBOOST[ctx.mem] !== undefined ? DB_MEMBOOST[ctx.mem] : 1;
  return Math.max(0.25, v);
}
/* token/s su GPU: l'indice x è calibrato su un 7B Q4 in VRAM.
   Il vantaggio sui modelli piccoli è limitato a 1,8x perché a un
   certo punto l'inferenza è limitata dalla banda di memoria, non
   dalla potenza di calcolo. */
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
  // sui modelli minuscoli la GPU non dà vantaggi reali (overhead di lancio)
  return Math.max(cpu * 1.15, p < 2 ? Math.min(g, cpu * 1.8) : g);
}
function db_gpuAttivo(ctx, dim){
  const gpu = ctx.gpu;
  return !!(gpu && gpu.v > 0 && gpu.v >= dim);
}

/* ----------------------------------------------------------------
   RICERCA per i campi "Cerca…"
   Con i processori le parole di famiglia vengono ignorate, così
   "ryzen 5 3600" trova il modello esatto e "i5 2400" trova
   "Core i5-2400". Con le schede grafiche invece i nomi del vendor
   contano: cercare "radeon" deve restituire solo le Radeon.
   ---------------------------------------------------------------- */
function db_normalizza(s){
  return String(s).toLowerCase()
    .replace(/intel|processor|portatile|ultrabook/g, " ")
    .replace(/[^\w]+/g, " ")
    .trim();
}
function db_normalizzaGpu(s){
  return String(s).toLowerCase().replace(/[^\w]+/g, " ").trim();
}
/* ordina per pertinenza: l'inizio del nome conta più del fondo */
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
    // ogni parola scritta deve comparire nel nome
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

/* nota: se in futuro vuoi passare a un ES module, rinomina le
   dichiarazioni con export e importale con "type=module" */
if (typeof window !== "undefined"){
  window.DB_CPU = DB_CPU;
  window.DB_MODELLI = DB_MODELLI;
}
