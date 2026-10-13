/* ============================================================
   app.js — main calculator of Old PC Guide
   Logic: here. Shared data and formulas: db.js
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
function escapeHtml(value){
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

const RAM_VALS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];
let STATO = null;
let HINT_CPU_BASE = ""; /* initial text of #hintCpu, restored by the reset */
let COMBO_APERTA = null;

/* ============================================================
   1. COMBOBOX (CPU / GPU search)
   ============================================================ */
function Combo(inputId, selectId, listId, noteId, gruppi, fonte, all, tipo, opt){
  opt = opt || {};
  const input = $(inputId), select = $(selectId), list = $(listId), note = $(noteId);
  let items = [];
  let attivo = -1;

  function mappa(){
    // all entries, grouped by optgroup
    items = [];
    gruppi.forEach(([etichetta, chiave]) => {
      (fonte[chiave] || []).forEach(p => items.push({
        n: p.n, y: p.y, gruppo: etichetta,
        sub: p.v ? [p.vend, p.v + " GB VRAM", p.y].filter(Boolean).join(" · ")
                 : (p.y ? "no AI acceleration · " + p.y : "no AI acceleration")
      }));
    });
    return items;
  }
  function riempiSelect(){
    select.innerHTML = "";
    gruppi.forEach(([etichetta, chiave]) => {
      const voci = fonte[chiave] || [];
      if (!voci.length) return;
      const og = document.createElement("optgroup");
      og.label = etichetta;
      voci.forEach(p => {
        const o = document.createElement("option");
        o.value = p.n;
        o.textContent = p.n;
        og.appendChild(o);
      });
      select.appendChild(og);
    });
    if (all) select.appendChild(all);
  }
  /* The "no results" message lives in a separate <p>: inside a
     role="listbox" an <li> without role="option" would break the
     ARIA hierarchy. */
  function apri(filtro){
    if (COMBO_APERTA && COMBO_APERTA !== chiudi) COMBO_APERTA();
    COMBO_APERTA = chiudi;
    const q = filtro === undefined ? "" : filtro;
    let trovati = db_cerca(q, items, tipo);
    /* Year ↔ processor correlation: the models closest to the PC's
       year rise to the top, the others stay at the bottom of the list
       (no entry disappears, only the order changes). */
    const anno = tipo === "cpu" && opt.anno ? Math.round(Number(opt.anno())) : 0;
    if (anno)
      trovati = trovati.slice().sort((a, b) =>
        Math.abs((a.y || anno) - anno) - Math.abs((b.y || anno) - anno));
    const max = 40;
    list.innerHTML = trovati.slice(0, max).map(p =>
      '<li role="option" data-n="' + p.n.replace(/"/g, "&quot;") + '">' + p.n +
      "<small>" + (tipo === "gpu" ? p.sub : p.y + " · " + p.gruppo.split("(")[0].trim()) + "</small></li>"
    ).join("");
    let msg = "";
    if (!trovati.length) msg = "No entries match «" + String(q).replace(/[<>&]/g, "") + "»: try fewer words or another term.";
    else {
      const parti = [];
      if (anno && trovati.length > 1)
        parti.push("Sorted by year: at the top the processors closest to " + anno + " (the PC's year), then all the others.");
      if (trovati.length > max)
        parti.push("…and " + (trovati.length - max) + " more matches: add a word to narrow it down.");
      msg = parti.join(" ");
    }
    note.textContent = msg;
    note.hidden = !msg;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    attivo = -1;
  }
  function chiudi(){
    list.hidden = true; note.hidden = true;
    input.setAttribute("aria-expanded", "false"); attivo = -1;
    if (COMBO_APERTA === chiudi) COMBO_APERTA = null;
  }
  function scegli(nome){
    select.value = nome;
    input.value = nome;          /* the field shows the chosen value */
    chiudi();
    select.dispatchEvent(new Event("change"));
  }
  /* put the currently selected value back into the field */
  function mostra(){ input.value = select.value || ""; }

  input.addEventListener("input", () => apri(input.value));
  input.addEventListener("focus", () => { input.select(); apri(""); });
  input.addEventListener("blur", () => setTimeout(() => { chiudi(); mostra(); }, 160));
  input.addEventListener("keydown", (e) => {
    const voci = [...list.querySelectorAll("li[data-n]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      if (!voci.length) return;
      attivo += (e.key === "ArrowDown" ? 1 : -1);
      if (attivo < 0) attivo = voci.length - 1;
      if (attivo >= voci.length) attivo = 0;
      voci.forEach((li, i) => li.classList.toggle("on", i === attivo));
      voci[attivo].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter"){
      if (voci[attivo]){ e.preventDefault(); scegli(voci[attivo].dataset.n); }
      else if (voci.length === 1 && !list.hidden){ e.preventDefault(); scegli(voci[0].dataset.n); }
    } else if (e.key === "Escape"){ chiudi(); mostra(); }
  });
  list.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-n]");
    if (li){ e.preventDefault(); scegli(li.dataset.n); }
  });

  mappa();
  riempiSelect();
  chiudi();
  /* aggiorna() redraws the list only if it is open: needed when the
     PC's year changes, because the order depends on it. */
  return {
    select: select, apri: apri, mostra: mostra,
    aggiorna: function(){ if (input.getAttribute("aria-expanded") === "true") apri(input.value); }
  };
}

/* ============================================================
   2. YEAR ↔ PROCESSOR CORRELATION
   The logic lives in db_annoSync (db.js), so the homepage, the
   comparison and the Linux page behave the same way.
   ============================================================ */
let ANNO_PC = null, ANNO_A = null, ANNO_B = null;
/* references to the "search and choose" menus: they mirror the choice
   into the search box (the native <select> stays hidden). */
let COMBO_CPU = null, COMBO_GPU = null;

/* show the VRAM field only when "Another card" is chosen. */
function aggiornaVram(){
  const box = $("boxVram");
  if (box) box.hidden = $("gpu").value !== "Another card (I'll enter the VRAM)";
}

/* ============================================================
   2. VERDICTS
   ============================================================ */
function setV(id, val, note, cls){
  $("v" + id).className = "vbox " + cls;
  $("v" + id + "Val").textContent = val;
  $("v" + id + "Note").innerHTML = note;
}
function verdictLinux(score, L, anno, ram, cpu, bit32, bitUnknown, utile){
  if (/^Apple/.test(cpu.n))
    return setV("Linux", "➖ Check support", "macOS is the native path for Apple Silicon. Linux requires a distribution compatible with this hardware and a separate check; this estimate does not verify installability or drivers. The memory is unified: the system and the model share the same space.", "warn");
  if (bitUnknown)
    return setV("Linux", "❓ Check the architecture", "For this generic CPU profile I can't tell whether the processor supports x86-64. Check the exact model or the «Mode/instructions» entry with CPU-Z or <code>lscpu</code> before choosing a 32- or 64-bit Linux image.", "warn");
  if (bit32)
    return setV("Linux", "🟡 Possible, with checks", "For a 32-bit x86 CPU the options are few. antiX 26.1 offers a 32-bit image; Debian 12 i386 requires at least an i686 CPU. Check the required instructions, drivers and release support, then try from a USB Live before installing.", "warn");
  if (anno <= 2013)
    return setV("Linux", "✅ Yes, it can be a good choice", "Windows 10 ended mainstream support on <b>October 14, 2025</b>. In the European Economic Area some eligible users can get free ESU updates while staying signed in to the same Microsoft account; for local-account use a one-time purchase is available. The program ends on <b>October 12, 2027</b>. Windows 11 compatibility depends on the exact CPU model and the other requirements. Linux can be an alternative: first test network, audio, graphics and peripherals from a live USB.", "yes");
  if (score < 50)
    return setV("Linux", "✅ It can help", "A lightweight Linux desktop can leave more free memory than Windows, but the real usage varies with distribution, drivers, programs and updates. If you care about local AI, compare the memory available on your PC after boot.", "yes");
  if (score < 68)
    return setV("Linux", "✅ It can be useful", "Linux is an option if you want a lighter system or prefer its environment. RAM usage and boot times depend on hardware, configuration and open programs.", "yes");
  return setV("Linux", "🟡 Optional", "The score does not verify Windows 11 compatibility: check the CPU and the official requirements. Linux remains an option if you prefer its environment; try Live mode first.", "warn");
}
function verdictLM(score, ram, cpu, utile, maxP, gpu, so){
  const gp = gpu && gpu.v > 0;
  if (!cpu.arm && cpu.avx < 2 && so === "linux")
    return setV("LM", "⚠️ Check the Linux build", cpu.n + " does not appear to have AVX2. The LM Studio Linux x64 package includes AVX2 by default: check the build and the runtime requirements before installing. This estimate cannot confirm that it starts on this CPU.", "warn");
  if (!cpu.arm && cpu.avx < 2)
    return setV("LM", "❌ CPU requirement not met", cpu.n + " does not appear to have AVX2, which is listed in the official requirements for LM Studio on Windows x64. An alternative build can have different requirements, but the calculator does not guarantee its compatibility or performance.", "no");
  if (ram < 4)
    return setV("LM", "⚠️ Very limited memory", "With " + ram + " GB the memory may not be enough for system, runtime, model and context. The result depends on free memory, model and operating system; try a very small size and check the usage while loading.", "warn");
  if (utile < 3)
    return setV("LM", "⚠️ Very limited memory", "The simplified budget estimates " + db_num(utile) + " GB available after the system reserve. You can try a very small model, such as <b>Qwen3 0.6B</b>, but check the real memory and the runtime requirements.", "warn");
  if (gpu && gpu.unificata)
    return setV("LM", "✅ Apple Silicon support", gpu.n + ": LM Studio can use Metal with the supported models. macOS, apps and the model share the <b>unified memory</b>; the simplified budget estimates <b>" + db_num(utile) + " GB</b> available, but the loadable size depends on the file, the context and the open applications.", "yes");
  if (gp && gpu.v >= 12 && utile >= 8)
    return setV("LM", "✅ Good GPU capacity", gpu.n.split("(")[0].trim() + " has " + gpu.v + " GB of VRAM. Depending on the model size, the quantization and the context, it could fit entirely in video memory; speed and compatibility also depend on the GPU, drivers and backend.", "yes");
  if (utile < 8)
    return setV("LM", "✅ You can try small and medium models", "With an estimated " + db_num(utile) + " GB you can consider quantized models around <b>3-4 billion</b> parameters" +
      (maxP >= 7 ? "; larger models can use a lot of extra memory or fall back to swap, with heavy slowdowns" : "") + ". Check file size, context and free memory before downloading.", "yes");
  if (utile < 16)
    return setV("LM", "✅ Yes, with suitable models", "With this memory you can consider small or medium Q4 models; the memory required changes with model, context and open applications. LM Studio offers an interface, a history and an API server.", "yes");
  return setV("LM", "✅ More headroom for large models", maxP
    ? "The simplified budget estimates <b>" + db_num(utile) + " GB</b> available. Among the catalog models, the largest size allowed by the internal criteria is <b>" + db_param(maxP) + "</b> in Q4_K_M; check the file, the context and the free memory."
    : "The estimated memory leaves more headroom, but check the model and runtime requirements before downloading them.", "yes");
}
function verdictWin(ram, cpu){
  /* Preliminary result for Windows 11 25H2: here we collect only the
     processor and the memory.
     Microsoft also requires TPM 2.0, Secure Boot, UEFI firmware, at
     least 64 GB of disk and a compatible graphics card: none of these
     data is measured, so we never present the result as a completed
     check. We verify the CPU with the official 25H2 list (cpu.w11),
     not with the year: the i5-8400 is from 2017 and is supported,
     the Ryzen 1000 from 2017 is not. */
  if (/^Apple/.test(cpu.n))
    return setV("Win", "➖ VM only", "On Apple Silicon Windows 11 is not native: it runs only in a virtual machine (Parallels/UTM). For local AI, staying on macOS is the better choice.", "warn");
  if (cpu.manual || cpu.w11 === null)
    return setV("Win", "❓ Check the exact model", "CPU compatibility must be checked in Microsoft's Windows 11 25H2 list for the exact model; the generation and the year alone are not enough. The official minimum RAM is <b>4 GB</b>. A compatible CPU, TPM 2.0, UEFI firmware with Secure Boot, 64 GB of disk space and compatible graphics are also required.", "warn");
  if (cpu.w11 !== 1)
    return setV("Win", "❌ Not supported", "This CPU model does not appear in the Microsoft list consulted. Compatibility is per model, not per year or generation; check the updated list and the PC Health Check app. On unsupported installations Microsoft does not guarantee updates or support.", "no");
  if (ram < 4)
    return setV("Win", "❌ Below the minimum", "The processor is in the official Windows 11 25H2 list, but with <b>" + ram + " GB</b> you are below the <b>official 4 GB minimum</b>: Windows 11 won't install. And it wouldn't have been enough for local AI anyway.", "no");
  if (ram < 8)
    return setV("Win", "⚠️ Minimum met", "CPU in the official Windows 11 25H2 list and <b>" + ram + " GB</b> ≥ 4 GB, so the installation minimum is reached: <b>8 GB</b>, however, is the recommended threshold. Still to be checked: <b>TPM 2.0</b>, <b>Secure Boot</b>, <b>UEFI</b> firmware, <b>64 GB</b> of disk and the graphics card.", "warn");
  return setV("Win", "✅ Supported (preliminary)", "Processor present in the official Windows 11 25H2 list and <b>" + ram + " GB</b> of RAM. Warning: this is a <b>preliminary</b> result, because here I check <b>only</b> the CPU and the memory. Still to be verified: <b>TPM 2.0</b>, <b>Secure Boot</b>, <b>UEFI</b> firmware, <b>64 GB</b> of disk and the graphics card (Settings → Windows Update → Security).", "yes");
}

/* ============================================================
   3. ANALYSIS (used by both the calculator and the comparison)
   ============================================================ */
/* A single memory budget for the whole site: how much the operating
   system keeps for itself. The same value used for the usable RAM and
   (on Apple machines, where a separate VRAM doesn't exist) for what
   the model can use in unified memory. */
function overheadOs(so){
  return so === "linux" ? 1.2 : so === "mac" ? 3 : 2.4;
}
function nomeOs(so){
  return so === "linux" ? "Lightweight Linux" : so === "mac" ? "macOS" : "Windows";
}
/* With an Apple processor the correct choice is macOS: if the menu still
   says Windows or Linux we align it, so the verdicts and the memory
   budget talk about the right machine. */
function soApple(cpu, sel){
  const apple = /^Apple/.test(cpu.n);
  if (apple && sel && sel.querySelector('option[value="mac"]')) sel.value = "mac";
  else if (!apple && sel && sel.value === "mac") sel.value = "win";
  return sel ? sel.value : "win";
}
/* A model is feasible if: the memory fits it, the CPU is fast enough,
   and (with a GPU with enough VRAM) it isn't penalized because the RAM
   space is missing: in that case the card covers the gap. */
function analizzaPC(anno, ram, cpu, gpu, so){
  const score = db_punteggioPc(ram, cpu);
  const L = db_livello(score);
  const bit32 = cpu.b32 === 1;
  const bitUnknown = cpu.b32 === null;
  /* Simplified budget for the operating system; the actual usage
     changes with version, drivers and open programs. */
  const os = so === "linux" ? "linux" : so === "mac" ? "mac" : "win";
  const overhead = overheadOs(os);
  const utile = Math.max(0.4, ram - overhead);
  const ctx = { sc: score, avx: cpu.avx, mem: cpu.mem, arm: !!cpu.arm, gpu: gpu };
  const vram = gpu && gpu.v ? gpu.v : 0;

  const valutati = DB_MODELLI.map(m => {
    const onGpu = db_gpuAttivo(ctx, m.dim);
    const vel = db_stimaTok(m.p, ctx, m.dim);
    const memoriaOk = m.ram <= utile;
    const veloce = cpu.sc >= m.mc;
    // with enough memory a model bigger than the "right" one
    // stays valid: the limit becomes how fast it is, not whether it fits
    const scarto = utile > 0 ? m.ram / utile : 99;
    let stato;
    if (!memoriaOk && !onGpu) stato = scarto <= 1.15 ? "limite" : "no";
    else if (!veloce) stato = scarto <= 1.05 && memoriaOk ? "limite" : "no";
    else stato = !memoriaOk ? "limite" : "ok";
    return Object.assign({}, m, { vel: vel, onGpu: onGpu, stato: stato });
  });
  const usabili = valutati.filter(m => m.stato === "ok" || m.stato === "limite");
  const perfetti = valutati.filter(m => m.stato === "ok");
  const maxP = usabili.length ? Math.max.apply(null, usabili.map(m => m.p)) : 0;
  /* The largest one that really fits: it tells how fast the model you
     can load will run, when the 7B reference doesn't fit. */
  const migliore = usabili.length ? usabili.slice().sort((x, y) => y.p - x.p)[0] : null;
  /* The "7B Q4" stat is a reference model of 4.9 GB
     (Llama 3.1 8B): if its status is "no", the shown speed is theoretical. */
  const rif7 = valutati.slice().sort((x, y) => Math.abs(x.dim - 4.9) - Math.abs(y.dim - 4.9))[0] || null;

  return {
    anno: anno, ram: ram, cpu: cpu, gpu: gpu, score: score, L: L,
    os: os, osNome: nomeOs(os), linux: os === "linux",
    bit32: bit32, bitUnknown: bitUnknown, utile: utile, overhead: overhead, vram: vram,
    lmNoAvx2: !cpu.arm && cpu.avx < 2,
    valutati: valutati, usabili: usabili, perfetti: perfetti, maxP: maxP,
    migliore: migliore, rif7: rif7,
    vel7: db_stimaTok(8, ctx, 4.9),
    vel7Entra: rif7 ? rif7.stato !== "no" : false
  };
}

/* ============================================================
    3b. THREE-POINT SUMMARY
   The three questions someone with an old PC really asks:
   what runs on it, what limits it, what's worth doing first.
   ============================================================ */
function punti(s){
  const box = $("punti");
  if (!box) return;
  const c = s.cpu, ram = s.ram, g = s.gpu;
  let puo, collo, prima;

  if (s.lmNoAvx2){
    puo = "⚠️ The CPU has no AVX2. For Windows x64 LM Studio lists it among the requirements; the Linux x64 package includes AVX2 by default. For Ollama and other runtimes compatibility depends on version, build and backend: verify before installing.";
  } else if (!s.usabili.length){
    puo = "❌ No model in the list fits with <b>" + db_num(s.utile) + " GB</b> free.";
  } else {
    puo = "✅ The estimate allows models up to <b>" + db_param(s.maxP) + "</b> (" + s.migliore.n + ", " + db_tokRange(s.migliore.vel) + "): " +
      s.perfetti.length + " meet the indicative criteria, " + s.usabili.length + " are at the limit or fit.";
  }

  if (s.lmNoAvx2) collo = "The CPU's compatibility with the SIMD requirements of the chosen LM Studio build.";
  else if (s.utile < 6) collo = "The <b>RAM</b>: only " + db_num(s.utile) + " GB free for the model.";
  else if (!s.perfetti.length) collo = "The <b>RAM</b>: the most useful models fit only partially.";
  else if (g.v === 0) collo = "The <b>speed</b>: without a GPU all the inference runs on the CPU.";
  else if (s.cpu.sc < 50) collo = "The <b>processor</b>: it sets the speed.";
  else collo = "Nothing serious: the setup is balanced for local AI.";

  if (s.lmNoAvx2) prima = "Check whether a runtime compatible with the CPU's instructions exists; alternatively use the PC as a client of a remote or cloud model.";
  else if (!s.usabili.length) prima = "Check how much RAM the motherboard supports and whether it's upgradeable. Alternatively use this PC as a <b>client</b> of a model running on another machine or via cloud.";
  else if (ram < 4 || s.utile < 6) prima = "Check whether the RAM is upgradeable and how much it costs compared to the PC's value: more memory can widen the available models, but first verify compatibility and the maximum capacity.";
  else if (s.ssd === "hdd") prima = "Consider an <b>SSD</b>: it can reduce boot and loading times, but the gain depends on the disk, the interface and the system.";
  else if (g.v === 0) prima = "Consider a GPU only after checking VRAM, runtime compatibility, power supply, case space and cost: acceleration is not guaranteed by every configuration.";
  else if (!s.perfetti.length) prima = "Check which limit weighs most: if it's the memory, a compatible upgrade can help; if it's the CPU or the runtime, try a smaller model.";
  else prima = "Try a model from the list with your requests and check quality, memory and speed on the PC.";

  $("punti").innerHTML =
    '<div class="pbox"><div class="plab">What runs on it</div><div class="pval">' + puo + '</div></div>' +
    '<div class="pbox"><div class="plab">The bottleneck</div><div class="pval">' + collo + '</div></div>' +
    '<div class="pbox"><div class="plab">The first thing to do</div><div class="pval">' + prima + '</div></div>';
}
function analizza(scorrimento){
  const anno = Math.min(DB_ANNO_MAX, Math.max(1990, Number($("anno").value) || 2011));
  $("anno").value = anno;
  const ram = Number($("ram").value);
  const cpu = leggiCpu($("cpu"));
  if (!cpu){ flash("Select a processor from the list."); return; }
  /* On Apple Silicon the OS of the calculation is macOS, even if the
     menu had stayed on Windows: soApple() aligns the selection. */
  const so = soApple(cpu, $("so"));
  const gpu = gpuPerCpu(cpu, leggiGpu($("gpu")), ram, so);
  const ssd = $("ssd").value;
  /* If the card was entered manually we only know the VRAM: from here
     on the speed ranges widen to ±40% instead of the usual ±25%. */
  db_largoSet(!!(gpu && gpu.manual));

  const s = analizzaPC(anno, ram, cpu, gpu, so);
  s.ssd = ssd;
  STATO = s;

  $("scoreVal").textContent = s.score;
  $("scoreFill").style.width = s.score + "%";
  $("dots").innerHTML = [1, 2, 3, 4, 5].map(i =>
    "<i class='" + (i <= (DB_LIVELLI.indexOf(s.L) + 1) ? "on" : "") + "'></i>").join("");

  /* Two consistency checks: year ↔ processor and RAM ↔ motherboard
     maximum. The messages no longer replace the processor line:
     they stay below, in red, as long as the inconsistency exists. */
  const avvisi = [];
  if (ram > cpu.mx && !cpu.manual)
    avvisi.push("<b>" + ram + " GB</b> exceeds the typical value of about <b>" + cpu.mx + " GB</b> associated with this platform: check the real limit in the motherboard manual.");
  const scheda = cpu.manual
    ? "Manually entered data · max RAM to be checked on the motherboard"
    : cpu.c + " core / " + cpu.t + " threads · " + db_simdName(cpu) + " · " + db_memLabel(cpu) + " · indicative max RAM of the platform ~" + cpu.mx + " GB";
  const hint = $("hintCpu");
  hint.classList.toggle("errore", avvisi.length > 0);
  hint.innerHTML = scheda + avvisi.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");
  /* CPU and GPU years aren't enough to establish compatibility: you need
     the motherboard, firmware, power supply, case space and drivers. */
  const avvisiGpu = [];
  const schedaGpu = gpu.unificata
    ? "<b>" + gpu.v + " GB</b> available to the GPU on unified memory: the card can use almost all the RAM, so a model fits in video memory if it fits"
    : gpu.manual
    ? "<b>" + gpu.v + " GB of VRAM</b> · the available memory limits the model size, but weights, context and buffers vary. Without the exact model, bandwidth and drivers, the speed is a rough estimate"
    : gpu.v
    ? "<b>" + gpu.v + " GB of VRAM</b> · the available memory limits the model size; weights, context and buffers vary. Check the runtime support, the drivers and the backend"
    : "CPU only: the speed depends on clock, SIMD instructions and memory type";
  const hintGpu = $("hintGpu");
  hintGpu.classList.toggle("errore", false);
  hintGpu.innerHTML = schedaGpu + (!gpu.unificata && gpu.v ? " · Before buying, check PCIe compatibility, space, power supply, firmware and drivers." : "") + avvisiGpu.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");

  /* NVMe interface and boot depend on the motherboard and firmware,
     they can't be reliably deduced from the CPU year. */
  const avvisiSsd = [];
  const SSD_BASE = {
    hdd: "An HDD is generally slower than an SSD at loading the model files; the time varies with the disk and the size.",
    ssd: "An SSD generally reduces loading times compared to an HDD.",
    nvme: "An NVMe can be faster at transfers, but the effect on loading depends on the disk and the system. Check the NVMe slot and boot support on the motherboard."
  };
  const hintSsd = $("hintSsd");
  hintSsd.classList.toggle("errore", false);
  hintSsd.innerHTML = SSD_BASE[ssd] + avvisiSsd.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");

  $("riepilogo").innerHTML = "<b>" + anno + "</b> · " + ram + " GB RAM · <b>" + cpu.n + "</b> · " + gpu.n +
    " · " + (ssd === "hdd" ? "hard disk" : ssd.toUpperCase()) + " · " + s.osNome +
    " → hardware estimate <b>" + s.score + "/100</b>, level <b>" + s.L.n.toLowerCase() + "</b>.";

  verdictLinux(s.score, s.L, anno, ram, cpu, s.bit32, s.bitUnknown, s.utile);
  verdictLM(s.score, ram, cpu, s.utile, s.maxP, gpu, s.os);
  verdictWin(ram, cpu);
  punti(s);

  $("st1").textContent = s.L.n;
  $("st2").textContent = db_num(s.utile) + " GB";
  $("st3").textContent = s.maxP ? db_param(s.maxP) : "—";
  $("st4").textContent = s.perfetti.length + " within criteria · " + s.usabili.length + " total";
  $("st5").textContent = db_tokRange(s.vel7);
  /* Where the free RAM comes from: previously the site chose the OS
     overhead silently, now the user chooses it and the subtraction is visible. */
  if (ram - s.overhead < 0.4)
    $("notaRam").innerHTML = "With <b>" + ram + " GB installed</b> " + s.osNome +
      " could leave little room for a model. The available memory varies with drivers, updates and applications: check it on your PC.";
  else
    $("notaRam").innerHTML = "Free RAM <b>" + db_num(s.utile) + " GB</b> = " + ram + " GB installed − <b>" +
      db_num(s.overhead) + " GB</b> estimated for " + s.osNome + ". This is an indicative estimate: available memory and model cache vary with drivers, programs and context. " +
      (s.os === "mac"
        ? "On Apple Silicon it's <b>unified memory</b>: the same resource feeds the system, the apps and the model, so there is no separate reserve to give to the GPU."
        : s.os === "linux"
        ? "With a lightweight Linux desktop the free memory can differ: it depends on the distribution and the open programs."
        : "With Windows the free memory can differ: it depends on version, updates and open programs.");
  const nv = $("notaVel7");
  nv.hidden = s.vel7Entra;
  if (s.vel7Entra) nv.innerHTML = "";
  /* The note no longer lists the models: they live in the "What runs on it"
     box and in section 2. Here it only explains what the stat means. */
  else nv.innerHTML = "⚠️ <b>7B Q4 speed</b>: it's the time of a reference model of 4.9 GB" +
    (s.rif7 ? " (" + s.rif7.n + ")" : "") + ", which with " + db_num(s.utile) + " GB free <b>doesn't fit</b>. " +
    (s.usabili.length
      ? "It remains a yardstick across different PCs: the models that really fit are in <b>section 2</b>."
      : "Not even a model from the list fits here: read the <b>What runs on it</b> box above.");

  distro(s);
  modelliDesc(s);
  steps(s);
  trucchi(s);

  $("risultato").hidden = false;
  disegnaTabella();
  if (scorrimento) $("risultato").scrollIntoView({ behavior: "smooth", block: "start" });
  flash("Analysis complete");
}

function leggiCpu(select){
  const v = select.value;
  if (v === "ALTRO"){
    const sel = $("altroNuclei");
    const c = Number(sel.selectedOptions[0].dataset.core);
    const t = Number(sel.selectedOptions[0].dataset.thread);
    const avx = Number($("altroAvx").value);
    const mem = Number($("altroMem").value);
    let sc = 3 + c * 7 + t * 1.2 + avx * 9 + (mem === 1 ? 2 : mem * 2);
    return { n: "Custom", y: 0, sc: Math.max(3, Math.min(96, sc)), c: c, t: t, g: 2.5, avx: avx, mem: mem, mx: 999, manual: true };
  }
  for (const k in DB_CPU) for (const p of DB_CPU[k]) if (p.n === v) return p;
  return null;
}
function leggiGpu(select){
  const v = select.value;
  if (v === "Another card (I'll enter the VRAM)"){
    const vr = Math.min(48, Math.max(1, Math.round(Number($("gpuVram").value) || 8)));
    /* Without knowing the exact model, the speed is very approximate.
       We show a cautious range (±40%) instead of a single number. */
    const x = Math.min(95, 8 + vr * 1.6);
    return { n: "Card with " + vr + " GB (estimate)", y: 0, v: vr, x: x, z: 0.85, vend: "Other", manual: true };
  }
  for (const k in DB_GPU) for (const p of DB_GPU[k]) if (p.n === v) return p;
  return DB_GPU.ig[0];
}
/* On Apple Silicon the memory is unified: the GPU can use all the RAM,
   so the model must be treated as if it were in VRAM. */
function gpuPerCpu(cpu, gpu, ram, so){
  if (!/^Apple/.test(cpu.n)) return gpu;
  /* Unified memory: the model and the system share the same pool, so
     the available part is the same as the usable RAM.
     We don't subtract 6 GB "for the GPU": it's the only resource there is. */
  const liberi = Math.max(0.4, ram - overheadOs(so));
  return {
    n: "Apple Silicon — unified memory",
    y: cpu.y, v: liberi, x: DB_APPLE_BASE[cpu.n] || 30,
    z: 1, vend: "Apple", unificata: 1
  };
}
/* tokens/s on a 7B Q4 with Metal (MLX) acceleration */
const DB_APPLE_BASE = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };

/* ============================================================
   4. RECOMMENDED MODELS + TABLE
   ============================================================ */
let tabAttiva = "consigliati";
function disegnaTabella(){
  if (!STATO) return;
  const fam = $("filtroFam").value, q = $("filtroQ").value;
  const qb = q.startsWith("Q5") ? "Q5_K_M" : q.startsWith("Q8") ? "Q8_0" : q.startsWith("Q3") ? "Q3_K_M" : "Q4_K_M";
  const mult = q.startsWith("Q5") ? 1.25 : q.startsWith("Q8") ? 1.7 : q.startsWith("Q3") ? 0.75 : 1;
  const gpuMem = STATO.gpu && STATO.gpu.v > 0 ? STATO.gpu.v : 0;
  let lista = STATO.valutati.map(m => {
    const ramStimata = m.ram * mult;
    const dimStimata = m.dim * mult;
    const entra = ramStimata <= STATO.utile;
    const onGpu = gpuMem > 0 && dimStimata <= gpuMem;
    const veloce = STATO.cpu.sc >= m.mc;
    const scarto = STATO.utile > 0 ? ramStimata / STATO.utile : 99;
    let stato;
    if (!entra && !onGpu) stato = scarto <= 1.15 ? "limite" : "no";
    else if (!veloce) stato = scarto <= 1.05 && entra ? "limite" : "no";
    else stato = !entra ? "limite" : "ok";
    return Object.assign({}, m, { stato: stato, onGpu: onGpu, ramStimata: ramStimata, dimStimata: dimStimata });
  });
  if (tabAttiva === "consigliati") lista = lista.filter(m => m.stato !== "no");
  else if (tabAttiva === "visione") lista = lista.filter(m => db_hasCompito(m, "Vision"));
  else if (tabAttiva === "codice") lista = lista.filter(m => m.t === "Code");
  else if (tabAttiva === "pensiero") lista = lista.filter(m => m.t === "Reasoning");
  if (fam) lista = lista.filter(m => m.f === fam);
  lista = lista.sort((a, b) => a.p - b.p);
  if (!lista.length){
    $("tbody").innerHTML = '<tr><td colspan="7" class="empty">No model in this category for your PC. Try the <b>All models</b> tab.</td></tr>';
    return;
  }
  let h = "";
  lista.forEach(m => {
    let pill, cls = "";
    if (m.stato === "ok") pill = '<span class="pill y">✅ Within the estimate</span>';
    else if (m.stato === "limite"){ pill = '<span class="pill w">⚠️ At the limit</span>'; cls = "nota"; }
    else { pill = '<span class="pill n">❌ Criteria not met</span>'; cls = "nota"; }
    h += "<tr class='" + cls + "'>" +
      "<td class='name' data-label='Model'>" + m.n + "<small>" + m.d + "</small></td>" +
      "<td class='num' data-label='Parameters'>" + db_param(m.p) + "</td>" +
      "<td class='num' data-label='Quantization'>" + qb + "</td>" +
      "<td class='num' data-label='File'>" + db_num(m.dimStimata) + " GB</td>" +
      "<td class='num' data-label='Required RAM'>" + db_num(m.ramStimata) + " GB</td>" +
      "<td class='num' data-label='Estimated speed (base Q4)'>" + db_tokRange(m.vel) + (m.onGpu ? " <span class='tag'>GPU</span>" : "") + "</td>" +
      "<td data-label='Verdict'>" + pill + "</td></tr>";
  });
  $("tbody").innerHTML = h;
}
function modelliDesc(s){
  const avvisoAvx = s.lmNoAvx2
    ? " <b>Warning:</b> the CPU has no AVX2. The requirements for Windows x64 and the Linux x64 package must be checked for the chosen build; these estimates do not guarantee that LM Studio starts."
    : "";
  $("modelliDesc").innerHTML = "For this profile the simplified budget estimates <b>" + db_num(s.utile) + " GB of usable RAM</b> (" +
    s.ram + " GB installed − <b>" + db_num(s.overhead) + " GB</b> of " + s.osNome + ")" +
    (s.gpu && s.gpu.v
      ? (s.gpu.unificata
         ? " and <b>" + s.gpu.v + " GB</b> of unified memory available to the model (same resource, not an extra)"
         : " and <b>" + s.gpu.v + " GB of VRAM</b>")
      : "") +
    ". ✅ means the internal memory and CPU budgets are met; ⚠️ marks a borderline case; ❌ that one of the internal criteria is not met. These are estimates: check the real memory and the runtime requirements." + avvisoAvx;
}

/* ============================================================
   5. LINUX + STEPS + TRICKS
   ============================================================ */
/* the 32-bit filter: on a 64-bit PC those distros aren't needed */
function distro(s){
  if (/^Apple/.test(s.cpu.n)){
    $("linuxDesc").innerHTML = "macOS is the native path used by LM Studio on Apple Silicon. Linux requires a distribution compatible with the exact Mac model and separate checks on installation and drivers.";
    $("distro").innerHTML = '<div class="nota">On Apple Silicon the memory is unified: "GPU acceleration" and "system memory" are the exact same resource. Enabling the GPU for inference does not add memory, it splits it.</div>';
    return;
  }
  if (s.bitUnknown){
    $("linuxDesc").textContent = "Before choosing a distribution, check the exact CPU model and whether it supports x86-64.";
    $("distro").innerHTML = '<div class="nota">The catalog does not show 32- or 64-bit images until the CPU architecture is verified. Use CPU-Z on Windows or <code>lscpu</code> on Linux and check the requirements of the chosen distribution.</div>';
    return;
  }
  const lista = DB_DISTRO.filter(d => s.score >= d.s && s.score <= d.e && (!!d.b32) === s.bit32)
    .sort((a, b) => (b.top || 0) - (a.top || 0) || a.s - b.s);
  if (!lista.length){
    $("distro").innerHTML = '<div class="nota">The catalog finds no distribution with these indicative criteria. Check the architecture, requirements and support of the chosen release; if possible, try a Live session first.</div>';
    $("linuxDesc").textContent = "The entered data is not enough to recommend one of the listed distributions. RAM, processor, drivers and version requirements can matter.";
    return;
  }
  $("distro").innerHTML = lista.map(d =>
    '<div class="d-row' + (d.top ? " top" : "") + '">' +
      '<div class="dn">' + d.n + "</div>" +
      '<div class="db">release requirements: to be verified</div>' +
      '<div class="dd">' + d.d + "</div>" +
    "</div>").join("");
  $("linuxDesc").innerHTML = s.bit32
    ? "Your processor is from <b>" + s.cpu.y + "</b>: we are in 32-bit territory, so specially lightweight distributions are needed."
    : "The order reflects the chosen use and the indicative RAM and processor criteria; the real requirements depend on the release. Try a distribution in Live mode before installing it.";
}
function steps(s){
  const out = [];
  const ram = s.ram, cpu = s.cpu, maxP = s.maxP, bit32 = s.bit32;
  out.push({ t: "Do a real backup", d: "Copy documents, photos and bookmarks to an external drive. The step that will save your afternoon." });
  if (/^Apple/.test(cpu.n)){
    out.push({ t: "Check the unified memory", d: "On Apple Silicon the system, apps and model share the memory. The free amount varies with the configuration and the open programs: check it before choosing the model and the context." });
    out.push({ t: "Download LM Studio for macOS", d: "Native version for Apple Silicon from <a href='https://lmstudio.ai/' target='_blank' rel='noopener'>lmstudio.ai</a>: it installs like any app and uses Metal for acceleration." });
    out.push({ t: "Choose the model based on memory", d: s.migliore
      ? "The estimate finds models up to <b>" + db_param(s.maxP) + "</b>, but memory and speed depend on quantization and context. Choose a model compatible with the runtime and check the RAM that is actually free."
      : "With the estimated memory no catalog model fits: consider more RAM or a remote model." });
    out.push({ t: "Check Metal acceleration", d: "LM Studio can use Metal on the supported models. The gain depends on the model, the free memory and the app version: check the offload in the model panel." });
  } else if (s.bitUnknown){
    out.push({ t: "Check the exact CPU model", d: "The selected profile does not identify the processor variant. Check the full name with CPU-Z or <code>lscpu</code> and verify whether it supports x86-64 before downloading a Linux image." });
  } else if (bit32){
    if (s.linux){
      out.push({ t: "Check that the 32-bit distro is still supported", d: "32-bit options are limited. You can consider <b>antiX 26.1</b> or <b>Debian 12 i386</b>, verifying support, updates and compatibility before installing." });
      out.push({ t: "Keep the system updated", d: "After the installation use the distribution's update manager. Check the required space, support and requirements in the documentation of the chosen release." });
    } else {
      out.push({ t: "Check a supported 32-bit distribution", d: "Check the current requirements and support of antiX 26.1 or Debian 12 i386; choose an ISO suited to the exact CPU and try Live mode first." });
      out.push({ t: "Try Live mode", d: "Boot from the USB and check network, audio, video and the peripherals you use. A short test does not guarantee that everything will work after the installation." });
      out.push({ t: "Install and update", d: "Install only after verifying free space, support and compatibility of the release. After the first boot apply the updates through the distribution's manager." });
    }
    out.push({ t: "Check the runtime requirements", d: "For Windows x64 LM Studio lists AVX2 in the requirements; the Linux x64 package includes AVX2 by default. Check the build and the required instructions before downloading models; alternatively use a remote service." });
  } else {
    if (s.linux){
      out.push({ t: "Update the system first", d: "Open the distribution's update manager and apply the available updates. Driver support and improvements depend on the hardware and the release." });
      out.push({ t: "Consider an SSD", d: "If the disk is mechanical, an SSD can improve boot and program loading. The gain varies with the PC, the interface and the system state." });
    } else {
      out.push({ t: "Try Linux without installing anything", d: "Download a supported distribution and create a bootable USB. Boot it in the firmware mode used by the PC, if you want to keep Windows, and test network, graphics, audio and peripherals in Live mode." });
      out.push({ t: "Decide: replace or dual boot", d: "If you want to keep Windows, shrink the partition from the Windows tools and leave the space required by the chosen distribution. Make a backup first and verify compatibility and firmware mode." });
      out.push({ t: "Consider an SSD", d: "If the disk is mechanical, an SSD can improve boot and program loading. Check interface, format and compatibility with the motherboard." });
    }
    out.push({ t: "Download LM Studio", d: "Check the official requirements and choose the package compatible with your system and processor. " + (s.linux
      ? "On Linux download the <code>.AppImage</code> file and make it executable with <code>chmod +x</code>."
      : "On Windows the models folder is configurable: check it in the app settings before downloading them.") });
    out.push({ t: "Choose the model and download it", d: maxP
      ? "Search in the LM Studio library <b>" + s.perfetti.slice().sort((a, b) => b.p - a.p)[0].n + "</b>. Before the download check file size, quantization, requirements and available space."
      : "Download a tiny model (Qwen3 0.6B) to verify that inference works before downloading everything else." });
    out.push({ t: "Configure before writing", d: s.gpu && s.gpu.v
      ? "Check the GPU and backend support; assign an offload compatible with the VRAM and leave headroom for context and buffers. Start with a small context."
      : "On CPU-only leave the GPU offload disabled and try the default threads. Reduce the context if the system runs out of memory." });
    out.push({ t: "Try a real request", d: "Use a task you care about and check quality, speed and memory on the PC. The performance depends on model, quantization and configuration." });
  }
  $("steps").innerHTML = out.map(x => "<li><b>" + x.t + "</b><div class='sm'>" + x.d + "</div></li>").join("");
}
function trucchi(s){
  const t = [];
  const ram = s.ram, cpu = s.cpu, gpu = s.gpu, utile = s.utile;
  if (ram <= 4) t.push({ h: "Check if you can add more RAM", p: "With 4 GB the memory can be a limit for system, applications, model and context. If the motherboard allows it, more RAM can widen the usable models; first check the supported modules and the free memory." });
  if (s.ssd === "hdd") t.push({ h: "Consider an SSD", p: "An SSD can reduce boot and model-loading times compared to an HDD. The gain varies with disk, interface, system and file size; check format and compatibility before buying." });
  if (!cpu.arm && cpu.avx === 1) t.push({ h: "AVX without AVX2", p: "For Windows x64 LM Studio lists AVX2 among the requirements; the Linux x64 package includes it by default. Other runtimes or builds can have different requirements: check the exact compatibility." });
  if (!cpu.arm && cpu.avx === 0) t.push({ h: "CPU without AVX", p: "Modern x64 runtimes can require SIMD instructions. Check AVX2 and the instructions expected by the LM Studio build or the runtime you want to install; an alternative build can have different compatibility and performance." });
  if (cpu.mem <= 1) t.push({ h: "Check the RAM type and channel", p: "Memory bandwidth can affect performance, but the dual-channel gain varies with CPU, motherboard and runtime. Check the motherboard manual before adding modules." });
  if (!gpu || !gpu.v) t.push({ h: "Without a dedicated GPU", p: "Inference can use the CPU and the system RAM. If the memory is at the limit, try a smaller model and reduce the context; swap can avoid some blocks, but it's not the same as RAM and can slow things down a lot." });
  else if (gpu && !gpu.unificata && gpu.v < 8) t.push({ h: "Check the available VRAM", p: "VRAM limits how much of the model can be assigned to the GPU, but the file on disk doesn't match the memory used during inference. Context, cache, buffers, runtime and backend matter: check the requirements and leave headroom." });
  else if (gpu && !gpu.unificata && gpu.v >= 12) t.push({ h: "Consider GPU offload", p: "More VRAM can allow assigning more layers to the card, but the memory required depends on model, quantization and context. Check room for cache and buffers and verify that runtime, drivers and backend support the GPU." });
  if (gpu && gpu.vend === "AMD") t.push({ h: "AMD: drivers and backend matter", p: "Support depends on the GPU model, the operating system and the available backend. Check the runtime documentation and test a real setup before buying hardware." });
  if (gpu && gpu.vend === "Intel") t.push({ h: "Intel Arc: still a work in progress", p: "Arc cards perform well in Vulkan, but their integration with inference runtimes is young. Test and compare: if you get strange results, stay on the CPU." });
  if (s.linux)
    t.push({ h: "Check the free memory", p: "The footprint of XFCE or LXQt varies with release, services, drivers and open programs. Measure the available memory after boot and before choosing a model." });
  else if (s.os === "mac")
    t.push({ h: "The memory is shared", p: "On Apple Silicon system, apps and model use the same memory. Check in Activity Monitor → Memory how much is free before choosing the model size." });
  else
    t.push({ h: "Check the free memory", p: "The operating system, programs, model and context cache share the RAM. Measure how much memory stays available before choosing the model size; a Linux desktop can change the balance, but the savings depend on the configuration." });
  t.push({ h: "Manage the model files", p: "Downloaded models take up space even when not loaded. Check the file sizes and remove the ones you don't use." });
  t.push({ h: "Adjust the context", p: "The context uses extra memory for the cache and the usage grows with model and configuration. If the memory is at the limit, try a shorter context and check the actual usage." });
  if (s.score >= 60) t.push({ h: "If you have 16 GB you can consider larger models", p: "Some 14B Q4 models can fit, but the space varies with file, context, system and open applications. Alternatives: Ollama with its API, Open WebUI or <code>llama-server</code>, after verifying the runtime requirements." });
  $("trucchiList").innerHTML = t.map(x => '<div class="tk"><h3>' + x.h + "</h3><p>" + x.p + "</p></div>").join("");
}

/* ============================================================
   6. COMPARING TWO PCs
   ============================================================ */
function confronta(){
  db_largoSet(false);   // the comparison uses only catalog cards
  const esito = ["A", "B"].map(k => {
  const anno = Math.min(DB_ANNO_MAX, Math.max(1990, Number($("cmp" + k + "Anno").value) || 2010));
    const ram = Number($("cmp" + k + "Ram").value);
    const cpu = leggiCpu($("cmp" + k + "Cpu"));
    if (!cpu) return null;
    const so = soApple(cpu, $("cmp" + k + "So"));
    const gpu = gpuPerCpu(cpu, leggiGpu($("cmp" + k + "Gpu")), ram, so);
    const nome = ($("cmp" + k + "Nome").value || "").trim() || cpu.n;
    const s = analizzaPC(anno, ram, cpu, gpu, so);
    s.nome = nome;
    return s;
  });
  if (!esito[0] || !esito[1]){ flash("Select both processors."); return; }
  const [a, b] = esito;
  const nomeAHtml = escapeHtml(a.nome);
  const nomeBHtml = escapeHtml(b.nome);

  $("vsHeadA").textContent = a.nome;
  $("vsHeadB").textContent = b.nome;

  const righe = [];
  function riga(voce, va, vb, vaNum, vbNum, meglio, conta = true){
    let vincitore = "pari";
    if (!conta) vincitore = "n/a";
    else if (vaNum !== vbNum){
      const aVince = meglio === "high" ? vaNum > vbNum : vaNum < vbNum;
      vincitore = aVince ? "A" : "B";
    }
    righe.push({ voce: voce, a: va, b: vb, vincitore: vincitore });
  }
  riga("Capacity index (RAM+CPU)", a.score + "/100 (" + a.L.n.toLowerCase() + ")", b.score + "/100 (" + b.L.n.toLowerCase() + ")", a.score, b.score, "high");
  riga("Year (context)", a.anno, b.anno, 0, 0, "high", false);
  /* The operating system is not a performance: it doesn't award the
     point, it only explains why the free GB of the two PCs don't match. */
  riga("Operating system", a.osNome, b.osNome, 0, 0, "high", false);
  const maxA = a.cpu.manual ? -1 : a.cpu.mx;
  const maxB = b.cpu.manual ? -1 : b.cpu.mx;
  const mxNoti = maxA >= 0 && maxB >= 0;
  function ramCell(r, cpu){
    const supera = !cpu.manual && r > cpu.mx;
    return r + " GB" + (supera
      ? ' <span class="avviso-inline">⚠️ beyond the ' + cpu.mx + " GB motherboard maximum</span>"
      : "");
  }
  riga("Installed RAM", ramCell(a.ram, a.cpu), ramCell(b.ram, b.cpu), a.ram, b.ram, "high");
  riga("Indicative maximum RAM of the platform",
    maxA >= 0 ? maxA + " GB" : "to be verified",
    maxB >= 0 ? maxB + " GB" : "to be verified",
    mxNoti ? maxA : 0, mxNoti ? maxB : 0, "high", mxNoti);
  riga("Processor", a.cpu.c + "c/" + a.cpu.t + "t · " + db_simdName(a.cpu), b.cpu.c + "c/" + b.cpu.t + "t · " + db_simdName(b.cpu), a.cpu.sc, b.cpu.sc, "high");
  const grafica = s => !s.gpu || !s.gpu.v
    ? "CPU only"
    : (s.gpu.unificata ? s.gpu.v + " GB of unified memory" : s.gpu.v + " GB VRAM");
  riga("Graphics", grafica(a), grafica(b), a.gpu.v, b.gpu.v, "high");
  riga("Linux", linuxBreve(a), linuxBreve(b), linuxPunteggio(a), linuxPunteggio(b), "high",
    a.cpu.w11 !== null && b.cpu.w11 !== null);
  riga("LM Studio", lmBreve(a), lmBreve(b), lmPunteggio(a), lmPunteggio(b), "high");
  /* The 7B Q4 is a yardstick: if it doesn't fit on a PC, it must be said. */
  function velCell(x){
    return db_tokRange(x.vel7) + (x.vel7Entra ? "" :
      ' <span class="avviso-inline">⚠️ the 7B Q4 does not fit' + (x.maxP ? " · max " + db_param(x.maxP) : "") + "</span>");
  }
  riga("7B Q4 speed (reference)", velCell(a), velCell(b), a.vel7, b.vel7, "high",
    a.vel7Entra && b.vel7Entra);
  riga("Models in the estimate", a.perfetti.length + " within criteria · " + a.usabili.length + " total", b.perfetti.length + " within criteria · " + b.usabili.length + " total", a.usabili.length, b.usabili.length, "high");
  riga("Maximum parameters", a.maxP ? db_param(a.maxP) : "—", b.maxP ? db_param(b.maxP) : "—", a.maxP, b.maxP, "high");

  const vittorie = { A: 0, B: 0 };
  let h = "";
  righe.forEach(r => {
    if (r.vincitore === "A" || r.vincitore === "B") vittorie[r.vincitore]++;
    const cls = r.vincitore === "A" || r.vincitore === "B" ? "win" : "pari";
    const segn = r.vincitore === "A" || r.vincitore === "B" ? r.vincitore : r.vincitore === "n/a" ? "—" : "=";
    h += "<tr><td><b>" + r.voce + "</b></td><td>" + r.a + "</td><td>" + r.b +
      "</td><td class='" + cls + "'>" + (r.vincitore === "n/a" ? "—" : segn) + "</td></tr>";
  });
  $("vsBody").innerHTML = h;

  const va = vittorie.A, vb = vittorie.B;
  let verdetto;
  if (va > vb) verdetto = "🏆 <b>" + nomeAHtml + "</b> wins the indicative tally: " + va + " categories against " + vb + ". ";
  else if (vb > va) verdetto = "🏆 <b>" + nomeBHtml + "</b> wins the indicative tally: " + vb + " categories against " + va + ". ";
  else verdetto = "🤝 <b>Tie</b>: " + va + " categories each. ";
  const differenza = Math.abs(a.score - b.score);
  if (differenza < 8) verdetto += "The internal CPU and RAM indexes are close; also consider GPU, compatibility, power draw, price and the activities you want to do.";
  else if (differenza > 45) verdetto += "The index estimates a wide difference between the entered resources; it is not a benchmark or a fixed speed ratio.";
  else verdetto += "The estimated differences depend on the compatible models and the real runtime performance.";
  $("vsVerdetto").innerHTML = verdetto;

  const modA = a.usabili.slice().sort((x, y) => y.p - x.p)[0];
  const modB = b.usabili.slice().sort((x, y) => y.p - x.p)[0];
  $("vsNota").innerHTML = "The tally is an internal estimate based on the memory and the CPU threshold of the listed models; it does not measure runtime quality or compatibility. GPU, backend and context can change the result. " +
    (modA && modB
      ? "Among the models that pass the indicative criteria, the one with the most parameters is <b>" + modA.n + "</b> on <b>" + nomeAHtml + "</b> and <b>" + modB.n + "</b> on <b>" + nomeBHtml + "</b>."
      : "The estimate finds no models that pass the internal criteria on both PCs. Check RAM, CPU and runtime; if the limit is the memory, a compatible upgrade can widen the options.");
  const senza7 = [!a.vel7Entra ? nomeAHtml : null, !b.vel7Entra ? nomeBHtml : null].filter(Boolean);
  if (senza7.length)
    $("vsNota").innerHTML += " The <b>7B Q4</b> speed is a yardstick: on " +
      senza7.join(" and on ") + " that model doesn't fit in memory, so it's a theoretical value, not a measurement.";

  $("vsRisultato").hidden = false;
  document.querySelector(".vs-side").classList.remove("win");
  document.querySelectorAll(".vs-side")[1].classList.remove("win");
  if (va > vb) document.querySelectorAll(".vs-side")[0].classList.add("win");
  else if (vb > va) document.querySelectorAll(".vs-side")[1].classList.add("win");

  flash("Comparison complete");
}
function linuxBreve(s){
  if (/^Apple/.test(s.cpu.n)) return "Optional; check support";
  if (s.bit32) return "✅ Recommended (32-bit)";
  if (s.anno <= 2013) return "✅ Recommended";
  if (s.cpu.w11 === null) return "❓ Check requirements";
  if (s.cpu.w11 === 0) return "✅ Consider an alternative";
  if (s.score < 68) return "✅ Recommended";
  return "🟡 Optional";
}
/* how much Linux is really needed on this machine */
function linuxPunteggio(s){
  if (/^Apple/.test(s.cpu.n)) return 20;
  if (s.bit32) return 100;      // it's the only path
  if (s.anno <= 2013) return 90; // Windows 10 is end-of-life (apart from ESU)
  if (s.score < 50) return 80;
  if (s.score < 68) return 60;
  if (s.cpu.w11 !== 1 || s.ram < 4) return 75;
  return 30;                     // CPU on the list and minimum RAM; other requirements still to be checked
}
function lmPunteggio(s){
  if (s.lmNoAvx2) return -1;
  if (s.ram < 4) return 0;
  return s.usabili.length;
}
function lmBreve(s){
  if (s.lmNoAvx2) return "❌ AVX2 requirement";
  if (s.ram < 4) return "❌ Too little RAM";
  if (!s.usabili.length) return "❌ No model";
  if (s.utile < 3) return "⚠️ Only 0.5-1B";
  if (s.maxP >= 12) return "✅ Estimate up to " + db_param(s.maxP);
  if (s.maxP >= 7) return "✅ Estimate up to 7-8B";
  if (s.maxP >= 3) return "✅ Estimate up to 3-4B";
  return "⚠️ Only 1-2B";
}

/* ============================================================
   7. COPY / PRINT / RESET / EXAMPLES
   ============================================================ */
function copiaRiassunto(){
  if (!STATO){ flash("First press Calculate what I can do."); return; }
  const s = STATO;
  const top = s.usabili.slice().sort((a, b) => b.p - a.p).slice(0, 3)
    .map(m => "  • " + m.n + " (" + db_param(m.p) + " — " + db_tokRange(m.vel) + (m.onGpu ? ", GPU" : "") + ")").join("\n");
  const txt = [
    "OLD PC GUIDE — my verdict",
    "PC: " + s.anno + " · " + s.ram + " GB RAM · " + s.osNome + " · " + s.cpu.n + " · " + s.gpu.n,
    "Indicative index: " + s.score + "/100 (RAM 45% · processor 55%; year excluded) — level " + s.L.n.toLowerCase(),
    "Linux: " + $("vLinuxVal").textContent.replace(/^[^\w]+/, ""),
    "LM Studio: " + $("vLMVal").textContent.replace(/^[^\w]+/, ""),
    "Windows 11: " + $("vWinVal").textContent.replace(/^[^\w]+/, ""),
    "RAM usable for AI: ~" + db_num(s.utile) + " GB (" + s.ram + " GB installed − " + db_num(s.overhead) + " GB of " + s.osNome + ")",
    "",
    "Models allowed by the indicative criteria:",
    top || "  (the estimate finds no models within the indicative criteria)",
    "",
    s.os === "mac"
      ? "Unified memory: the operating system and the model share the same GB."
      : s.os === "linux"
      ? "Operating system evaluated: Linux. Real compatibility depends on distribution, release and peripherals."
      : "Operating system evaluated: Windows. Real compatibility depends on the version requirements.",
    "Old PC Guide — guidapcvecchi.it"
  ].join("\n");
  copia(txt);
}
function copia(txt){
  const ok = () => flash("✓ Summary copied to clipboard");
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = txt;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    let done = false;
    try { done = document.execCommand("copy"); } catch (e) { done = false; }
    document.body.removeChild(ta);
    done ? ok() : flash("Copy not available: select the text manually");
  };
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext)
    navigator.clipboard.writeText(txt).then(ok, fallback);
  else fallback();
}
function stampa(){ window.print(); }
function reset(){
  if (ANNO_PC) ANNO_PC.resetta(2011); else $("anno").value = 2011;
  $("ram").value = 4; $("ssd").value = "hdd"; $("so").value = "win";
  $("cpu").value = "Core i5-2400 (Sandy Bridge)";
  $("gpu").value = "Integrated graphics only / no GPU";
  if (COMBO_CPU) COMBO_CPU.mostra();
  if (COMBO_GPU) COMBO_GPU.mostra();
  aggiornaVram();
  const hint = $("hintCpu");
  hint.classList.remove("errore");
  hint.textContent = HINT_CPU_BASE || hint.textContent;
  $("risultato").hidden = true;
  $("vsRisultato").hidden = true;
  STATO = null;
  ["distro", "steps", "trucchiList"].forEach(id => $(id).innerHTML = "");
  $("tbody").innerHTML = '<tr><td colspan="7" class="empty">Select year, RAM and processor and press <b>Calculate</b>.</td></tr>';
  flash("Fields cleared");
}
function flash(m){
  $("msg").textContent = m;
  clearTimeout(window.__t);
  window.__t = setTimeout(() => { $("msg").textContent = ""; }, 3200);
}

const ESEMPI = [
  { anno: 2011, ram: 8, cpu: "Core i5-2400 (Sandy Bridge)", gpu: "Integrated graphics only / no GPU", ssd: "hdd", so: "win", n: "Recycled 2011 desktop" },
  { anno: 2005, ram: 2, cpu: "Pentium 4 Prescott 2.8-3.4 GHz (check the exact model)", gpu: "Integrated graphics only / no GPU", ssd: "hdd", so: "linux", n: "2005 PC with 2 GB" },
  { anno: 2021, ram: 16, cpu: "Ryzen 5 3600", gpu: "GeForce RTX 3060 (12 GB)", ssd: "nvme", so: "win", n: "Ryzen 5 with 16 GB, RTX 3060 and SSD" },
  { anno: 2017, ram: 4, cpu: "Core i5-4460 (Haswell)", gpu: "GeForce GTX 1050 Ti (4 GB)", ssd: "hdd", so: "win", n: "2017 PC with a 4 GB GPU" }
];
function esempio(){
  const e = ESEMPI[Math.floor(Math.random() * ESEMPI.length)];
  if (ANNO_PC) ANNO_PC.resetta(e.anno); else $("anno").value = e.anno;
  $("ram").value = e.ram; $("ssd").value = e.ssd; $("so").value = e.so;
  $("cpu").value = e.cpu; $("gpu").value = e.gpu;
  if (COMBO_CPU) COMBO_CPU.mostra();
  if (COMBO_GPU) COMBO_GPU.mostra();
  aggiornaVram();
  analizza(true);
  flash("Example loaded: " + e.n);
}
function confrontoEsempio(){
  $("cmpANome").value = "Core 2 Duo E8400 desktop";
  if (ANNO_A) ANNO_A.resetta(2008); else $("cmpAAnno").value = 2008;
  $("cmpARam").value = 4; $("cmpASo").value = "linux";
  $("cmpACpu").value = "Core 2 Duo E8400";
  $("cmpAGpu").value = "Integrated graphics only / no GPU";
  $("cmpBNome").value = "PC with Ryzen 5 3600 and RTX 3060";
  if (ANNO_B) ANNO_B.resetta(2021); else $("cmpBAnno").value = 2021;
  $("cmpBRam").value = 16; $("cmpBSo").value = "win";
  $("cmpBCpu").value = "Ryzen 5 3600";
  $("cmpBGpu").value = "GeForce RTX 3060 (12 GB)";
  if (COMBO_CPU) COMBO_CPU.mostra();
  if (COMBO_GPU) COMBO_GPU.mostra();
  aggiornaVram();
  confronta();
  $("vsRisultato").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ============================================================
   8. STARTUP
   ============================================================ */
function popolaRam(select, defaultVal){
  select.innerHTML = "";
  RAM_VALS.forEach(v => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v + " GB";
    select.appendChild(o);
  });
  if (defaultVal) select.value = defaultVal;
}
function init(){
  // calculator selectors
  popolaRam($("ram"), 4);
  popolaRam($("cmpARam"), 4);
  popolaRam($("cmpBRam"), 16);

  const optAltro = document.createElement("option");
  optAltro.value = "ALTRO";
  optAltro.textContent = "Not in the list → I'll enter it manually";

  const comboCpu = Combo("cpuSearch", "cpu", "cpuList", "cpuNote", DB_GRUPPI_CPU, DB_CPU, optAltro, "cpu",
                         { anno: function(){ return $("anno").value; } });
  const comboGpu = Combo("gpuSearch", "gpu", "gpuList", "gpuNote", DB_GRUPPI_GPU_HOME, DB_GPU, null, "gpu");
  COMBO_CPU = comboCpu; COMBO_GPU = comboGpu;
  // initial values: a 2011 desktop, so the page is already useful at first glance
  $("cpu").value = "Core i5-2400 (Sandy Bridge)";
  $("gpu").value = "Integrated graphics only / no GPU";
  comboCpu.mostra(); comboGpu.mostra();

  // comparison selectors: same lists, without search and without "ALTRO"
  ["ACpu", "BCpu"].forEach(id => {
    const sel = $("cmp" + id);
    DB_GRUPPI_CPU.forEach(([etichetta, chiave]) => {
      const og = document.createElement("optgroup");
      og.label = etichetta;
      (DB_CPU[chiave] || []).forEach(p => {
        const o = document.createElement("option");
        o.value = p.n; o.textContent = p.n;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  });
  $("cmpACpu").value = "Core 2 Duo E8400";
  $("cmpBCpu").value = "Ryzen 5 3600";
  ["AGpu", "BGpu"].forEach(id => {
    const sel = $("cmp" + id);
    DB_GRUPPI_GPU.forEach(([etichetta, chiave]) => {
      const og = document.createElement("optgroup");
      og.label = etichetta;
      (DB_GPU[chiave] || []).forEach(p => {
        const o = document.createElement("option");
        o.value = p.n; o.textContent = p.n;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  });
  $("cmpAGpu").value = "Integrated graphics only / no GPU";
  $("cmpBGpu").value = "GeForce RTX 3060 (12 GB)";

  // year ↔ processor correlation: from here on the year follows the CPU
  HINT_CPU_BASE = $("hintCpu").textContent;
  ANNO_PC = db_annoSync($("anno"), $("cpu"), leggiCpu, $("hintAnno"), comboCpu);
  ANNO_A  = db_annoSync($("cmpAAnno"), $("cmpACpu"), leggiCpu);
  ANNO_B  = db_annoSync($("cmpBAnno"), $("cmpBCpu"), leggiCpu);
  ANNO_PC.sincronizza(); ANNO_A.sincronizza(); ANNO_B.sincronizza();

  // events
  ["ram", "cpu", "gpu", "ssd", "so"].forEach(id => $(id).addEventListener("change", () => analizza(false)));
  $("anno").addEventListener("change", () => analizza(false));
  $("cpu").addEventListener("change", () => { $("boxAltro").hidden = $("cpu").value !== "ALTRO"; });
  $("gpu").addEventListener("change", aggiornaVram);
  $("gpuVram").addEventListener("change", () => analizza(false));
  ["filtroFam", "filtroQ"].forEach(id => $(id).addEventListener("change", disegnaTabella));
  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if (!b) return;
    tabAttiva = b.dataset.f;
    [...$("tabs").children].forEach(x => x.classList.toggle("att", x === b));
    disegnaTabella();
  });
  $("annoSito").textContent = new Date().getFullYear();
  analizza(false);
}
document.addEventListener("DOMContentLoaded", init);