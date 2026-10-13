/* ============================================================
   modelli.js — filterable catalog by RAM, CPU and use case
   Reuses ../db.js: the same database as the calculator, so
   the numbers you see here match the ones on the home page.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];

/* The CPU threshold that makes a model "usable" lives in the DB
   (mc field). Here we only need the readable name. */
function cpuEtichetta(sc){
  return "internal index ≥ " + sc + " (estimate)";
}

function popolaSel(sel, valori, suffisso, defaultVal){
  sel.innerHTML = "";
  valori.forEach(function(v){
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v + (suffisso || "");
    sel.appendChild(o);
  });
  if (defaultVal !== undefined) sel.value = defaultVal;
}
function popolaOptgroup(sel, gruppi, fonte, defaultVal){
  sel.innerHTML = "";
  gruppi.forEach(function(entry){
    const voci = fonte[entry[1]] || [];
    if (!voci.length) return;
    const og = document.createElement("optgroup");
    og.label = entry[0];
    voci.forEach(function(p){
      const o = document.createElement("option");
      o.value = p.n; o.textContent = p.n;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  if (defaultVal) sel.value = defaultVal;
}
function cerca(lista, nome){
  for (const k in lista){
    const voci = lista[k];
    for (let i = 0; i < voci.length; i++) if (voci[i].n === nome) return voci[i];
  }
  return null;
}

/* The tag Ollama actually uses for that model. Working it out
   from the name is not enough: Ollama calls "gemma3" what
   everyone calls Gemma 3, and "llama3.2" keeps the dot. */
const TAG_OLLAMA = {
  "Qwen3 0.6B": "qwen3:0.6b",
  "Qwen2.5 0.5B Instruct": "qwen2.5:0.5b",
  "Qwen2.5 1.5B Instruct": "qwen2.5:1.5b",
  "Llama 3.2 1B Instruct": "llama3.2:1b",
  "SmolLM2 1.7B Instruct": "smollm2:1.7b",
  "Qwen3 1.7B": "qwen3:1.7b",
  "Granite 3.3 2B Instruct": "granite3.3:2b",
  "Ministral 3B": "ministral:3b",
  "Qwen2.5 3B": "qwen2.5:3b",
  "Llama 3.2 3B Instruct": "llama3.2:3b",
  "Phi-4-mini-instruct": "phi4-mini",
  "DeepSeek-R1-Distill-Qwen-1.5B": "deepseek-r1:1.5b",
  "Qwen3 4B": "qwen3:4b",
  "Gemma 3 4B": "gemma3:4b",
  "Qwen2.5-Coder 1.5B": "qwen2.5-coder:1.5b",
  "DeepSeek-Coder 6.7B": "deepseek-coder:6.7b",
  "Qwen2.5-Coder 7B": "qwen2.5-coder:7b",
  "Qwen2.5 7B Instruct": "qwen2.5:7b",
  "Mistral 7B Instruct v0.3": "mistral:7b",
  "DeepSeek-R1-Distill-Qwen-7B": "deepseek-r1:7b",
  "Llama 3.1 8B Instruct": "llama3.1:8b",
  "Qwen3 8B": "qwen3:8b",
  "SmolVLM2 2.2B": "smolvlm2",
  "Qwen2.5-VL 3B": "qwen2.5vl:3b",
  "Qwen2.5-Coder 14B": "qwen2.5-coder:14b",
  "Qwen2.5 14B Instruct": "qwen2.5:14b",
  "Qwen3 14B": "qwen3:14b",
  "Phi-4 14B": "phi4:14b",
  "Gemma 3 12B": "gemma3:12b",
  "Mistral Small 3.1 24B": "mistral-small3.1:24b",
  "Gemma 3 27B": "gemma3:27b",
  "Qwen3 30B-A3B (MoE)": "qwen3:30b-a3b",
  "Qwen3-Coder 30B-A3B": "qwen3-coder:30b",
  "Qwen3 32B": "qwen3:32b",
  "DeepSeek-R1-Distill-Llama-70B": "deepseek-r1:70b",
};
function modTag(m){
  if (TAG_OLLAMA[m.n]) return TAG_OLLAMA[m.n];
  /* No known tag: better a Hugging Face search than a
     command that fails and undermines trust in the guide. */
  return "";
}
function modComando(m){
  return "look it up by name in the <a href='https://ollama.com/library' target='_blank' rel='noopener'>Ollama library</a> or on <a href='https://huggingface.co/models' target='_blank' rel='noopener'>Hugging Face</a>";
}

/* ----------------------------------------------------------------
   FILTERING
   Two distinct limits, never to be confused:
   - memory: the model must fit in RAM (or in VRAM)
   - speed: the CPU must be fast enough
   A model can fit in and still not be usable,
   or be fast and never fit.
   ---------------------------------------------------------------- */
function valuta(m, ramUtile, vram, cpuSc){
  const entra = m.ram <= ramUtile;
  const inVram = vram >= 4 && m.dim <= vram;
  const veloce = cpuSc >= m.mc;
  const scarto = ramUtile > 0 ? m.ram / ramUtile : 99;
  let stato;
  if (!entra && !inVram) stato = scarto <= 1.15 ? "limite" : "no";
  else if (!veloce) stato = entra && scarto <= 1.05 ? "limite" : "no";
  else stato = entra ? "ok" : "limite";
  return { entra: entra, inVram: inVram, veloce: veloce, stato: stato };
}
const PILL = {
  ok: '<span class="b ok">compatible within the estimate</span>',
  limite: '<span class="b mid">at the limit (estimate)</span>',
  no: '<span class="b no">requirements not met by the estimate</span>'
};

function modFiltra(){
  const ram = Number($("mRam").value);
  const cpu = cerca(DB_CPU, $("mCpu").value);
  let gpu = cerca(DB_GPU, $("mGpu").value) || DB_GPU.ig[0];
  const uso = $("mUso").value;
  const apple = !!cpu && /^Apple/.test(cpu.n);
  let so = $("mSo").value;
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("mSo").value = so;
  if (!cpu){ $("modEsito").innerHTML = '<div class="callout errore">Choose a processor.</div>'; return; }

  const linux = so === "linux";
  const overhead = linux ? 1.2 : so === "mac" ? 3 : 2.4;
  const ramUtile = Math.max(0.4, ram - overhead);
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — unified memory", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }
  const vram = gpu.v || 0;
  const lmNoAvx2 = !cpu.arm && cpu.avx < 2;
  const ctx = { sc: cpu.sc, avx: cpu.avx, mem: cpu.mem, arm: !!cpu.arm, gpu: gpu };
  const usoLabel = { tutti: "all tasks", Text: "answering and writing text", Code: "programming", Reasoning: "reasoning", Vision: "reading images" }[uso];

  let valutati = DB_MODELLI.map(function(m){
    const v = valuta(m, ramUtile, vram, cpu.sc);
    return {
      m: m, v: v,
      vel: db_stimaTok(m.p, ctx, m.dim),
      adatto: uso === "tutti" || db_hasCompito(m, uso)
    };
  });

  const utili = valutati.filter(function(x){ return x.v.stato !== "no" && x.adatto; });
  const perfetti = utili.filter(function(x){ return x.v.stato === "ok"; });

  /* --- opening verdict --- */
  let box = "";
  if (utili.length){
    const piuGrande = utili.slice().sort(function(a, b){ return b.m.p - a.m.p; })[0];
    const piuScattante = utili.slice().sort(function(a, b){ return b.vel - a.vel; })[0];
    let classe = "ok", titolo = "";
    if (perfetti.length && ramUtile >= 12){ classe = "ok"; titolo = "The estimate finds more than one model within the indicative budget"; }
    else if (perfetti.length){ classe = "ok"; titolo = "The estimate finds " + perfetti.length + " models within the indicative criteria"; }
    else { classe = "attenzione"; titolo = "The listed models need a closer check"; }
    box = '<div class="callout ' + classe + '"><h3>' + titolo + "</h3><p>" +
      "With " + ram + " GB of RAM" + (so === "mac" ? " on macOS" : linux ? " on Linux" : " on Windows") + " the simplified budget estimates <b>" + db_num(ramUtile) + " GB</b> available after an indicative reserve for the system" +
      (apple ? "; RAM and GPU share the unified memory" : vram ? "; the card shows <b>" + vram + " GB of VRAM</b>" : "") + ". " +
      "For <b>" + usoLabel + "</b>, the model with the most parameters among those allowed by the estimate is <b>" + piuGrande.m.n + "</b> (" + db_param(piuGrande.m.p) + ", " +
      db_tokRange(piuGrande.vel) + (piuGrande.v.inVram ? (apple ? ", weights within the unified memory estimate" : ", weights within the estimated VRAM") : "") + ")." +
      (piuScattante.m.n !== piuGrande.m.n
        ? " The highest estimated speed in this list is for <b>" + piuScattante.m.n + "</b>: " + db_tokRange(piuScattante.vel) + "."
        : "") +
      "</p></div>" + (lmNoAvx2 ? '<div class="callout attenzione"><b>CPU compatibility:</b> for Windows x64 LM Studio lists AVX2 in its requirements; the Linux x64 package includes it by default. Ollama and other runtimes can use different runners: check the build and the required instructions.</div>' : "");
  } else {
    box = '<div class="callout attenzione"><h3>No model suitable for your setup</h3>' +
      "<p>With " + ram + " GB of RAM and " + cpu.n + ", the estimate finds no " + usoLabel +
      " model that meets the indicative criteria. Check the runtime requirements, the free memory and the CPU architecture; you can try a smaller model or use the PC as a client of a remote service.</p></div>";
  }

  /* --- cards for the usable models --- */
  let schede = "";
  if (utili.length){
    schede = '<h3 style="margin-top:22px">' + utili.length + " models compatible within the estimate" + '</h3><div class="cards">' +
      utili.slice().sort(function(a, b){ return b.m.p - a.m.p; }).map(function(x){
        const m = x.m;
        const velPill = x.v.inVram
          ? '<span class="b ok">' + db_tokRange(x.vel) + (apple ? " (Apple GPU, estimate)" : " (GPU, estimate)") + "</span>"
          : x.vel >= 8 ? '<span class="b ok">' + db_tokRange(x.vel) + "</span>"
          : x.vel >= 3 ? '<span class="b mid">' + db_tokRange(x.vel) + "</span>"
          : '<span class="b no">' + db_tokRange(x.vel) + "</span>";
        return '<div class="mcard">' +
          '<div class="mf">' + m.t.replace(/ \/ /g, " · ") + " · " + db_param(m.p) + "</div>" +
          "<h3>" + m.n + "</h3>" +
          "<p>" + m.d + "</p>" +
          '<div class="mrow"><span>File <b>' + db_num(m.dim) + " GB</b></span><span>RAM <b>" + db_num(m.ram) + " GB</b></span>" + velPill + "</div>" +
          '<div class="mrow">' + PILL[x.v.stato] + (x.v.inVram ? '<span class="b ok">⚡ ' + (apple ? "unified memory" : "estimated VRAM") + "</span>" : "") + "</div>" +
          "</div>";
      }).join("") + "</div>";
  }

  /* --- what stays out, and why --- */
  let esclusi = "";
  const fuori = valutati.filter(function(x){ return !x.adatto || x.v.stato === "no"; });
  if (fuori.length){
    esclusi = '<details style="margin-top:20px"><summary>Why the other ' + fuori.length + " models don't work here</summary>" +
      '<div class="tablewrap"><table class="cmp"><thead><tr><th>Model</th><th>Estimated RAM</th><th>Heuristic CPU threshold</th><th>Reason</th></tr></thead><tbody>' +
      fuori.map(function(x){
        let motivo;
        if (x.v.stato === "no"){
          if (x.adatto === false && x.v.entra) motivo = "Not a model for " + usoLabel;
          else if (!x.v.veloce && !x.v.entra) motivo = "Memory estimate and CPU threshold not met";
          else if (!x.v.veloce) motivo = "The CPU index is below the internal heuristic threshold";
          else motivo = "The estimate requires " + db_num(x.m.ram) + " GB and the calculated budget is " + db_num(ramUtile) + " GB";
        } else motivo = "Not a model for " + usoLabel;
        return "<tr><td>" + x.m.n + '</td><td class="num">' + db_num(x.m.ram) + " GB</td><td>" +
          cpuEtichetta(x.m.mc) + '</td><td class="c-no">' + motivo + "</td></tr>";
      }).join("") + "</tbody></table></div></details>";
  }

  /* --- the three steps to take now --- */
  const passi = [];
  if (utili.length){
    const primo = utili.slice().sort(function(a, b){ return b.m.p - a.m.p; })[0];
    passi.push("Look up <b>" + primo.m.n + "</b> in the model card and verify author, format, quantization and requirements before downloading. To find it: " + modComando(primo.m) + ".");
    passi.push("Start with a reduced context if memory is limited. Enable GPU offload only if runtime, drivers and backend support the card.");
    passi.push("Ask a test question and compare the answer with what you would get from a cloud service: if it is enough, you are done.");
  } else {
    passi.push("Check whether the motherboard supports a RAM upgrade and compare the requirements of the smallest model.");
    passi.push("Try an alternative system only if it is supported by CPU, peripherals and runtime; real usage depends on the configuration.");
  }
  passi.push("If you want a comparison between LM Studio and Ollama for your case, there is a <a href='../ollama-vs-lm-studio/'>dedicated page</a>.");

  $("modEsito").innerHTML = box + schede + esclusi +
    '<h3 style="margin-top:24px">What to do now</h3><ol class="steps">' +
    passi.map(function(p){ return "<li>" + p + "</li>"; }).join("") + "</ol>" +
    '<div class="paginv" style="margin-top:22px">' +
    '<a href="../#calcolatore"><b>🖥️ Calculator</b><span>The full verdict about your machine</span></a>' +
    '<a href="../lm-studio-old-pc/"><b>🤖 LM Studio on an old PC</b><span>The exact settings for your PC</span></a>' +
    "</div>";
}

/* The full catalog table: one row per model,
   with the state calculated on the currently selected machine. */
function modTabella(){
  const ram = Number($("mRam").value);
  const cpu = cerca(DB_CPU, $("mCpu").value) || cerca(DB_CPU, "Core i5-4460 (Haswell)");
  let gpu = cerca(DB_GPU, $("mGpu").value) || DB_GPU.ig[0];
  const apple = /^Apple/.test(cpu.n);
  let so = $("mSo").value;
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("mSo").value = so;
  const linux = so === "linux";
  const ramUtile = Math.max(0.4, ram - (linux ? 1.2 : so === "mac" ? 3 : 2.4));
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — unified memory", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }
  const vram = gpu.v || 0;

  $("catTabella").innerHTML = DB_MODELLI
    .slice()
    .sort(function(a, b){ return b.p - a.p; })
    .map(function(m){
      const v = valuta(m, ramUtile, vram, cpu.sc);
      return "<tr><td><b>" + m.n + '</b></td><td>' + m.t + '</td><td class="num">' + db_param(m.p) + "</td>" +
        '<td class="num">' + db_num(m.dim) + " GB</td><td class=\"num\">" + db_num(m.ram) + " GB</td>" +
        "<td>" + cpuEtichetta(m.mc) + "</td><td>" + m.d + " " + PILL[v.stato] + "</td></tr>";
    }).join("");
}

function modAzzera(){
  $("mRam").value = 8;
  popolaOptgroup($("mCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("mGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  $("mUso").value = "Text";
  $("mSo").value = "win";
  $("modEsito").innerHTML = "";
  modTabella();
}

document.addEventListener("DOMContentLoaded", function(){
  document.querySelectorAll(".numeroModelli").forEach(function(el){ el.textContent = DB_MODELLI.length; });
  popolaSel($("mRam"), RAM_VALS, " GB", 8);
  popolaOptgroup($("mCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("mGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  modTabella();
  $("mCpu").addEventListener("change", function(){
    const cpu = cerca(DB_CPU, $("mCpu").value);
    if (/^Apple/.test(cpu ? cpu.n : "")) $("mSo").value = "mac";
    else if ($("mSo").value === "mac") $("mSo").value = "win";
    modTabella();
  });
});
["mRam", "mCpu", "mGpu", "mUso", "mSo"].forEach(function(id){
  const el = $(id);
  if (el) el.addEventListener("change", modTabella);
});