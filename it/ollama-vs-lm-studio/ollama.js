/* ============================================================
   ollama.js — quale dei due usare sul tuo PC
   Riusa ../db.js per coerenza col resto del sito: la memoria
   che calcola qui è la stessa che calcola il calcolatore.
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

/* Il consumo di memoria varia con versione, sistema, modello e
   impostazioni: qui confrontiamo gli usi e i requisiti, non valori
   di RAM fissi non riproducibili. */
const OV_COSTO = {
  ollama: {
    nome: "Ollama",
    porta: "11434",
    uso: "Terminale, API e servizio locale"
  },
  lmstudio: {
    nome: "LM Studio",
    porta: "1234",
    uso: "Interfaccia grafica e gestione dei modelli"
  }
};

const OV_USO = {
  chat: {
    nome: "chattare e scrivere",
    serve: "lmstudio",
    nota: "LM Studio offre un'interfaccia grafica per cercare, scaricare e avviare modelli; la quantità di RAM usata dall'app varia con versione e sessione."
  },
  api: {
    nome: "collegare altri programmi",
    serve: "ollama",
    nota: "Entrambi offrono un server locale. Controlla la documentazione e il formato API richiesto dal programma che vuoi collegare."
  },
  server: {
    nome: "servire modelli ai PC di casa",
    serve: "ollama",
    nota: "Ollama può essere configurato per accettare richieste sulla rete locale. Prima di esporlo, limita l'accesso ai dispositivi fidati e verifica le impostazioni di rete e sicurezza."
  },
  prova: {
    nome: "provare senza impegni",
    serve: "lmstudio",
    nota: "LM Studio propone una libreria di modelli, ma disponibilità, formato e requisiti cambiano: controlla la scheda del modello prima del download."
  }
};

function ovScegli(){
  const ram = Number($("oRam").value);
  const cpu = cerca(DB_CPU, $("oCpu").value);
  let gpu = cerca(DB_GPU, $("oGpu").value) || DB_GPU.ig[0];
  let so = $("oSo").value;
  const uso = OV_USO[$("oUso").value];

  if (!cpu){ $("ovEsito").innerHTML = '<div class="callout errore">Scegli un processore.</div>'; return; }

  const apple = /^Apple/.test(cpu.n);
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("oSo").value = so;
  const linux = so === "linux";
  const overhead = linux ? 1.2 : so === "mac" ? 3 : 2.4;
  const ramUtile = Math.max(0.4, ram - overhead);
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — memoria unificata", v: ramUtile, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }

  const lmCompatibile = cpu.arm || cpu.avx >= 2;
  const RIF = DB_MODELLI.filter(function(m){
    return m.f === "Qwen" && /^Qwen2\.5 7B/.test(m.n);
  })[0] || DB_MODELLI.filter(function(m){ return m.p >= 7 && m.p <= 8 && m.t === "Testo"; })[0];
  const modelloRam = RIF ? RIF.ram : 5.0;
  const scelta = uso.serve;
  const c = OV_COSTO[scelta];
  const stato = !cpu.arm && cpu.avx < 2;
  const memoria = ramUtile >= modelloRam
    ? "Il budget indicativo dopo una riserva per sistema e applicazioni raggiunge la stima del catalogo per il modello; verifica la memoria effettivamente libera prima di caricarlo."
    : "Il budget indicativo dopo la riserva per sistema e applicazioni è inferiore alla stima del catalogo. Prova una taglia più piccola e controlla i requisiti effettivi del runtime.";
  const gpuNota = gpu.unificata
    ? " Su Apple Silicon la GPU usa memoria unificata condivisa con sistema e app; l'accelerazione dipende dal modello e dal runtime."
    : gpu.v
    ? " GPU selezionata: " + gpu.n + ". La VRAM può aiutare solo se runtime, driver e backend supportano la scheda; non la sommo automaticamente alla RAM."
    : " La GPU selezionata è integrata o assente: il calcolo non presume accelerazione grafica.";
  const cpuNota = stato
    ? " Questa CPU non indica AVX2. Per Windows x64 LM Studio lo indica tra i requisiti; il pacchetto Linux x64 lo include per impostazione predefinita. Ollama dispone di runner CPU differenti, ma la compatibilità varia con versione, build e backend: va verificata."
    : " Verifica comunque requisiti del runtime e supporto del backend per il modello e la GPU scelti.";
  const titolo = uso.serve === "lmstudio" && !lmCompatibile
    ? "Verifica la compatibilità CPU prima di installare LM Studio"
    : "Per " + uso.nome + " puoi partire da " + c.nome;
  const box = '<div class="callout ' + (stato ? "attenzione" : "ok") + '"><h3>' + titolo + "</h3><p>" +
    "Hai indicato <b>" + ram + " GB di RAM</b> e " + (so === "mac" ? "macOS" : linux ? "Linux" : "Windows") + ". " +
    (RIF ? "Come riferimento, il catalogo stima circa <b>" + db_num(modelloRam) + " GB</b> per " + RIF.n + " con contesto da 2048 token; il valore reale cambia con formato, contesto e runtime. " : "") +
    memoria + gpuNota + cpuNota + " " + uso.nota + "</p></div>";

  const righe = Object.keys(OV_COSTO).map(function(k){
    const x = OV_COSTO[k];
    const compat = k === "lmstudio" && !lmCompatibile
      ? "AVX2 indicato per Windows x64; verifica build Linux"
      : k === "ollama" && stato
        ? "Runner CPU da verificare per questa CPU/build"
        : "Verifica i requisiti della versione corrente";
    return "<tr><td><b>" + x.nome + "</b></td><td>" + x.uso + "</td><td>" + compat + "</td><td>" +
      (k === "ollama" ? "API locale (11434)" : "Server locale (1234)") + "</td></tr>";
  }).join("");
  const tabella = '<h3 style="margin-top:22px">Confronto sul tuo PC</h3><div class="tablewrap"><table class="cmp"><thead><tr><th>Strumento</th><th>Uso tipico</th><th>Compatibilità da controllare</th><th>API locale</th></tr></thead><tbody>' +
    righe + "</tbody></table></div><div class=\"nota\">Il consumo di RAM cambia con il sistema, l'applicazione, il modello e le impostazioni. La dimensione del file non coincide con la memoria richiesta. Anche la permanenza del modello in RAM dipende dalle impostazioni di scaricamento automatico: puoi controllare i modelli attivi con <code>ollama ps</code> e scaricarli con <code>ollama stop</code>.</div>";

  const passi = scelta === "lmstudio" ? [
    "Consulta i <a href='https://lmstudio.ai/docs/app/system-requirements' target='_blank' rel='noopener'>requisiti di sistema di LM Studio</a> e scarica la versione adatta alla tua CPU.",
    "Scegli il modello in base a RAM libera, quantizzazione e compito; inizia con una taglia ridotta se non conosci il margine disponibile.",
    "Avvia il modello e controlla il consumo di memoria. Se ti serve l'API, abilita Local Server e usa l'indirizzo mostrato dall'app."
  ] : [
    "Consulta i requisiti correnti e installa <a href='https://ollama.com/download' target='_blank' rel='noopener'>Ollama</a> per il tuo sistema.",
    "Scegli un modello compatibile con CPU e memoria libera. Per una prova puoi usare <code>ollama run qwen2.5:7b</code>; taglia e requisiti effettivi dipendono dal modello scaricato.",
    "Per controllare i modelli attivi usa <code>ollama ps</code>; per scaricarne uno dalla memoria usa <code>ollama stop nome-modello</code>. Verifica accelerazione e backend nella documentazione corrente."
  ];
  if (stato) passi.unshift("Prima di scaricare modelli, verifica le istruzioni richieste dal runtime. Per Windows x64 LM Studio indica AVX2; Ollama usa runner diversi, ma la compatibilità della build va controllata e non è garantita.");
  passi.push("Per confrontare taglie e requisiti consulta il <a href='../migliori-modelli-ai-locali/'>catalogo</a> e la scheda tecnica del modello.");

  $("ovEsito").innerHTML = box + tabella + '<h3 style="margin-top:24px">Cosa fare adesso</h3><ol class="steps">' +
    passi.map(function(p){ return "<li>" + p + "</li>"; }).join("") +
    '</ol><div class="paginv" style="margin-top:22px"><a href="../lm-studio-pc-vecchio/"><b>🤖 LM Studio su PC</b><span>Requisiti e impostazioni</span></a><a href="../migliori-modelli-ai-locali/"><b>📚 Modelli AI</b><span>Taglie e formati</span></a><a href="../#calcolatore"><b>🖥️ Calcolatore</b><span>Il quadro completo del PC</span></a></div>';
}

function ovAzzera(){
  $("oRam").value = 8;
  popolaOptgroup($("oCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("oGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
  $("oSo").value = "win";
  $("oUso").value = "chat";
  $("ovEsito").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function(){
  popolaSel($("oRam"), RAM_VALS, " GB", 8);
  popolaOptgroup($("oCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("oGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
  $("oCpu").addEventListener("change", function(){
    const cpu = cerca(DB_CPU, $("oCpu").value);
    if (/^Apple/.test(cpu ? cpu.n : "")) $("oSo").value = "mac";
    else if ($("oSo").value === "mac") $("oSo").value = "win";
  });
});
