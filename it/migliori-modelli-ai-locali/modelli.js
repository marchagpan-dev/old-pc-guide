/* ============================================================
   modelli.js — catalogo filtrabile per RAM, CPU e uso
   Riusa ../db.js: la stessa base dati del calcolatore, così
   i numeri che vedi qui e quelli che vedi in home coincidono.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];

/* La soglia di CPU che rende il modello "usabile" è nel DB
   (campo mc). Qui serve solo il nome leggibile. */
function cpuEtichetta(sc){
  return "indice interno ≥ " + sc + " (stima)";
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

/* Il tag che Ollama usa davvero per quel modello. Non basta
   ricavarlo dal nome: Ollama chiama "gemma3" quello che tutti
   chiamano Gemma 3, e "llama3.2" tiene il punto. */
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
  /* Nessun tag noto: meglio una ricerca su Hugging Face che un
     comando che fallisce e fa perdere fiducia alla guida. */
  return "";
}
function modComando(m){
  return "cercalo per nome nella <a href='https://ollama.com/library' target='_blank' rel='noopener'>libreria di Ollama</a> o su <a href='https://huggingface.co/models' target='_blank' rel='noopener'>Hugging Face</a>";
}

/* ----------------------------------------------------------------
   FILTRAGGIO
   Due limiti distinti, mai confusi:
   - memoria: il modello deve stare in RAM (o in VRAM)
   - velocità: la CPU deve essere abbastanza veloce
   Un modello può entrare e non essere comunque usabile,
   o essere veloce e non entrare mai.
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
  ok: '<span class="b ok">compatibile nella stima</span>',
  limite: '<span class="b mid">al limite (stima)</span>',
  no: '<span class="b no">requisiti non soddisfatti dalla stima</span>'
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
  if (!cpu){ $("modEsito").innerHTML = '<div class="callout errore">Scegli un processore.</div>'; return; }

  const linux = so === "linux";
  const overhead = linux ? 1.2 : so === "mac" ? 3 : 2.4;
  const ramUtile = Math.max(0.4, ram - overhead);
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — memoria unificata", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }
  const vram = gpu.v || 0;
  const lmNoAvx2 = !cpu.arm && cpu.avx < 2;
  const ctx = { sc: cpu.sc, avx: cpu.avx, mem: cpu.mem, arm: !!cpu.arm, gpu: gpu };
  const usoLabel = { tutti: "tutti i compiti", Testo: "rispondere e scrivere testi", Codice: "programmazione", Ragionamento: "ragionare", Visione: "leggere immagini" }[uso];

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

  /* --- verdetto d'apertura --- */
  let box = "";
  if (utili.length){
    const piuGrande = utili.slice().sort(function(a, b){ return b.m.p - a.m.p; })[0];
    const piuScattante = utili.slice().sort(function(a, b){ return b.vel - a.vel; })[0];
    let classe = "ok", titolo = "";
    if (perfetti.length && ramUtile >= 12){ classe = "ok"; titolo = "La stima trova più modelli entro il budget indicativo"; }
    else if (perfetti.length){ classe = "ok"; titolo = "La stima trova " + perfetti.length + " modelli entro i criteri indicativi"; }
    else { classe = "attenzione"; titolo = "I modelli elencati richiedono una verifica più attenta"; }
    box = '<div class="callout ' + classe + '"><h3>' + titolo + "</h3><p>" +
      "Con " + ram + " GB di RAM" + (so === "mac" ? " su macOS" : linux ? " su Linux" : " su Windows") + " il budget semplificato stima <b>" + db_num(ramUtile) + " GB</b> disponibili dopo una riserva indicativa per il sistema" +
      (apple ? "; RAM e GPU condividono la memoria unificata" : vram ? "; la scheda indica <b>" + vram + " GB di VRAM</b>" : "") + ". " +
      "Per <b>" + usoLabel + "</b>, il modello con più parametri fra quelli ammessi dalla stima è <b>" + piuGrande.m.n + "</b> (" + db_param(piuGrande.m.p) + ", " +
      db_tokRange(piuGrande.vel) + (piuGrande.v.inVram ? (apple ? ", pesi entro la stima di memoria unificata" : ", pesi entro la VRAM stimata") : "") + ")." +
      (piuScattante.m.n !== piuGrande.m.n
        ? " La velocità stimata più alta in questo elenco è per <b>" + piuScattante.m.n + "</b>: " + db_tokRange(piuScattante.vel) + "."
        : "") +
      "</p></div>" + (lmNoAvx2 ? '<div class="callout attenzione"><b>Compatibilità CPU:</b> per Windows x64 LM Studio indica AVX2 nei requisiti; il pacchetto Linux x64 lo include per impostazione predefinita. Ollama e altri runtime possono usare runner diversi: verifica build e istruzioni richieste.</div>' : "");
  } else {
    box = '<div class="callout attenzione"><h3>Nessun modello adatto alla tua configurazione</h3>' +
      "<p>Con " + ram + " GB di RAM e " + cpu.n + " la stima non trova un modello di " + usoLabel +
      " che superi i criteri indicativi. Controlla i requisiti del runtime, la memoria libera e l'architettura CPU; puoi provare un modello più piccolo o usare il PC come client di un servizio remoto.</p></div>";
  }

  /* --- schede dei modelli utilizzabili --- */
  let schede = "";
  if (utili.length){
    schede = '<h3 style="margin-top:22px">' + utili.length + " modelli compatibili secondo la stima" + '</h3><div class="cards">' +
      utili.slice().sort(function(a, b){ return b.m.p - a.m.p; }).map(function(x){
        const m = x.m;
        const velPill = x.v.inVram
          ? '<span class="b ok">' + db_tokRange(x.vel) + (apple ? " (GPU Apple, stima)" : " (GPU, stima)") + "</span>"
          : x.vel >= 8 ? '<span class="b ok">' + db_tokRange(x.vel) + "</span>"
          : x.vel >= 3 ? '<span class="b mid">' + db_tokRange(x.vel) + "</span>"
          : '<span class="b no">' + db_tokRange(x.vel) + "</span>";
        return '<div class="mcard">' +
          '<div class="mf">' + m.t.replace(/ \/ /g, " · ") + " · " + db_param(m.p) + "</div>" +
          "<h3>" + m.n + "</h3>" +
          "<p>" + m.d + "</p>" +
          '<div class="mrow"><span>File <b>' + db_num(m.dim) + " GB</b></span><span>RAM <b>" + db_num(m.ram) + " GB</b></span>" + velPill + "</div>" +
          '<div class="mrow">' + PILL[x.v.stato] + (x.v.inVram ? '<span class="b ok">⚡ ' + (apple ? "memoria unificata" : "VRAM stimata") + "</span>" : "") + "</div>" +
          "</div>";
      }).join("") + "</div>";
  }

  /* --- cosa resta fuori, e perché --- */
  let esclusi = "";
  const fuori = valutati.filter(function(x){ return !x.adatto || x.v.stato === "no"; });
  if (fuori.length){
    esclusi = '<details style="margin-top:20px"><summary>Perché gli altri ' + fuori.length + " modelli non vanno bene qui</summary>" +
      '<div class="tablewrap"><table class="cmp"><thead><tr><th>Modello</th><th>RAM stimata</th><th>Soglia CPU euristica</th><th>Motivo</th></tr></thead><tbody>' +
      fuori.map(function(x){
        let motivo;
        if (x.v.stato === "no"){
          if (x.adatto === false && x.v.entra) motivo = "Non è un modello per " + usoLabel;
          else if (!x.v.veloce && !x.v.entra) motivo = "Stima di memoria e soglia CPU non soddisfatte";
          else if (!x.v.veloce) motivo = "L'indice CPU è sotto la soglia euristica interna";
          else motivo = "La stima richiede " + db_num(x.m.ram) + " GB e il budget calcolato è " + db_num(ramUtile) + " GB";
        } else motivo = "Non è un modello per " + usoLabel;
        return "<tr><td>" + x.m.n + '</td><td class="num">' + db_num(x.m.ram) + " GB</td><td>" +
          cpuEtichetta(x.m.mc) + '</td><td class="c-no">' + motivo + "</td></tr>";
      }).join("") + "</tbody></table></div></details>";
  }

  /* --- i tre passi da fare adesso --- */
  const passi = [];
  if (utili.length){
    const primo = utili.slice().sort(function(a, b){ return b.m.p - a.m.p; })[0];
    passi.push("Cerca <b>" + primo.m.n + "</b> nella scheda del modello e verifica autore, formato, quantizzazione e requisiti prima del download. Per trovarlo: " + modComando(primo.m) + ".");
    passi.push("Inizia con un contesto ridotto se la memoria è limitata. Attiva l'offload GPU solo se runtime, driver e backend supportano la scheda.");
    passi.push("Fai una domanda di prova e confronta la risposta con quella che daresti a un servizio cloud: se ti basta, hai finito.");
  } else {
    passi.push("Verifica se la scheda madre supporta un aggiornamento di RAM e confronta i requisiti del modello più piccolo.");
    passi.push("Prova un sistema alternativo solo se è supportato da CPU, periferiche e runtime; il consumo reale dipende dalla configurazione.");
  }
  passi.push("Se vuoi un confronto fra LM Studio e Ollama per il tuo caso, c'è una <a href='../ollama-vs-lm-studio/'>pagina dedicata</a>.");

  $("modEsito").innerHTML = box + schede + esclusi +
    '<h3 style="margin-top:24px">Cosa fare adesso</h3><ol class="steps">' +
    passi.map(function(p){ return "<li>" + p + "</li>"; }).join("") + "</ol>" +
    '<div class="paginv" style="margin-top:22px">' +
    '<a href="../#calcolatore"><b>🖥️ Calcolatore</b><span>Il verdetto completo sulla tua macchina</span></a>' +
    '<a href="../lm-studio-pc-vecchio/"><b>🤖 LM Studio su PC vecchio</b><span>Le impostazioni esatte per il tuo PC</span></a>' +
    "</div>";
}

/* La tabella completa del catalogo: una riga per modello,
   con lo stato calcolato sulla macchina attualmente selezionata. */
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
    gpu = { n: "Apple Silicon — memoria unificata", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
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
  popolaOptgroup($("mGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
  $("mUso").value = "Testo";
  $("mSo").value = "win";
  $("modEsito").innerHTML = "";
  modTabella();
}

document.addEventListener("DOMContentLoaded", function(){
  document.querySelectorAll(".numeroModelli").forEach(function(el){ el.textContent = DB_MODELLI.length; });
  popolaSel($("mRam"), RAM_VALS, " GB", 8);
  popolaOptgroup($("mCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("mGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
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
