/* ============================================================
   lm.js — LM Studio configurator for old PCs
   Uses the same database as the main calculator (../db.js)
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];

function popolaOptgroup(sel, gruppi, fonte, defaultVal){
  sel.innerHTML = "";
  gruppi.forEach(([etichetta, chiave]) => {
    const voci = fonte[chiave] || [];
    if (!voci.length) return;
    const og = document.createElement("optgroup");
    og.label = etichetta;
    voci.forEach(p => {
      const o = document.createElement("option");
      o.value = p.n; o.textContent = p.n;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  if (defaultVal) sel.value = defaultVal;
}
function cerca(liste, nome){
  for (const k in liste) for (const p of liste[k]) if (p.n === nome) return p;
  return null;
}

/* Initial context value, based on indicative usable-RAM tiers. */
function contestoMax(utile){
  if (utile < 3)  return 512;
  if (utile < 5)  return 1024;
  if (utile < 9)  return 2048;
  if (utile < 14) return 4096;
  if (utile < 26) return 8192;
  return 16384;
}
function pesoPerUso(uso){
  return {
    chat:       { q: "Q4_K_M", t: "Text", nota: "Q4_K_M is a common quantization; quality, memory and speed depend on the model and the task." },
    scrittura:  { q: "Q4_K_M", t: "Text", nota: "Compare different quantizations on the text you want to write; larger formats may require more memory." },
    codice:     { q: "Q4_K_M", t: "Code", nota: "Consider a model trained for code and try an example of your work before choosing it." },
    documenti:  { q: "Q4_K_M", t: "Text", nota: "To analyze documents, check file support, context and memory in the version of the runtime you will use." }
  }[uso];
}

function lmConfigura(){
  const ram = Number($("lRam").value);
  const cpu = cerca(DB_CPU, $("lCpu").value);
  let gpu = cerca(DB_GPU, $("lGpu").value) || DB_GPU.ig[0];
  const disco = $("lDisco").value;
  const uso = $("lUso").value;
  if (!cpu){ $("lmEsito").innerHTML = '<div class="callout errore">Choose a processor.</div>'; return; }

  const apple = /^Apple/.test(cpu.n);
  let so = $("lSo").value;
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("lSo").value = so;
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — unified memory", v: 0, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }

  const score = db_punteggioPc(ram, cpu);
  /* Simplified budget for system and applications; check the real free RAM. */
  const linux = so === "linux";
  const overhead = linux ? 1.2 : so === "mac" ? 3 : 2.4;
  const utile = Math.max(0.4, ram - overhead);
  if (apple) gpu.v = utile;
  const contesto = contestoMax(utile);
  const cfg = pesoPerUso(uso);
  const ctx = { sc: score, avx: cpu.avx, mem: cpu.mem, arm: !!cpu.arm, gpu: gpu };
  const noAvx2 = !cpu.arm && cpu.avx < 2;
  const archIncerta = !cpu.arm && cpu.b32 === null;
  const lmBloccato = !cpu.arm && (cpu.b32 === 1 || archIncerta || (noAvx2 && !linux));

  /* Recommended model: the largest one that fits in memory with a CPU
     fast enough, favoring the right specialization.
     If there is a dedicated GPU, prefer the largest that fits
     ENTIRELY: the offload advantage depends on card, model,
     backend and drivers; VRAM alone does not allow estimating a fixed factor. */
  let scelto = null;
  if (!lmBloccato) {
    // a model that fits in VRAM does not need the same system RAM:
    // video memory is physically separate, and serves only the cache
    const bonusVram = !apple && gpu.v >= 4 ? gpu.v : 0;
    const utili = m => cpu.sc >= m.mc && (m.ram <= utile || (bonusVram && m.dim <= gpu.v && m.ram <= utile + bonusVram));
    const specializzati = m => db_hasCompito(m, cfg.t) || (cfg.t === "Text" && db_hasCompito(m, "Vision"));
    let candidati = DB_MODELLI.filter(utili);
    const inVram = candidati.filter(m => gpu.v >= 4 && m.dim <= gpu.v && specializzati(m));
    if (inVram.length) candidati = inVram;
    const adatti = candidati.filter(specializzati);
    const pool = adatti.length ? adatti : candidati;
    pool.forEach(m => { if (!scelto || m.p > scelto.p) scelto = m; });
  }

  const out = [];
  const riga = (etichetta, valore, note) =>
    '<div class="d-row"><div class="dn">' + etichetta + '</div><div class="db">' + valore +
    '</div><div class="dd">' + (note || "") + "</div></div>";

  /* --- opening verdict --- */
  let verdetto;
  if (lmBloccato) {
    const motivoCpu = cpu.b32 === 1
      ? "The profile indicates a 32-bit CPU, while LM Studio requires a supported x64 or ARM64 platform."
      : archIncerta
        ? "The profile does not allow confirming the x64 architecture required by this installation."
        : "For Windows x64 the official requirements list AVX2, which this CPU profile does not have.";
    verdetto = '<div class="callout errore"><h3>CPU compatibility to verify</h3><p><b>' +
      cpu.n + "</b>: " + motivoCpu + " " +
      "Reinstalling does not add instructions to the CPU. You can check an alternative build or runtime, without any guarantee of compatibility, " +
      "or use this PC as a client for a model running on another machine on the network.</p></div>";
  } else if (ram < 4) {
    verdetto = '<div class="callout attenzione"><h3>Very limited memory</h3><p>With ' + ram +
      " GB the memory may not be enough for system, runtime, model and context. Try only a very small size and check the free memory; adding RAM can widen the options, if the PC supports it.</p></div>";
  } else if (apple) {
    verdetto = '<div class="callout ok"><h3>Apple Silicon uses unified memory</h3><p>The integrated GPU and macOS share the memory shown as RAM. The estimate reserves a part for the system and the applications; check the real free memory and the model support in LM Studio.</p></div>';
  } else if (gpu.v >= 12) {
    verdetto = '<div class="callout ok"><h3>The GPU can help</h3><p><b>' + gpu.n +
      "</b> has " + gpu.v + " GB of VRAM. If runtime and backend support the card, you can assign part of the model's layers to the GPU; the gain depends on model, driver, context and free memory.</p></div>";
  } else if (ram >= 16) {
    verdetto = '<div class="callout ok"><h3>Good configuration</h3><p>With ' + ram +
      " GB of RAM you can evaluate models of different sizes, after considering the operating system, context and open programs. Performance depends a lot on CPU and runtime.</p></div>";
  } else if (ram >= 8) {
    verdetto = '<div class="callout ok"><h3>You can try models of several sizes</h3><p>With ' + ram +
      " GB of RAM you can also evaluate some quantized 7-8 billion models. Headroom and performance depend on the file, context, operating system and open applications: check how much memory stays free.</p></div>";
  } else if (ram >= 4) {
    verdetto = '<div class="callout attenzione"><h3>It works, but few models remain</h3><p>With ' + ram +
      " GB it is best to start with small models and check the memory and context required by their card. A larger model may not leave enough RAM for the system.</p></div>";
  } else {
    verdetto = '<div class="callout attenzione"><h3>At the limit</h3><p>With ' + ram +
      " GB of RAM the simplified budget estimates " + db_num(utile) + " GB available after a reserve for the system. You can try a very small model, for example <b>Qwen3 0.6B</b> or <b>Llama 3.2 1B</b>, with a reduced context and checking the real memory. If the PC allows it, more RAM can widen the options; check the supported type and capacity.</p></div>";
  }

  /* --- settings --- */
  let offload = "0 (all on CPU)";
  let offloadNote = "No GPU with VRAM: the model runs in system RAM, and the CPU also does the inference.";
  if (apple) {
    offload = "Metal · unified memory";
    offloadNote = "Memory for system, apps and model is shared; acceleration depends on the model and the runtime.";
  } else if (gpu.v) {
    if (!scelto) {
      offload = "To check in the runtime";
      offloadNote = "VRAM alone is not enough to estimate a layer count: you need a compatible model and room for context, cache and buffers.";
    } else if (gpu.v >= scelto.dim) {
      offload = "GPU to try";
      offloadNote = "The capacity may be enough for the estimated weights, but the context, the cache and the buffers need headroom. Check the offload and the backend in the runtime.";
    } else {
      offload = "Partial, to try";
      offloadNote = "VRAM is lower than the estimated size of the weights. The runtime can spread the model between GPU and RAM if the backend supports it; check the real usage.";
    }
  }
  if (lmBloccato) { offload = "— to check"; offloadNote = "First check the CPU architecture and platform requirements; the GPU does not remove a CPU requirement."; }

  out.push(verdetto);
  if (noAvx2 && !lmBloccato)
    out.push('<div class="callout attenzione"><b>Linux compatibility:</b> the x64 package of LM Studio includes AVX2 by default. The model estimate does not confirm that this CPU can start the build: check the requirements and try the runtime.</div>');

  /* Without AVX the settings make no sense: showing them
     would fill the page with useless numbers. */
  if (lmBloccato){
    out.push('<ol class="steps">' +
      "<li><b>Verify the runtime before installing</b><div class=\"sm\">For Windows x64 LM Studio lists AVX2 in the requirements; on Linux x64 the package includes AVX2 by default. The selected profile, <b>" +
      cpu.n + "</b>, does not list AVX2: check whether the chosen build is compatible. An alternative runtime may have different requirements.</div></li>" +
      "<li><b>Decide what you want to do with the PC</b><div class=\"sm\">You can look for a maintained runtime compatible with the available instructions, or use the PC as a client for a remote model, " +
      '<a href="../ollama-vs-lm-studio/">Ollama</a>.</div></li>' +
      "</ol>" +
      '<div class="nota">If you are not sure that your processor really lacks AVX, <a href="../#calcolatore">run the full calculation</a> ' +
      "or check the <a href='../linux-old-pcs/'>Linux for old PCs guide</a>: on hardware of this level the operating system is the choice that matters more than anything else.</div>");
    $("lmEsito").innerHTML = out.join("");
    return;
  }

  out.push('<h3 style="margin-top:22px">Settings to enter in the model panel</h3><div class="distro">' +
    riga("Recommended model",
      scelto ? db_param(scelto.p) : "—",
      scelto ? "<b>" + scelto.n + "</b> — " + scelto.d + " (estimated file " + db_num(scelto.dim) + " GB; estimated RAM requirement " + db_num(scelto.ram) + " GB)." : "The estimate finds no suitable models that fit in memory. Try a smaller size or consider a remote runtime.") +
    riga("Quantization", cfg.q, cfg.nota) +
    riga("GPU Offload", offload, offloadNote) +
    riga("Context Length", contesto + " token",
      "Indicative initial value: the context uses additional memory and consumption depends on model and runtime. If memory is at the limit, reduce it and check the real behavior.") +
    riga("Threads to use", cpu.t, "The optimal number depends on model, runtime and load. Try the default value and compare it with the number of logical threads.") +
    "</div>");

  /* --- practical row on disk and RAM --- */
  const tempoCaricamento = disco === "hdd" ? "usually slower"
    : disco === "nvme" ? "usually faster"
    : "depends on the model";
  const modelloRiga = scelto || { p: 8, dim: 4.9 };
  /* If no model fits in memory the shown speed is the theoretical one
     of an 8B: it must be written, otherwise it seems to refer to your PC. */
  const notaVel = scelto
    ? ((apple || (gpu.v && gpu.v >= modelloRiga.dim))
        ? (apple ? "Estimate with Apple acceleration; the result depends on model, free memory, system and runtime version." : "VRAM can hold the estimated weights, but context, cache and buffers need additional memory. Speed depends on the card and the backend.")
        : "Estimate calculated on the CPU; the feeling of fluidity also depends on the time to first token and on the length of the answer.")
    : noAvx2
      ? "The speed estimate does not confirm the compatibility of the CPU with the selected LM Studio build."
      : "With " + db_num(utile) + " GB free no model in the list fits: it is the theoretical value of an 8B in Q4, useful only to compare different PCs.";
  out.push('<h3 style="margin-top:24px">What to expect</h3><div class="distro">' +
    riga("Speed on " + db_param(modelloRiga.p) + " in Q4" + (scelto ? "" : " (reference)"),
      db_tokRange(db_stimaTok(modelloRiga.p, ctx, modelloRiga.dim)),
      notaVel) +
    riga("Loading time", tempoCaricamento,
      disco === "hdd" ? "An SSD can reduce read times compared to an HDD; check interface, format and compatibility before buying." : "The real time varies with model size, disk, runtime and system.") +
    riga("RAM to keep free", db_num(utile) + " GB",
      utile < 3 ? "Space is limited: close unneeded applications and reduce the context; check the free memory during loading." : "The memory used by the browser and the other apps varies: close them if the system reports low RAM.") +
    "</div>");

  /* --- final steps --- */
  const passi = [];
  passi.push("Download <a href='https://lmstudio.ai/' target='_blank' rel='noopener'>LM Studio</a> and install it.");
  if (noAvx2) {
    passi.push("Before installing, check the instructions required by the build: AVX2 is listed for Windows x64 and included in the default Linux x64 package.");
  } else {
    passi.push("Search for <b>" + (scelto ? scelto.n : "Qwen3 0.6B") + "</b> in the library and choose the <b>" + cfg.q + "</b> version.");
    passi.push("Download <b>only one model</b> and wait for the loading before doing anything else.");
    passi.push("In the model panel: GPU Offload <b>" + offload + "</b>, Context Length <b>" + contesto + "</b>, Thread <b>" + cpu.t + "</b>.");
    passi.push("Load the model and ask a test question. If the answer convinces you, you're done: from here on it's a matter of habit.");
  }
  passi.push("If you want to move to a windowed interface for several people on the network, consider <a href='../ollama-vs-lm-studio/'>Ollama</a> with its API.");
  out.push('<h3 style="margin-top:24px">Your next steps</h3><ol class="steps">' +
    passi.map(p => "<li>" + p + "</li>").join("") + "</ol>");

  out.push('<div class="nota">These settings are estimates based on the RAM, operating system, processor and graphics card you entered. ' +
    "Check the model requirements and the free memory: temperature, drivers, backend, context and cooling can change the results a lot. " +
    "If you want the full picture on your PC, use the <a href='../#calcolatore'>calculator</a> or look at the <a href='../best-local-ai-models/'>models for your RAM</a>.</div>");

  $("lmEsito").innerHTML = out.join("");
}

function lmAzzera(){
  $("lRam").value = 8;
  $("lDisco").value = "ssd";
  $("lUso").value = "chat";
  $("lSo").value = "win";
  popolaOptgroup($("lCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("lGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  $("lmEsito").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function(){
  RAM_VALS.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v + " GB";
    $("lRam").appendChild(o);
  });
  $("lRam").value = 8;
  popolaOptgroup($("lCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("lGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  $("lCpu").addEventListener("change", function(){
    const cpu = cerca(DB_CPU, $("lCpu").value);
    if (/^Apple/.test(cpu ? cpu.n : "")) $("lSo").value = "mac";
    else if ($("lSo").value === "mac") $("lSo").value = "win";
  });

});