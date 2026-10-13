/* ============================================================
   ollama.js — which of the two to use on your PC
   Reuses ../db.js for consistency with the rest of the site:
   the memory calculated here is the same one the calculator uses.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64];

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

/* Memory usage varies with version, system, model and settings:
   here we compare usage and requirements, not fixed RAM values
   that cannot be reproduced. */
const OV_COSTO = {
  ollama: {
    nome: "Ollama",
    porta: "11434",
    uso: "Terminal, API, and local service"
  },
  lmstudio: {
    nome: "LM Studio",
    porta: "1234",
    uso: "Graphical interface and model management"
  }
};

const OV_USO = {
  chat: {
    nome: "chatting and writing",
    serve: "lmstudio",
    nota: "LM Studio offers a graphical interface for finding, downloading and starting models; the amount of RAM used by the app varies with version and session."
  },
  api: {
    nome: "connecting other programs",
    serve: "ollama",
    nota: "Both offer a local server. Check the documentation and the API format required by the program you want to connect."
  },
  server: {
    nome: "serving models to the PCs at home",
    serve: "ollama",
    nota: "Ollama can be configured to accept requests on the local network. Before exposing it, limit access to trusted devices and check the network and security settings."
  },
  prova: {
    nome: "trying it without commitment",
    serve: "lmstudio",
    nota: "LM Studio proposes a model library, but availability, format and requirements change: check the model page before downloading."
  }
};

function ovScegli(){
  const ram = Number($("oRam").value);
  const cpu = cerca(DB_CPU, $("oCpu").value);
  let gpu = cerca(DB_GPU, $("oGpu").value) || DB_GPU.ig[0];
  let so = $("oSo").value;
  const uso = OV_USO[$("oUso").value];

  if (!cpu){ $("ovEsito").innerHTML = '<div class="callout errore">Choose a processor.</div>'; return; }

  const apple = /^Apple/.test(cpu.n);
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("oSo").value = so;
  const linux = so === "linux";
  const overhead = linux ? 1.2 : so === "mac" ? 3 : 2.4;
  const ramUtile = Math.max(0.4, ram - overhead);
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — unified memory", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }

  const lmCompatibile = cpu.arm || cpu.avx >= 2;
  const RIF = DB_MODELLI.filter(function(m){
    return m.f === "Qwen" && /^Qwen2\.5 7B/.test(m.n);
  })[0] || DB_MODELLI.filter(function(m){ return m.p >= 7 && m.p <= 8 && m.t === "Text"; })[0];
  const modelloRam = RIF ? RIF.ram : 5.0;
  const scelta = uso.serve;
  const c = OV_COSTO[scelta];
  const stato = !cpu.arm && cpu.avx < 2;
  const memoria = ramUtile >= modelloRam
    ? "The indicative budget after a reserve for system and applications reaches the catalog estimate for the model; check the memory actually free before loading it."
    : "The indicative budget after the reserve for system and applications is below the catalog estimate. Try a smaller size and check the actual requirements of the runtime.";
  const gpuNota = gpu.unificata
    ? " On Apple Silicon the GPU uses unified memory shared with the system and apps; acceleration depends on the model and runtime."
    : gpu.v
    ? " Selected GPU: " + gpu.n + ". VRAM can help only if runtime, driver and backend support the card; I do not add it to RAM automatically."
    : " The selected GPU is integrated or absent: the calculation does not assume graphics acceleration.";
  const cpuNota = stato
    ? " This CPU does not advertise AVX2. For Windows x64 LM Studio lists it among the requirements; the Linux x64 package includes it by default. Ollama provides different CPU runners, but compatibility varies with version, build and backend: it must be verified."
    : " In any case, verify the runtime requirements and backend support for the chosen model and GPU.";
  const titolo = uso.serve === "lmstudio" && !lmCompatibile
    ? "Check CPU compatibility before installing LM Studio"
    : "For " + uso.nome + " you can start with " + c.nome;
  const box = '<div class="callout ' + (stato ? "attenzione" : "ok") + '"><h3>' + titolo + "</h3><p>" +
    "You indicated <b>" + ram + " GB of RAM</b> and " + (so === "mac" ? "macOS" : linux ? "Linux" : "Windows") + ". " +
    (RIF ? "As a reference, the catalog estimates around <b>" + db_num(modelloRam) + " GB</b> for " + RIF.n + " with a 2048-token context; the actual value changes with format, context and runtime. " : "") +
    memoria + gpuNota + cpuNota + " " + uso.nota + "</p></div>";

  const righe = Object.keys(OV_COSTO).map(function(k){
    const x = OV_COSTO[k];
    const compat = k === "lmstudio" && !lmCompatibile
      ? "AVX2 listed for Windows x64; check Linux build"
      : k === "ollama" && stato
        ? "CPU runner to verify for this CPU/build"
        : "Check the requirements of the current version";
    return "<tr><td><b>" + x.nome + "</b></td><td>" + x.uso + "</td><td>" + compat + "</td><td>" +
      (k === "ollama" ? "Local API (11434)" : "Local server (1234)") + "</td></tr>";
  }).join("");
  const tabella = '<h3 style="margin-top:22px">Comparison on your PC</h3><div class="tablewrap"><table class="cmp"><thead><tr><th>Tool</th><th>Typical use</th><th>Compatibility to check</th><th>Local API</th></tr></thead><tbody>' +
    righe + "</tbody></table></div><div class=\"nota\">RAM usage changes with the system, the app, the model and the settings. File size does not match the memory required. How long the model stays in RAM also depends on the automatic unload settings: you can check the active models with <code>ollama ps</code> and unload them with <code>ollama stop</code>.</div>";

  const passi = scelta === "lmstudio" ? [
    "Check the <a href='https://lmstudio.ai/docs/app/system-requirements' target='_blank' rel='noopener'>LM Studio system requirements</a> and download the version suited to your CPU.",
    "Choose the model based on free RAM, quantization and task; start with a smaller size if you do not know the available margin.",
    "Start the model and check memory usage. If you need the API, enable Local Server and use the address shown by the app."
  ] : [
    "Check the current requirements and install <a href='https://ollama.com/download' target='_blank' rel='noopener'>Ollama</a> for your system.",
    "Choose a model compatible with your CPU and free memory. For a trial you can use <code>ollama run qwen2.5:7b</code>; size and actual requirements depend on the model downloaded.",
    "To check the active models use <code>ollama ps</code>; to unload one from memory use <code>ollama stop model-name</code>. Check acceleration and backend in the current documentation."
  ];
  if (stato) passi.unshift("Before downloading models, verify the instructions required by the runtime. For Windows x64 LM Studio lists AVX2; Ollama uses different runners, but build compatibility must be checked and is not guaranteed.");
  passi.push("To compare sizes and requirements check the <a href='../migliori-modelli-ai-locali/'>catalog</a> and the model data sheet.");

  $("ovEsito").innerHTML = box + tabella + '<h3 style="margin-top:24px">What to do now</h3><ol class="steps">' +
    passi.map(function(p){ return "<li>" + p + "</li>"; }).join("") +
    '</ol><div class="paginv" style="margin-top:22px"><a href="../lm-studio-pc-vecchio/"><b>🤖 LM Studio on PC</b><span>Requirements and settings</span></a><a href="../migliori-modelli-ai-locali/"><b>📚 AI Models</b><span>Sizes and formats</span></a><a href="../#calcolatore"><b>🖥️ Calculator</b><span>The complete PC picture</span></a></div>';
}

function ovAzzera(){
  $("oRam").value = 8;
  popolaOptgroup($("oCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("oGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  $("oSo").value = "win";
  $("oUso").value = "chat";
  $("ovEsito").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function(){
  popolaSel($("oRam"), RAM_VALS, " GB", 8);
  popolaOptgroup($("oCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("oGpu"), DB_GRUPPI_GPU, DB_GPU, "Integrated graphics only / no GPU");
  $("oCpu").addEventListener("change", function(){
    const cpu = cerca(DB_CPU, $("oCpu").value);
    if (/^Apple/.test(cpu ? cpu.n : "")) $("oSo").value = "mac";
    else if ($("oSo").value === "mac") $("oSo").value = "win";
  });
});