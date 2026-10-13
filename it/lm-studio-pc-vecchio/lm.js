/* ============================================================
   lm.js — configuratore di LM Studio per PC datati
   Usa lo stesso database del calcolatore principale (../db.js)
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

/* Valore iniziale del contesto, basato su fasce indicative di RAM utile. */
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
    chat:       { q: "Q4_K_M", t: "Testo", nota: "Q4_K_M è una quantizzazione comune; qualità, memoria e velocità dipendono dal modello e dal compito." },
    scrittura:  { q: "Q4_K_M", t: "Testo", nota: "Confronta quantizzazioni diverse sul testo che vuoi scrivere; formati più grandi possono richiedere più memoria." },
    codice:     { q: "Q4_K_M", t: "Codice", nota: "Valuta un modello addestrato per il codice e prova un esempio del tuo lavoro prima di sceglierlo." },
    documenti:  { q: "Q4_K_M", t: "Testo", nota: "Per analizzare documenti, verifica supporto dei file, contesto e memoria nella versione del runtime che userai." }
  }[uso];
}

function lmConfigura(){
  const ram = Number($("lRam").value);
  const cpu = cerca(DB_CPU, $("lCpu").value);
  let gpu = cerca(DB_GPU, $("lGpu").value) || DB_GPU.ig[0];
  const disco = $("lDisco").value;
  const uso = $("lUso").value;
  if (!cpu){ $("lmEsito").innerHTML = '<div class="callout errore">Scegli un processore.</div>'; return; }

  const apple = /^Apple/.test(cpu.n);
  let so = $("lSo").value;
  if (apple) so = "mac";
  else if (so === "mac") so = "win";
  $("lSo").value = so;
  if (apple){
    const base = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };
    gpu = { n: "Apple Silicon — memoria unificata", v: 0, x: base[cpu.n] || 30, z: 1, vend: "Apple", unificata: 1 };
  }

  const score = db_punteggioPc(ram, cpu);
  /* Budget semplificato per sistema e applicazioni; verifica la RAM libera reale. */
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

  /* Modello consigliato: il più grande che entra in memoria con una CPU
     abbastanza veloce, privilegiando la specializzazione giusta.
     Se c'è una GPU dedicata, si preferisce il più grande che ci sta
     PER INTERO: il vantaggio dell'offload dipende da scheda, modello,
     backend e driver; la sola VRAM non permette di stimare un fattore fisso. */
  let scelto = null;
  if (!lmBloccato) {
    // un modello che sta in VRAM non ha bisogno della stessa RAM di sistema:
    // la memoria video è fisicamente separata, e serve solo alla cache
    const bonusVram = !apple && gpu.v >= 4 ? gpu.v : 0;
    const utili = m => cpu.sc >= m.mc && (m.ram <= utile || (bonusVram && m.dim <= gpu.v && m.ram <= utile + bonusVram));
    const specializzati = m => db_hasCompito(m, cfg.t) || (cfg.t === "Testo" && db_hasCompito(m, "Visione"));
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

  /* --- verdetto di apertura --- */
  let verdetto;
  if (lmBloccato) {
    const motivoCpu = cpu.b32 === 1
      ? "Il profilo indica una CPU a 32 bit, mentre LM Studio richiede una piattaforma x64 o ARM64 supportata."
      : archIncerta
        ? "Il profilo non permette di confermare l'architettura x64 richiesta da questa installazione."
        : "Per Windows x64 i requisiti ufficiali indicano AVX2, che questo profilo CPU non ha.";
    verdetto = '<div class="callout errore"><h3>Compatibilità CPU da verificare</h3><p><b>' +
      cpu.n + "</b>: " + motivoCpu + " " +
      "Reinstallare non aggiunge istruzioni alla CPU. Puoi controllare una build o un runtime alternativo, senza garanzia di compatibilità, " +
      "oppure usare questo PC come client per un modello che gira su un'altra macchina della rete.</p></div>";
  } else if (ram < 4) {
    verdetto = '<div class="callout attenzione"><h3>Memoria molto limitata</h3><p>Con ' + ram +
      " GB la memoria può non bastare per sistema, runtime, modello e contesto. Prova solo una taglia molto piccola e controlla la memoria libera; un aumento della RAM può ampliare le opzioni, se il PC lo supporta.</p></div>";
  } else if (apple) {
    verdetto = '<div class="callout ok"><h3>Apple Silicon usa memoria unificata</h3><p>La GPU integrata e macOS condividono la memoria indicata come RAM. La stima riserva una parte per il sistema e le applicazioni; controlla la memoria libera reale e il supporto del modello in LM Studio.</p></div>';
  } else if (gpu.v >= 12) {
    verdetto = '<div class="callout ok"><h3>La GPU può aiutare</h3><p><b>' + gpu.n +
      "</b> ha " + gpu.v + " GB di VRAM. Se runtime e backend supportano la scheda, puoi assegnare alla GPU parte dei layer del modello; il guadagno dipende da modello, driver, contesto e memoria libera.</p></div>";
  } else if (ram >= 16) {
    verdetto = '<div class="callout ok"><h3>Configurazione buona</h3><p>Con ' + ram +
      " GB di RAM puoi valutare modelli di dimensioni diverse, dopo aver considerato sistema operativo, contesto e programmi aperti. Le prestazioni dipendono molto da CPU e runtime.</p></div>";
  } else if (ram >= 8) {
    verdetto = '<div class="callout ok"><h3>Puoi provare modelli di più taglie</h3><p>Con ' + ram +
      " GB di RAM puoi valutare anche alcuni modelli quantizzati da 7-8 miliardi. Margine e prestazioni dipendono da file, contesto, sistema operativo e applicazioni aperte: controlla quanta memoria resta libera.</p></div>";
  } else if (ram >= 4) {
    verdetto = '<div class="callout attenzione"><h3>Funziona, ma restano pochi modelli</h3><p>Con ' + ram +
      " GB conviene iniziare da modelli piccoli e controllare memoria e contesto richiesti dalla loro scheda. Un modello più grande può non lasciare RAM sufficiente al sistema.</p></div>";
  } else {
    verdetto = '<div class="callout attenzione"><h3>Al limite</h3><p>Con ' + ram +
      " GB di RAM il budget semplificato stima " + db_num(utile) + " GB disponibili dopo una riserva per il sistema. Puoi provare un modello molto piccolo, ad esempio <b>Qwen3 0.6B</b> o <b>Llama 3.2 1B</b>, con contesto ridotto e controllando la memoria reale. Se il PC lo permette, più RAM può ampliare le opzioni; verifica tipo e capacità supportati.</p></div>";
  }

  /* --- impostazioni --- */
  let offload = "0 (tutto su CPU)";
  let offloadNote = "Nessuna GPU con VRAM: il modello gira in RAM di sistema, e la CPU fa anche l'inferenza.";
  if (apple) {
    offload = "Metal · memoria unificata";
    offloadNote = "La memoria per sistema, app e modello è condivisa; l'accelerazione dipende dal modello e dal runtime.";
  } else if (gpu.v) {
    if (!scelto) {
      offload = "Da verificare nel runtime";
      offloadNote = "La VRAM da sola non basta a stimare un numero di layer: serve un modello compatibile e spazio per contesto, cache e buffer.";
    } else if (gpu.v >= scelto.dim) {
      offload = "GPU da provare";
      offloadNote = "La capacità potrebbe bastare per i pesi stimati, ma il contesto, la cache e i buffer richiedono margine. Verifica l'offload e il backend nel runtime.";
    } else {
      offload = "Parziale, da provare";
      offloadNote = "La VRAM è inferiore alla dimensione stimata dei pesi. Il runtime può distribuire il modello tra GPU e RAM se il backend lo supporta; controlla l'uso reale.";
    }
  }
  if (lmBloccato) { offload = "— da verificare"; offloadNote = "Controlla prima architettura CPU e requisiti della piattaforma; la GPU non rimuove un requisito CPU."; }

  out.push(verdetto);
  if (noAvx2 && !lmBloccato)
    out.push('<div class="callout attenzione"><b>Compatibilità Linux:</b> il pacchetto x64 di LM Studio include AVX2 per impostazione predefinita. La stima dei modelli non conferma che questa CPU possa avviare la build: verifica i requisiti e prova il runtime.</div>');

  /* Senza AVX le impostazioni non hanno senso: mostrarle
     riempirebbe la pagina di numeri inutili. */
  if (lmBloccato){
    out.push('<ol class="steps">' +
      "<li><b>Verifica il runtime prima di installare</b><div class=\"sm\">Per Windows x64 LM Studio indica AVX2 nei requisiti; su Linux x64 il pacchetto include AVX2 per impostazione predefinita. Il profilo selezionato, <b>" +
      cpu.n + "</b>, non indica AVX2: controlla se la build scelta è compatibile. Un runtime alternativo può avere requisiti diversi.</div></li>" +
      "<li><b>Decidi cosa vuoi fare del PC</b><div class=\"sm\">Puoi cercare un runtime mantenuto e compatibile con le istruzioni disponibili, oppure usare il PC come client per un modello remoto, " +
      '<a href="../ollama-vs-lm-studio/">Ollama</a>.</div></li>' +
      "</ol>" +
      '<div class="nota">Se non sei sicuro che il tuo processore sia davvero senza AVX, <a href="../#calcolatore">fai il calcolo completo</a> ' +
      "oppure consulta la <a href='../linux-per-pc-datati/'>guida a Linux per PC datati</a>: su hardware di questo livello il sistema operativo è la scelta che conta più di tutto il resto.</div>");
    $("lmEsito").innerHTML = out.join("");
    return;
  }

  out.push('<h3 style="margin-top:22px">Impostazioni da mettere nel riquadro del modello</h3><div class="distro">' +
    riga("Modello consigliato",
      scelto ? db_param(scelto.p) : "—",
      scelto ? "<b>" + scelto.n + "</b> — " + scelto.d + " (file stimato " + db_num(scelto.dim) + " GB; fabbisogno di RAM stimato " + db_num(scelto.ram) + " GB)." : "La stima non trova modelli adatti in memoria. Prova una taglia più piccola o valuta un runtime remoto.") +
    riga("Quantizzazione", cfg.q, cfg.nota) +
    riga("GPU Offload", offload, offloadNote) +
    riga("Context Length", contesto + " token",
      "Valore iniziale indicativo: il contesto usa memoria aggiuntiva e il consumo dipende da modello e runtime. Se la memoria è al limite, riducilo e controlla il comportamento reale.") +
    riga("Thread da usare", cpu.t, "Il numero ottimale dipende da modello, runtime e carico. Prova il valore predefinito e confrontalo con il numero di thread logici.") +
    "</div>");

  /* --- riga pratica sul disco e sulla RAM --- */
  const tempoCaricamento = disco === "hdd" ? "in genere più lento"
    : disco === "nvme" ? "in genere più rapido"
    : "dipende dal modello";
  const modelloRiga = scelto || { p: 8, dim: 4.9 };
  /* Se nessun modello entra in memoria la velocità mostrata è quella
     teorica di un 8B: va scritto, altrimenti sembra riferita al tuo PC. */
  const notaVel = scelto
    ? ((apple || (gpu.v && gpu.v >= modelloRiga.dim))
        ? (apple ? "Stima con accelerazione Apple; il risultato dipende da modello, memoria libera, sistema e versione del runtime." : "La VRAM può contenere i pesi stimati, ma contesto, cache e buffer richiedono ulteriore memoria. La velocità dipende da scheda e backend.")
        : "Stima calcolata sulla CPU; la sensazione di fluidità dipende anche dal tempo al primo token e dalla lunghezza della risposta.")
    : noAvx2
      ? "La stima di velocità non conferma la compatibilità della CPU con la build LM Studio selezionata."
      : "Con " + db_num(utile) + " GB liberi nessun modello in lista entra: è il valore teorico di un 8B in Q4, utile solo per confrontare PC diversi.";
  out.push('<h3 style="margin-top:24px">Cosa aspettarti</h3><div class="distro">' +
    riga("Velocità su " + db_param(modelloRiga.p) + " in Q4" + (scelto ? "" : " (riferimento)"),
      db_tokRange(db_stimaTok(modelloRiga.p, ctx, modelloRiga.dim)),
      notaVel) +
    riga("Tempo di caricamento", tempoCaricamento,
      disco === "hdd" ? "Un SSD può ridurre i tempi di lettura rispetto a un HDD; controlla interfaccia, formato e compatibilità prima di acquistare." : "Il tempo reale varia con dimensione del modello, disco, runtime e sistema.") +
    riga("RAM da tenere libera", db_num(utile) + " GB",
      utile < 3 ? "Lo spazio è limitato: chiudi le applicazioni non necessarie e riduci il contesto; controlla la memoria libera durante il caricamento." : "La memoria usata dal browser e dalle altre app varia: chiudile se il sistema segnala poca RAM.") +
    "</div>");

  /* --- passi finali --- */
  const passi = [];
  passi.push("Scarica <a href='https://lmstudio.ai/' target='_blank' rel='noopener'>LM Studio</a> e installalo.");
  if (noAvx2) {
    passi.push("Prima di installare, verifica le istruzioni richieste dalla build: AVX2 è indicato per Windows x64 e incluso nel pacchetto Linux x64 predefinito.");
  } else {
    passi.push("Cerca <b>" + (scelto ? scelto.n : "Qwen3 0.6B") + "</b> nella libreria e scegli la versione <b>" + cfg.q + "</b>.");
    passi.push("Scarica <b>un solo modello</b> e aspetta il caricamento prima di fare altro.");
    passi.push("Nel riquadro del modello: GPU Offload <b>" + offload + "</b>, Context Length <b>" + contesto + "</b>, Thread <b>" + cpu.t + "</b>.");
    passi.push("Carica il modello e poni una domanda di prova. Se la risposta ti convince, sei a posto: da qui in poi è questione di abitudine.");
  }
  passi.push("Se vuoi passare a un'interfaccia a finestre per più persone sulla rete, valuta <a href='../ollama-vs-lm-studio/'>Ollama</a> con la sua API.");
  out.push('<h3 style="margin-top:24px">I tuoi prossimi passi</h3><ol class="steps">' +
    passi.map(p => "<li>" + p + "</li>").join("") + "</ol>");

  out.push('<div class="nota">Queste impostazioni sono stime basate su RAM, sistema operativo, processore e scheda grafica che hai indicato. ' +
    "Verifica i requisiti del modello e la memoria libera: temperatura, driver, backend, contesto e raffreddamento possono cambiare molto i risultati. " +
    "Se vuoi il quadro completo sul tuo PC, usa il <a href='../#calcolatore'>calcolatore</a> oppure guarda i <a href='../migliori-modelli-ai-locali/'>modelli per la tua RAM</a>.</div>");

  $("lmEsito").innerHTML = out.join("");
}

function lmAzzera(){
  $("lRam").value = 8;
  $("lDisco").value = "ssd";
  $("lUso").value = "chat";
  $("lSo").value = "win";
  popolaOptgroup($("lCpu"), DB_GRUPPI_CPU, DB_CPU, "Core i5-4460 (Haswell)");
  popolaOptgroup($("lGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
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
  popolaOptgroup($("lGpu"), DB_GRUPPI_GPU, DB_GPU, "Solo grafica integrata / nessuna GPU");
  $("lCpu").addEventListener("change", function(){
    const cpu = cerca(DB_CPU, $("lCpu").value);
    if (/^Apple/.test(cpu ? cpu.n : "")) $("lSo").value = "mac";
    else if ($("lSo").value === "mac") $("lSo").value = "win";
  });

});
