/* ============================================================
   app.js — calcolatore principale di Guida PC Vecchi
   Logica: qui. Dati e formule condivise: db.js
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
let HINT_CPU_BASE = ""; /* testo iniziale di #hintCpu, ripristinato dal reset */
let COMBO_APERTA = null;

/* ============================================================
   1. COMBOBOX (ricerca CPU / GPU)
   ============================================================ */
function Combo(inputId, selectId, listId, noteId, gruppi, fonte, all, tipo, opt){
  opt = opt || {};
  const input = $(inputId), select = $(selectId), list = $(listId), note = $(noteId);
  let items = [];
  let attivo = -1;

  function mappa(){
    // tutte le voci, raggruppate per optgroup
    items = [];
    gruppi.forEach(([etichetta, chiave]) => {
      (fonte[chiave] || []).forEach(p => items.push({
        n: p.n, y: p.y, gruppo: etichetta,
        sub: p.v ? [p.vend, p.v + " GB VRAM", p.y].filter(Boolean).join(" · ")
                 : (p.y ? "nessuna accelerazione per l'AI · " + p.y : "nessuna accelerazione per l'AI")
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
  /* Il messaggio "nessun risultato" sta in un <p> separato: dentro
     una role="listbox" un <li> senza role="option" romperebbe la
     gerarchia ARIA. */
  function apri(filtro){
    if (COMBO_APERTA && COMBO_APERTA !== chiudi) COMBO_APERTA();
    COMBO_APERTA = chiudi;
    const q = filtro === undefined ? "" : filtro;
    let trovati = db_cerca(q, items, tipo);
    /* Correlazione anno ↔ processore: i modelli più vicini all'anno
       del PC salgono in testa, gli altri restano in fondo all'elenco
       (non sparisce nessuna voce, cambia solo l'ordine). */
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
    if (!trovati.length) msg = "Nessuna voce corrisponde a «" + String(q).replace(/[<>&]/g, "") + "»: prova con meno parole o con un altro termine.";
    else {
      const parti = [];
      if (anno && trovati.length > 1)
        parti.push("Ordinati per anno: in testa i processori più vicini al " + anno + " (anno del PC), poi tutti gli altri.");
      if (trovati.length > max)
        parti.push("…e altre " + (trovati.length - max) + " corrispondenze: aggiungi una parola per restringere.");
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
    input.value = nome;          /* la casella fa vedere la scelta fatta */
    chiudi();
    select.dispatchEvent(new Event("change"));
  }
  /* riporta nella casella il valore attualmente selezionato */
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
  /* aggiorna() ridisegna l'elenco solo se è aperto: serve quando
     cambia l'anno del PC, perché l'ordine dipende da quello. */
  return {
    select: select, apri: apri, mostra: mostra,
    aggiorna: function(){ if (input.getAttribute("aria-expanded") === "true") apri(input.value); }
  };
}

/* ============================================================
   2. CORRELAZIONE ANNO ↔ PROCESSORE
   La logica sta in db_annoSync (db.js), così homepage, confronto
   e pagina Linux si comportano allo stesso modo.
   ============================================================ */
let ANNO_PC = null, ANNO_A = null, ANNO_B = null;
/* riferimenti ai menù "cerca e scegli": servono a riflettere la scelta
   nella casella di ricerca (il <select> nativo resta nascosto). */
let COMBO_CPU = null, COMBO_GPU = null;

/* mostra il campo VRAM solo quando si sceglie "Altra scheda". */
function aggiornaVram(){
  const box = $("boxVram");
  if (box) box.hidden = $("gpu").value !== "Altra scheda (inserisco la VRAM)";
}

/* ============================================================
   2. VERDETTI
   ============================================================ */
function setV(id, val, note, cls){
  $("v" + id).className = "vbox " + cls;
  $("v" + id + "Val").textContent = val;
  $("v" + id + "Note").innerHTML = note;
}
function verdictLinux(score, L, anno, ram, cpu, bit32, bitUnknown, utile){
  if (/^Apple/.test(cpu.n))
    return setV("Linux", "➖ Verifica il supporto", "macOS è il percorso nativo per Apple Silicon. Linux richiede una distribuzione compatibile con questo hardware e una verifica separata; questa stima non controlla installabilità o driver. La memoria è unificata: sistema e modello condividono lo stesso spazio.", "warn");
  if (bitUnknown)
    return setV("Linux", "❓ Verifica l'architettura", "Per questo profilo CPU generico non posso stabilire se il processore supporti x86-64. Controlla il modello esatto o la voce «Modalità/istruzioni» con CPU-Z o <code>lscpu</code> prima di scegliere un'immagine Linux a 32 o 64 bit.", "warn");
  if (bit32)
    return setV("Linux", "🟡 Possibile, con verifiche", "Per una CPU x86 a 32 bit le opzioni sono poche. antiX 26.1 offre un'immagine a 32 bit; Debian 12 i386 richiede almeno una CPU i686. Controlla istruzioni richieste, driver e supporto della release, poi prova da USB Live prima di installare.", "warn");
  if (anno <= 2013)
    return setV("Linux", "✅ Sì, può essere una buona scelta", "Windows 10 ha terminato il supporto ordinario il <b>14 ottobre 2025</b>. Nell'Area economica europea alcuni utenti idonei possono aderire gratuitamente agli ESU restando connessi allo stesso account Microsoft; per l'uso con account locale è disponibile un acquisto una tantum. Il programma termina il <b>12 ottobre 2027</b>. La compatibilità con Windows 11 dipende dal modello preciso della CPU e dagli altri requisiti. Linux può essere un'alternativa: prova prima rete, audio, grafica e periferiche da una USB live.", "yes");
  if (score < 50)
    return setV("Linux", "✅ Può aiutare", "Un desktop Linux leggero può lasciare più memoria libera di Windows, ma il consumo reale varia con distribuzione, driver, programmi e aggiornamenti. Se ti interessa l'AI locale, confronta la memoria disponibile sul tuo PC dopo l'avvio.", "yes");
  if (score < 68)
    return setV("Linux", "✅ Può essere utile", "Linux è un'opzione se vuoi un sistema più leggero o preferisci il suo ambiente. Consumi di RAM e tempi di avvio dipendono dall'hardware, dalla configurazione e dai programmi aperti.", "yes");
  return setV("Linux", "🟡 Facoltativa", "Il punteggio non verifica la compatibilità con Windows 11: controlla CPU e requisiti ufficiali. Linux resta un'opzione se preferisci il suo ambiente; prova prima la modalità Live.", "warn");
}
function verdictLM(score, ram, cpu, utile, maxP, gpu, so){
  const gp = gpu && gpu.v > 0;
  if (!cpu.arm && cpu.avx < 2 && so === "linux")
    return setV("LM", "⚠️ Verifica la build Linux", cpu.n + " non risulta avere AVX2. Il pacchetto Linux x64 di LM Studio include AVX2 per impostazione predefinita: controlla la build e i requisiti del runtime prima di installare. Questa stima non può confermare l'avvio su questa CPU.", "warn");
  if (!cpu.arm && cpu.avx < 2)
    return setV("LM", "❌ Requisito CPU non soddisfatto", cpu.n + " non risulta avere AVX2, indicato nei requisiti ufficiali per LM Studio su Windows x64. Una build alternativa può avere requisiti diversi, ma il calcolatore non ne garantisce compatibilità o prestazioni.", "no");
  if (ram < 4)
    return setV("LM", "⚠️ Memoria molto limitata", "Con " + ram + " GB la memoria può non bastare per sistema, runtime, modello e contesto. Il risultato dipende dalla memoria libera, dal modello e dal sistema operativo; prova una taglia molto piccola e controlla il consumo durante il caricamento.", "warn");
  if (utile < 3)
    return setV("LM", "⚠️ Memoria molto limitata", "Il budget semplificato stima " + db_num(utile) + " GB disponibili dopo la riserva per il sistema. Puoi provare un modello molto piccolo, come <b>Qwen3 0.6B</b>, ma controlla la memoria reale e i requisiti del runtime.", "warn");
  if (gpu && gpu.unificata)
    return setV("LM", "✅ Supporto Apple Silicon", gpu.n + ": LM Studio può usare Metal con i modelli supportati. macOS, app e modello condividono la <b>memoria unificata</b>; il budget semplificato stima <b>" + db_num(utile) + " GB</b> disponibili, ma la taglia caricabile dipende dal file, dal contesto e dalle applicazioni aperte.", "yes");
  if (gp && gpu.v >= 12 && utile >= 8)
    return setV("LM", "✅ Buona capacità GPU", gpu.n.split("(")[0].trim() + " ha " + gpu.v + " GB di VRAM. In base alla dimensione del modello, alla quantizzazione e al contesto, potrebbe entrare interamente in memoria video; velocità e compatibilità dipendono anche da GPU, driver e backend.", "yes");
  if (utile < 8)
    return setV("LM", "✅ Puoi provare modelli piccoli e medi", "Con " + db_num(utile) + " GB stimati puoi valutare modelli quantizzati intorno a <b>3-4 miliardi</b> di parametri" +
      (maxP >= 7 ? "; modelli più grandi possono usare molta memoria aggiuntiva o ricorrere allo swap, con forti rallentamenti" : "") + ". Verifica dimensione del file, contesto e memoria libera prima del download.", "yes");
  if (utile < 16)
    return setV("LM", "✅ Sì, con modelli adatti", "Con questa memoria puoi valutare modelli piccoli o medi in Q4; la memoria richiesta cambia con modello, contesto e applicazioni aperte. LM Studio offre interfaccia, cronologia e server API.", "yes");
  return setV("LM", "✅ Più margine per modelli grandi", maxP
    ? "Il budget semplificato stima <b>" + db_num(utile) + " GB</b> disponibili. Tra i modelli del catalogo, la taglia più grande ammessa dai criteri interni è <b>" + db_param(maxP) + "</b> in Q4_K_M; controlla file, contesto e memoria libera."
    : "La memoria stimata lascia più margine, ma controlla i requisiti dei modelli e del runtime prima di scaricarli.", "yes");
}
function verdictWin(ram, cpu){
  /* Esito preliminare riferito a Windows 11 25H2: qui raccogliamo solo
     processore e memoria.
     Microsoft chiede inoltre TPM 2.0, Secure Boot, firmware UEFI, almeno
     64 GB di disco e una scheda video compatibile: nessuno di questi
     dati viene misurato, quindi non presentiamo mai il risultato come
     un controllo completato. La CPU la verifichiamo con la lista
     ufficiale 25H2 (cpu.w11), non con l'anno: l'i5-8400 è del 2017 ed è
     supportato, il Ryzen 1000 del 2017 no. */
  if (/^Apple/.test(cpu.n))
    return setV("Win", "➖ Solo in VM", "Su Apple Silicon Windows 11 non è nativo: gira solo in macchina virtuale (Parallels/UTM). Per l'AI locale conviene restare su macOS.", "warn");
  if (cpu.manual || cpu.w11 === null)
    return setV("Win", "❓ Verifica il modello esatto", "La compatibilità della CPU va controllata nella lista Microsoft di Windows 11 25H2 per il modello preciso; generazione e anno da soli non bastano. Il minimo ufficiale di RAM è <b>4 GB</b>. Servono inoltre CPU compatibile, TPM 2.0, firmware UEFI con Secure Boot, 64 GB di spazio e grafica compatibile.", "warn");
  if (cpu.w11 !== 1)
    return setV("Win", "❌ Non risulta supportato", "Questo modello CPU non risulta nella lista Microsoft consultata. La compatibilità è per modello, non per anno o generazione; controlla la lista aggiornata e l'app Controllo integrità PC. Su installazioni non supportate Microsoft non garantisce aggiornamenti né supporto.", "no");
  if (ram < 4)
    return setV("Win", "❌ Sotto il minimo", "Il processore è nella lista ufficiale per Windows 11 25H2, ma con <b>" + ram + " GB</b> sei sotto il <b>minimo ufficiale di 4 GB</b>: Windows 11 non si installa. E per l'AI locale non sarebbero comunque bastati.", "no");
  if (ram < 8)
    return setV("Win", "⚠️ Minimo rispettato", "CPU presente nella lista ufficiale di Windows 11 25H2 e <b>" + ram + " GB</b> ≥ 4 GB, quindi il minimo di installazione è raggiunto: <b>8 GB</b> però è la soglia consigliata. Restano da controllare <b>TPM 2.0</b>, <b>Secure Boot</b>, firmware <b>UEFI</b>, <b>64 GB</b> di disco e scheda video.", "warn");
  return setV("Win", "✅ Supportato (preliminare)", "Processore presente nella lista ufficiale di Windows 11 25H2 e <b>" + ram + " GB</b> di RAM. Attenzione: è un esito <b>preliminare</b>, perché qui controllo <b>solo</b> CPU e memoria. Restano da verificare <b>TPM 2.0</b>, <b>Secure Boot</b>, firmware <b>UEFI</b>, <b>64 GB</b> di disco e scheda video (Impostazioni → Windows Update → Sicurezza).", "yes");
}

/* ============================================================
   3. ANALISI (usata sia dal calcolatore sia dal confronto)
   ============================================================ */
/* Un solo budget di memoria per tutto il sito: quanto sistema operativo
   si tiene indietro. Stesso valore usato per la RAM utile e (sulle
   macchine Apple, dove non esiste una VRAM separata) per ciò che può
   usare il modello in memoria unificata. */
function overheadOs(so){
  return so === "linux" ? 1.2 : so === "mac" ? 3 : 2.4;
}
function nomeOs(so){
  return so === "linux" ? "Linux leggero" : so === "mac" ? "macOS" : "Windows";
}
/* Con un processore Apple la scelta corretta è macOS: se il menu dice
   ancora Windows o Linux lo allineiamo, così i verdetti e il budget di
   memoria parlano della macchina giusta. */
function soApple(cpu, sel){
  const apple = /^Apple/.test(cpu.n);
  if (apple && sel && sel.querySelector('option[value="mac"]')) sel.value = "mac";
  else if (!apple && sel && sel.value === "mac") sel.value = "win";
  return sel ? sel.value : "win";
}
/* Un modello è proponibile se: la memoria lo contiene, la CPU è
   abbastanza veloce, e (in caso di GPU con VRAM sufficiente) non
   viene penalizzato perché lo spazio in RAM non c'è: in quel caso
   la scheda copre il buco. */
function analizzaPC(anno, ram, cpu, gpu, so){
  const score = db_punteggioPc(ram, cpu);
  const L = db_livello(score);
  const bit32 = cpu.b32 === 1;
  const bitUnknown = cpu.b32 === null;
  /* Budget semplificato per il sistema operativo; il consumo effettivo
     cambia con versione, driver e programmi aperti. */
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
    // con abbastanza memoria un modello più grande del "giusto"
    // resta valido: il limite diventa quanto è veloce, non se entra
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
  /* Il più grande che entra davvero: serve per dire a che velocità andrà
     il modello che puoi caricare, quando il 7B di riferimento non entra. */
  const migliore = usabili.length ? usabili.slice().sort((x, y) => y.p - x.p)[0] : null;
  /* Il "7B Q4" della statistica è un modello di riferimento da 4,9 GB
     (Llama 3.1 8B): se il suo stato è "no", la velocità mostrata è teorica. */
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
    3b. SINTESI IN TRE PUNTI
   Le tre domande che si fa davvero chi ha un PC vecchio:
   cosa ci gira, cosa lo limita, cosa conviene fare per primo.
   ============================================================ */
function punti(s){
  const box = $("punti");
  if (!box) return;
  const c = s.cpu, ram = s.ram, g = s.gpu;
  let puo, collo, prima;

  if (s.lmNoAvx2){
    puo = "⚠️ La CPU non ha AVX2. Per Windows x64 LM Studio lo indica tra i requisiti; il pacchetto Linux x64 include AVX2 per impostazione predefinita. Per Ollama e altri runtime la compatibilità dipende da versione, build e backend: verifica prima di installare.";
  } else if (!s.usabili.length){
    puo = "❌ Nessun modello in elenco entra con <b>" + db_num(s.utile) + " GB</b> liberi.";
  } else {
    puo = "✅ La stima ammette modelli fino a <b>" + db_param(s.maxP) + "</b> (" + s.migliore.n + ", " + db_tokRange(s.migliore.vel) + "): " +
      s.perfetti.length + " rientrano nei criteri indicativi, " + s.usabili.length + " sono al limite o rientrano.";
  }

  if (s.lmNoAvx2) collo = "La compatibilità della CPU con i requisiti SIMD della build LM Studio scelta.";
  else if (s.utile < 6) collo = "La <b>RAM</b>: solo " + db_num(s.utile) + " GB liberi per il modello.";
  else if (!s.perfetti.length) collo = "La <b>RAM</b>: i modelli più utili entrano solo parzialmente.";
  else if (g.v === 0) collo = "La <b>velocità</b>: senza GPU l'inferenza è tutta sulla CPU.";
  else if (s.cpu.sc < 50) collo = "Il <b>processore</b>: è lui a dettare la velocità.";
  else collo = "Nessuno grave: la configurazione è equilibrata per l'AI locale.";

  if (s.lmNoAvx2) prima = "Controlla se esiste un runtime compatibile con le istruzioni della CPU; in alternativa usa il PC come client di un modello remoto o cloud.";
  else if (!s.usabili.length) prima = "Verifica quanta RAM supporta la scheda madre e se è aggiornabile. In alternativa usa questo PC come <b>client</b> di un modello che gira su un'altra macchina o via cloud.";
  else if (ram < 4 || s.utile < 6) prima = "Controlla se la RAM è aggiornabile e quanto costa rispetto al valore del PC: più memoria può ampliare i modelli disponibili, ma verifica prima compatibilità e capacità massima.";
  else if (s.ssd === "hdd") prima = "Valuta un <b>SSD</b>: può ridurre i tempi di avvio e caricamento, ma il guadagno dipende dal disco, dall'interfaccia e dal sistema.";
  else if (g.v === 0) prima = "Valuta una GPU solo dopo aver controllato VRAM, compatibilità del runtime, alimentatore, spazio nel case e costo: l'accelerazione non è garantita da ogni configurazione.";
  else if (!s.perfetti.length) prima = "Controlla quale limite pesa di più: se è la memoria, un upgrade compatibile può aiutare; se è la CPU o il runtime, prova un modello più piccolo.";
  else prima = "Prova un modello dall'elenco con le tue richieste e controlla qualità, memoria e velocità sul PC.";

  $("punti").innerHTML =
    '<div class="pbox"><div class="plab">Cosa ci gira</div><div class="pval">' + puo + '</div></div>' +
    '<div class="pbox"><div class="plab">Il collo di bottiglia</div><div class="pval">' + collo + '</div></div>' +
    '<div class="pbox"><div class="plab">La prima cosa da fare</div><div class="pval">' + prima + '</div></div>';
}
function analizza(scorrimento){
  const anno = Math.min(DB_ANNO_MAX, Math.max(1990, Number($("anno").value) || 2011));
  $("anno").value = anno;
  const ram = Number($("ram").value);
  const cpu = leggiCpu($("cpu"));
  if (!cpu){ flash("Seleziona un processore dall'elenco."); return; }
  /* Su Apple Silicon il sistema operativo del calcolo è macOS, anche se
     il menu era rimasto su Windows: soApple() allinea la selezione. */
  const so = soApple(cpu, $("so"));
  const gpu = gpuPerCpu(cpu, leggiGpu($("gpu")), ram, so);
  const ssd = $("ssd").value;
  /* Se la scheda è stata inserita a mano conosciamo solo la VRAM: da qui
     in poi i range di velocità si allargano a ±40% invece del solito ±25%. */
  db_largoSet(!!(gpu && gpu.manual));

  const s = analizzaPC(anno, ram, cpu, gpu, so);
  s.ssd = ssd;
  STATO = s;

  $("scoreVal").textContent = s.score;
  $("scoreFill").style.width = s.score + "%";
  $("dots").innerHTML = [1, 2, 3, 4, 5].map(i =>
    "<i class='" + (i <= (DB_LIVELLI.indexOf(s.L) + 1) ? "on" : "") + "'></i>").join("");

  /* Due controlli di coerenza: anno ↔ processore e RAM ↔ massima della
     scheda madre. I messaggi non rimpiazzano più la riga del processore:
     restano sotto, in rosso, finché l'incoerenza c'è. */
  const avvisi = [];
  if (ram > cpu.mx && !cpu.manual)
    avvisi.push("<b>" + ram + " GB</b> supera il valore tipico di circa <b>" + cpu.mx + " GB</b> associato a questa piattaforma: verifica il limite reale sul manuale della scheda madre.");
  const scheda = cpu.manual
    ? "Dati inseriti a mano · massima RAM da verificare sulla scheda madre"
    : cpu.c + " core / " + cpu.t + " thread · " + db_simdName(cpu) + " · " + db_memLabel(cpu) + " · RAM massima indicativa della piattaforma ~" + cpu.mx + " GB";
  const hint = $("hintCpu");
  hint.classList.toggle("errore", avvisi.length > 0);
  hint.innerHTML = scheda + avvisi.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");
  /* Anno CPU e GPU non bastano a stabilire la compatibilità: servono
     scheda madre, firmware, alimentatore, spazio nel case e driver. */
  const avvisiGpu = [];
  const schedaGpu = gpu.unificata
    ? "<b>" + gpu.v + " GB</b> disponibili alla GPU su memoria unificata: la scheda può usare quasi tutta la RAM, quindi un modello entra in memoria video se ci sta"
    : gpu.manual
    ? "<b>" + gpu.v + " GB di VRAM</b> · la memoria disponibile pone un limite alla taglia del modello, ma pesi, contesto e buffer variano. Senza modello, banda e driver esatti, la velocità è una stima ampia"
    : gpu.v
    ? "<b>" + gpu.v + " GB di VRAM</b> · la memoria disponibile pone un limite alla taglia del modello; pesi, contesto e buffer variano. Verifica il supporto del runtime, i driver e il backend"
    : "Solo CPU: la velocità dipende da clock, istruzioni SIMD e tipo di memoria";
  const hintGpu = $("hintGpu");
  hintGpu.classList.toggle("errore", false);
  hintGpu.innerHTML = schedaGpu + (!gpu.unificata && gpu.v ? " · Prima dell'acquisto verifica compatibilità PCIe, spazio, alimentatore, firmware e driver." : "") + avvisiGpu.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");

  /* Interfaccia e avvio NVMe dipendono da scheda madre e firmware,
     non si deducono con certezza dall'anno della CPU. */
  const avvisiSsd = [];
  const SSD_BASE = {
    hdd: "Un HDD è in genere più lento di un SSD nel caricare i file del modello; il tempo varia in base a disco e dimensione.",
    ssd: "Un SSD riduce in genere i tempi di caricamento rispetto a un HDD.",
    nvme: "Un NVMe può essere più veloce nei trasferimenti, ma l'effetto sul caricamento dipende dal disco e dal sistema. Verifica slot e avvio NVMe sulla scheda madre."
  };
  const hintSsd = $("hintSsd");
  hintSsd.classList.toggle("errore", false);
  hintSsd.innerHTML = SSD_BASE[ssd] + avvisiSsd.map(t => '<span class="avviso">⚠️ ' + t + "</span>").join("");

  $("riepilogo").innerHTML = "<b>" + anno + "</b> · " + ram + " GB RAM · <b>" + cpu.n + "</b> · " + gpu.n +
    " · " + (ssd === "hdd" ? "hard disk" : ssd.toUpperCase()) + " · " + s.osNome +
    " → stima hardware <b>" + s.score + "/100</b>, livello <b>" + s.L.n.toLowerCase() + "</b>.";

  verdictLinux(s.score, s.L, anno, ram, cpu, s.bit32, s.bitUnknown, s.utile);
  verdictLM(s.score, ram, cpu, s.utile, s.maxP, gpu, s.os);
  verdictWin(ram, cpu);
  punti(s);

  $("st1").textContent = s.L.n;
  $("st2").textContent = db_num(s.utile) + " GB";
  $("st3").textContent = s.maxP ? db_param(s.maxP) : "—";
  $("st4").textContent = s.perfetti.length + " entro i criteri · " + s.usabili.length + " totali";
  $("st5").textContent = db_tokRange(s.vel7);
  /* Da dove viene la RAM libera: prima il sistema operativo lo decideva
     il sito in silenzio, ora lo sceglie l'utente e la sottrazione si vede. */
  if (ram - s.overhead < 0.4)
    $("notaRam").innerHTML = "Con <b>" + ram + " GB installati</b> " + s.osNome +
      " potrebbe lasciare poco spazio per un modello. La memoria disponibile varia con driver, aggiornamenti e applicazioni: controllala sul tuo PC.";
  else
    $("notaRam").innerHTML = "RAM libera <b>" + db_num(s.utile) + " GB</b> = " + ram + " GB installati − <b>" +
      db_num(s.overhead) + " GB</b> stimati per " + s.osNome + ". È una stima indicativa: memoria disponibile e cache del modello variano con driver, programmi e contesto. " +
      (s.os === "mac"
        ? "Su Apple Silicon è <b>memoria unificata</b>: la stessa risorsa alimenta il sistema, le app e il modello, quindi non esiste una riserva separata da dare alla GPU."
        : s.os === "linux"
        ? "Con un desktop Linux leggero la memoria libera può essere diversa: dipende dalla distribuzione e dai programmi aperti."
        : "Con Windows la memoria libera può essere diversa: dipende da versione, aggiornamenti e programmi aperti.");
  const nv = $("notaVel7");
  nv.hidden = s.vel7Entra;
  if (s.vel7Entra) nv.innerHTML = "";
  /* La nota non elenca più i modelli: quelli vivono nel box "Cosa ci gira"
     e nella sezione 2. Qui spiega soltanto cosa significa lo stat. */
  else nv.innerHTML = "⚠️ <b>Velocità 7B Q4</b>: è il tempo di un modello di riferimento da 4,9 GB" +
    (s.rif7 ? " (" + s.rif7.n + ")" : "") + ", che con " + db_num(s.utile) + " GB liberi <b>non entra</b>. " +
    (s.usabili.length
      ? "Resta un termine di paragone fra PC diversi: i modelli che entrano davvero sono nella <b>sezione 2</b>."
      : "Qui non entra nemmeno un modello della lista: leggi il box <b>Cosa ci gira</b> qui sopra.");

  distro(s);
  modelliDesc(s);
  steps(s);
  trucchi(s);

  $("risultato").hidden = false;
  disegnaTabella();
  if (scorrimento) $("risultato").scrollIntoView({ behavior: "smooth", block: "start" });
  flash("Analisi completata");
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
    return { n: "Personalizzato", y: 0, sc: Math.max(3, Math.min(96, sc)), c: c, t: t, g: 2.5, avx: avx, mem: mem, mx: 999, manual: true };
  }
  for (const k in DB_CPU) for (const p of DB_CPU[k]) if (p.n === v) return p;
  return null;
}
function leggiGpu(select){
  const v = select.value;
  if (v === "Altra scheda (inserisco la VRAM)"){
    const vr = Math.min(48, Math.max(1, Math.round(Number($("gpuVram").value) || 8)));
    /* Senza sapere il modello esatto, la velocità è molto approssimativa.
       Mostriamo un intervallo prudente (±40%) invece di un numero unico. */
    const x = Math.min(95, 8 + vr * 1.6);
    return { n: "Scheda da " + vr + " GB (stima)", y: 0, v: vr, x: x, z: 0.85, vend: "Altro", manual: true };
  }
  for (const k in DB_GPU) for (const p of DB_GPU[k]) if (p.n === v) return p;
  return DB_GPU.ig[0];
}
/* Su Apple Silicon la memoria è unificata: la GPU può usare tutta la
   RAM, quindi il modello va trattato come se fosse in VRAM. */
function gpuPerCpu(cpu, gpu, ram, so){
  if (!/^Apple/.test(cpu.n)) return gpu;
  /* Memoria unificata: il modello e il sistema condividono lo stesso
     pool, quindi la parte disponibile è la stessa della RAM utile.
     Non si sottrae 6 GB "per la GPU": è l'unica risorsa che c'è. */
  const liberi = Math.max(0.4, ram - overheadOs(so));
  return {
    n: "Apple Silicon — memoria unificata",
    y: cpu.y, v: liberi, x: DB_APPLE_BASE[cpu.n] || 30,
    z: 1, vend: "Apple", unificata: 1
  };
}
/* token/s su un 7B Q4 con accelerazione Metal (MLX) */
const DB_APPLE_BASE = { "Apple M1 (base)": 30, "Apple M2 (base)": 36, "Apple M3 (base)": 44, "Apple M4 (base)": 52 };

/* ============================================================
   4. MODELLI CONSIGLIATI + TABELLA
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
  else if (tabAttiva === "visione") lista = lista.filter(m => db_hasCompito(m, "Visione"));
  else if (tabAttiva === "codice") lista = lista.filter(m => m.t === "Codice");
  else if (tabAttiva === "pensiero") lista = lista.filter(m => m.t === "Ragionamento");
  if (fam) lista = lista.filter(m => m.f === fam);
  lista = lista.sort((a, b) => a.p - b.p);
  if (!lista.length){
    $("tbody").innerHTML = '<tr><td colspan="7" class="empty">Nessun modello in questa categoria per il tuo PC. Prova la scheda <b>Tutti i modelli</b>.</td></tr>';
    return;
  }
  let h = "";
  lista.forEach(m => {
    let pill, cls = "";
    if (m.stato === "ok") pill = '<span class="pill y">✅ Entro la stima</span>';
    else if (m.stato === "limite"){ pill = '<span class="pill w">⚠️ Al limite</span>'; cls = "nota"; }
    else { pill = '<span class="pill n">❌ Criteri non rispettati</span>'; cls = "nota"; }
    h += "<tr class='" + cls + "'>" +
      "<td class='name' data-label='Modello'>" + m.n + "<small>" + m.d + "</small></td>" +
      "<td class='num' data-label='Parametri'>" + db_param(m.p) + "</td>" +
      "<td class='num' data-label='Quantizzazione'>" + qb + "</td>" +
      "<td class='num' data-label='File'>" + db_num(m.dimStimata) + " GB</td>" +
      "<td class='num' data-label='RAM necessaria'>" + db_num(m.ramStimata) + " GB</td>" +
      "<td class='num' data-label='Velocità stimata (base Q4)'>" + db_tokRange(m.vel) + (m.onGpu ? " <span class='tag'>GPU</span>" : "") + "</td>" +
      "<td data-label='Verdetto'>" + pill + "</td></tr>";
  });
  $("tbody").innerHTML = h;
}
function modelliDesc(s){
  const avvisoAvx = s.lmNoAvx2
    ? " <b>Attenzione:</b> la CPU non ha AVX2. I requisiti per Windows x64 e il pacchetto Linux x64 vanno verificati per la build scelta; queste stime non garantiscono l'avvio di LM Studio."
    : "";
  $("modelliDesc").innerHTML = "Per questo profilo il budget semplificato stima <b>" + db_num(s.utile) + " GB di RAM utilizzabili</b> (" +
    s.ram + " GB installati − <b>" + db_num(s.overhead) + " GB</b> di " + s.osNome + ")" +
    (s.gpu && s.gpu.v
      ? (s.gpu.unificata
         ? " e <b>" + s.gpu.v + " GB</b> di memoria unificata a disposizione del modello (stessa risorsa, non è un extra)"
         : " e <b>" + s.gpu.v + " GB di VRAM</b>")
      : "") +
    ". ✅ indica che i budget interni di memoria e CPU sono rispettati; ⚠️ segnala un caso al limite; ❌ che uno dei criteri interni non è rispettato. Sono stime: controlla la memoria reale e i requisiti del runtime." + avvisoAvx;
}

/* ============================================================
   5. LINUX + PASSAGGI + TRUCCHI
   ============================================================ */
/* il filtro 32-bit: su un PC a 64 bit quelle distro non servono */
function distro(s){
  if (/^Apple/.test(s.cpu.n)){
    $("linuxDesc").innerHTML = "macOS è il percorso nativo usato da LM Studio su Apple Silicon. Linux richiede una distribuzione compatibile con il modello preciso del Mac e verifiche separate su installazione e driver.";
    $("distro").innerHTML = '<div class="nota">Su Apple Silicon la memoria è unificata: "Accelerazione GPU" e "memoria di sistema" sono la stessa identica risorsa. Attivare la GPU per l\'inferenza non aggiunge memoria, la divide.</div>';
    return;
  }
  if (s.bitUnknown){
    $("linuxDesc").textContent = "Prima di scegliere una distribuzione, verifica il modello esatto della CPU e se supporta x86-64.";
    $("distro").innerHTML = '<div class="nota">Il catalogo non mostra immagini a 32 o 64 bit finché l\'architettura della CPU non è verificata. Usa CPU-Z su Windows o <code>lscpu</code> su Linux e consulta i requisiti della distribuzione scelta.</div>';
    return;
  }
  const lista = DB_DISTRO.filter(d => s.score >= d.s && s.score <= d.e && (!!d.b32) === s.bit32)
    .sort((a, b) => (b.top || 0) - (a.top || 0) || a.s - b.s);
  if (!lista.length){
    $("distro").innerHTML = '<div class="nota">Il catalogo non trova una distribuzione con questi criteri indicativi. Verifica architettura, requisiti e supporto della release scelta; se possibile, prova prima una sessione Live.</div>';
    $("linuxDesc").textContent = "I dati inseriti non bastano per consigliare una delle distribuzioni elencate. RAM, processore, driver e requisiti della versione possono incidere.";
    return;
  }
  $("distro").innerHTML = lista.map(d =>
    '<div class="d-row' + (d.top ? " top" : "") + '">' +
      '<div class="dn">' + d.n + "</div>" +
      '<div class="db">requisiti della release: da verificare</div>' +
      '<div class="dd">' + d.d + "</div>" +
    "</div>").join("");
  $("linuxDesc").innerHTML = s.bit32
    ? "Il tuo processore è del <b>" + s.cpu.y + "</b>: siamo nel territorio dei 32 bit, quindi servono distribuzioni appositamente leggere."
    : "L'ordine riflette l'uso scelto e criteri indicativi di RAM e processore; i requisiti reali dipendono dalla release. Prova una distribuzione in modalità Live prima di installarla.";
}
function steps(s){
  const out = [];
  const ram = s.ram, cpu = s.cpu, maxP = s.maxP, bit32 = s.bit32;
  out.push({ t: "Fai un backup, davvero", d: "Copia documenti, foto e segnalibri su un disco esterno. Il passaggio che salverà il tuo pomeriggio." });
  if (/^Apple/.test(cpu.n)){
    out.push({ t: "Controlla la memoria unificata", d: "Su Apple Silicon sistema, app e modello condividono la memoria. La quantità libera varia con la configurazione e i programmi aperti: controllala prima di scegliere il modello e il contesto." });
    out.push({ t: "Scarica LM Studio per macOS", d: "Versione nativa per Apple Silicon da <a href='https://lmstudio.ai/' target='_blank' rel='noopener'>lmstudio.ai</a>: si installa come qualsiasi app e usa Metal per l'accelerazione." });
    out.push({ t: "Scegli il modello in base alla memoria", d: s.migliore
      ? "La stima trova modelli fino a <b>" + db_param(s.maxP) + "</b>, ma memoria e velocità dipendono da quantizzazione e contesto. Scegli un modello compatibile con il runtime e controlla la RAM effettivamente libera."
      : "Con la memoria stimata non entra nessun modello del catalogo: valuta più RAM o un modello remoto." });
    out.push({ t: "Verifica l'accelerazione Metal", d: "LM Studio può usare Metal sui modelli supportati. Il guadagno dipende dal modello, dalla memoria libera e dalla versione dell'app: controlla l'offload nel pannello del modello." });
  } else if (s.bitUnknown){
    out.push({ t: "Verifica il modello preciso della CPU", d: "Il profilo selezionato non identifica la variante del processore. Controlla il nome completo con CPU-Z o <code>lscpu</code> e verifica se supporta x86-64 prima di scaricare un'immagine Linux." });
  } else if (bit32){
    if (s.linux){
      out.push({ t: "Controlla che la distro a 32 bit sia ancora supportata", d: "Le opzioni a 32 bit sono limitate. Puoi valutare <b>antiX 26.1</b> o <b>Debian 12 i386</b>, verificando supporto, aggiornamenti e compatibilità prima dell'installazione." });
      out.push({ t: "Tieni il sistema aggiornato", d: "Dopo l'installazione usa il gestore aggiornamenti della distribuzione. Verifica spazio richiesto, supporto e requisiti nella documentazione della release scelta." });
    } else {
      out.push({ t: "Verifica una distribuzione a 32 bit supportata", d: "Controlla i requisiti e il supporto correnti di antiX 26.1 o Debian 12 i386; scegli una ISO adatta alla CPU esatta e prova prima in modalità Live." });
      out.push({ t: "Prova in modalità Live", d: "Avvia dalla USB e verifica rete, audio, video e le periferiche che usi. Una prova breve non garantisce che tutto funzionerà dopo l'installazione." });
      out.push({ t: "Installa e aggiorna", d: "Installa solo dopo aver verificato spazio libero, supporto e compatibilità della release. Dopo il primo avvio applica gli aggiornamenti tramite il gestore della distribuzione." });
    }
    out.push({ t: "Controlla i requisiti del runtime", d: "Per Windows x64 LM Studio indica AVX2 nei requisiti; il pacchetto Linux x64 include AVX2 per impostazione predefinita. Verifica la build e le istruzioni richieste prima di scaricare modelli; in alternativa usa un servizio remoto." });
  } else {
    if (s.linux){
      out.push({ t: "Aggiorna il sistema prima di tutto", d: "Apri il gestore aggiornamenti della distribuzione e applica gli aggiornamenti disponibili. Il supporto dei driver e i miglioramenti dipendono dall'hardware e dalla release." });
      out.push({ t: "Valuta un SSD", d: "Se il disco è meccanico, un SSD può migliorare l'avvio e il caricamento dei programmi. Il guadagno varia con PC, interfaccia e stato del sistema." });
    } else {
      out.push({ t: "Prova Linux senza installare nulla", d: "Scarica una distribuzione supportata e crea una USB avviabile. Avviala nella modalità firmware usata dal PC, se vuoi mantenere Windows, e prova rete, grafica, audio e periferiche in modalità Live." });
      out.push({ t: "Decidi: sostituisci o dual boot", d: "Se vuoi tenere Windows, ridimensiona la partizione dagli strumenti di Windows e lascia lo spazio richiesto dalla distribuzione scelta. Fai prima un backup e verifica compatibilità e modalità firmware." });
      out.push({ t: "Valuta un SSD", d: "Se il disco è meccanico, un SSD può migliorare l'avvio e il caricamento dei programmi. Verifica interfaccia, formato e compatibilità con la scheda madre." });
    }
    out.push({ t: "Scarica LM Studio", d: "Controlla i requisiti ufficiali e scegli il pacchetto compatibile con sistema e processore. " + (s.linux
      ? "Su Linux scarica il file <code>.AppImage</code> e rendilo eseguibile con <code>chmod +x</code>."
      : "Su Windows il percorso dei modelli è configurabile: controllalo nelle impostazioni dell'app prima di scaricarli.") });
    out.push({ t: "Scegli il modello e scaricalo", d: maxP
      ? "Cerca nella libreria di LM Studio <b>" + s.perfetti.slice().sort((a, b) => b.p - a.p)[0].n + "</b>. Prima del download controlla dimensione del file, quantizzazione, requisiti e spazio disponibile."
      : "Scarica un modello minuscolo (Qwen3 0.6B) per verificare che l'inferenza funzioni prima di scaricare tutto il resto." });
    out.push({ t: "Configura prima di scrivere", d: s.gpu && s.gpu.v
      ? "Verifica il supporto della GPU e del backend; assegna un offload compatibile con la VRAM e lascia margine per contesto e buffer. Inizia con un contesto contenuto."
      : "Su CPU-only lascia l'offload GPU disattivato e prova i thread predefiniti. Riduci il contesto se il sistema resta senza memoria." });
    out.push({ t: "Prova una richiesta reale", d: "Usa un compito che ti interessa e controlla qualità, velocità e memoria sul PC. Le prestazioni dipendono da modello, quantizzazione e configurazione." });
  }
  $("steps").innerHTML = out.map(x => "<li><b>" + x.t + "</b><div class='sm'>" + x.d + "</div></li>").join("");
}
function trucchi(s){
  const t = [];
  const ram = s.ram, cpu = s.cpu, gpu = s.gpu, utile = s.utile;
  if (ram <= 4) t.push({ h: "Controlla se puoi aumentare la RAM", p: "Con 4 GB la memoria può essere un limite per sistema, applicazioni, modello e contesto. Se la scheda madre lo consente, più RAM può ampliare i modelli utilizzabili; verifica prima moduli supportati e memoria libera." });
  if (s.ssd === "hdd") t.push({ h: "Valuta un SSD", p: "Un SSD può ridurre i tempi di avvio e lettura dei modelli rispetto a un HDD. Il guadagno varia con disco, interfaccia, sistema e dimensione dei file; verifica formato e compatibilità prima dell'acquisto." });
  if (!cpu.arm && cpu.avx === 1) t.push({ h: "AVX senza AVX2", p: "Per Windows x64 LM Studio indica AVX2 tra i requisiti; il pacchetto Linux x64 lo include per impostazione predefinita. Altri runtime o build possono avere requisiti diversi: verifica la compatibilità esatta." });
  if (!cpu.arm && cpu.avx === 0) t.push({ h: "CPU senza AVX", p: "I runtime x64 moderni possono richiedere istruzioni SIMD. Verifica AVX2 e le istruzioni previste dalla build LM Studio o dal runtime che vuoi installare; una build alternativa può avere compatibilità e prestazioni diverse." });
  if (cpu.mem <= 1) t.push({ h: "Verifica il tipo e il canale della RAM", p: "La banda di memoria può influire sulle prestazioni, ma il guadagno del dual channel varia in base a CPU, scheda madre e runtime. Controlla il manuale della scheda prima di aggiungere moduli." });
  if (!gpu || !gpu.v) t.push({ h: "Senza GPU dedicata", p: "L'inferenza può usare la CPU e la RAM di sistema. Se la memoria è al limite, prova un modello più piccolo e riduci il contesto; lo swap può evitare alcuni blocchi, ma non equivale a RAM e può rallentare molto." });
  else if (gpu && !gpu.unificata && gpu.v < 8) t.push({ h: "Controlla la VRAM disponibile", p: "La VRAM limita la quantità di modello che può essere assegnata alla GPU, ma il file su disco non coincide con la memoria usata durante l'inferenza. Contesto, cache, buffer, runtime e backend incidono: verifica i requisiti e lascia margine." });
  else if (gpu && !gpu.unificata && gpu.v >= 12) t.push({ h: "Valuta l'offload GPU", p: "Più VRAM può permettere di assegnare più layer alla scheda, ma la memoria richiesta dipende da modello, quantizzazione e contesto. Controlla spazio per cache e buffer e verifica che runtime, driver e backend supportino la GPU." });
  if (gpu && gpu.vend === "AMD") t.push({ h: "AMD: driver e backend contano", p: "Il supporto dipende dal modello della GPU, dal sistema operativo e dal backend disponibile. Controlla la documentazione del runtime e prova una configurazione reale prima di acquistare hardware." });
  if (gpu && gpu.vend === "Intel") t.push({ h: "Intel Arc: ancora da affinare", p: "Le Arc rendono bene in Vulkan ma l'integrazione con i runtime di inferenza è giovane. Prova e confronta: se ottieni risultati strani, resta sulla CPU." });
  if (s.linux)
    t.push({ h: "Controlla la memoria libera", p: "Il consumo di XFCE o LXQt varia con release, servizi, driver e programmi aperti. Misura la memoria disponibile dopo l'avvio e prima di scegliere un modello." });
  else if (s.os === "mac")
    t.push({ h: "La memoria è condivisa", p: "Su Apple Silicon sistema, app e modello usano la stessa memoria. Controlla in Monitoraggio Attività → Memoria quanta ne è libera prima di scegliere la taglia del modello." });
  else
    t.push({ h: "Controlla la memoria libera", p: "Il sistema operativo, i programmi, il modello e la cache del contesto condividono la RAM. Misura quanta memoria resta disponibile prima di scegliere la taglia del modello; un desktop Linux può cambiare il bilancio, ma il risparmio dipende dalla configurazione." });
  t.push({ h: "Gestisci i file dei modelli", p: "I modelli scaricati occupano spazio anche quando non sono caricati. Controlla la dimensione dei file e rimuovi quelli che non usi." });
  t.push({ h: "Regola il contesto", p: "Il contesto usa memoria aggiuntiva per la cache e il consumo cresce in base a modello e configurazione. Se la memoria è al limite, prova un contesto più corto e controlla l'uso effettivo." });
  if (s.score >= 60) t.push({ h: "Se hai 16 GB puoi valutare modelli più grandi", p: "Alcuni modelli 14B in Q4 possono entrare, ma lo spazio varia con file, contesto, sistema e applicazioni aperte. Alternative: Ollama con la sua API, Open WebUI o <code>llama-server</code>, dopo aver verificato i requisiti del runtime." });
  $("trucchiList").innerHTML = t.map(x => '<div class="tk"><h3>' + x.h + "</h3><p>" + x.p + "</p></div>").join("");
}

/* ============================================================
   6. CONFRONTO DUE PC
   ============================================================ */
function confronta(){
  db_largoSet(false);   // il confronto usa solo schede del catalogo
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
  if (!esito[0] || !esito[1]){ flash("Seleziona i due processori."); return; }
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
  riga("Indice di capacità (RAM+CPU)", a.score + "/100 (" + a.L.n.toLowerCase() + ")", b.score + "/100 (" + b.L.n.toLowerCase() + ")", a.score, b.score, "high");
  riga("Anno (contesto)", a.anno, b.anno, 0, 0, "high", false);
  /* Il sistema operativo non è una prestazione: non assegna il punto,
     serve solo a spiegare perché i GB liberi dei due PC non coincidono. */
  riga("Sistema operativo", a.osNome, b.osNome, 0, 0, "high", false);
  const maxA = a.cpu.manual ? -1 : a.cpu.mx;
  const maxB = b.cpu.manual ? -1 : b.cpu.mx;
  const mxNoti = maxA >= 0 && maxB >= 0;
  function ramCell(r, cpu){
    const supera = !cpu.manual && r > cpu.mx;
    return r + " GB" + (supera
      ? ' <span class="avviso-inline">⚠️ oltre i ' + cpu.mx + " GB massimi della scheda madre</span>"
      : "");
  }
  riga("RAM installata", ramCell(a.ram, a.cpu), ramCell(b.ram, b.cpu), a.ram, b.ram, "high");
  riga("RAM massima indicativa della piattaforma",
    maxA >= 0 ? maxA + " GB" : "da verificare",
    maxB >= 0 ? maxB + " GB" : "da verificare",
    mxNoti ? maxA : 0, mxNoti ? maxB : 0, "high", mxNoti);
  riga("Processore", a.cpu.c + "c/" + a.cpu.t + "t · " + db_simdName(a.cpu), b.cpu.c + "c/" + b.cpu.t + "t · " + db_simdName(b.cpu), a.cpu.sc, b.cpu.sc, "high");
  const grafica = s => !s.gpu || !s.gpu.v
    ? "solo CPU"
    : (s.gpu.unificata ? s.gpu.v + " GB di memoria unificata" : s.gpu.v + " GB VRAM");
  riga("Grafica", grafica(a), grafica(b), a.gpu.v, b.gpu.v, "high");
  riga("Linux", linuxBreve(a), linuxBreve(b), linuxPunteggio(a), linuxPunteggio(b), "high",
    a.cpu.w11 !== null && b.cpu.w11 !== null);
  riga("LM Studio", lmBreve(a), lmBreve(b), lmPunteggio(a), lmPunteggio(b), "high");
  /* Il 7B Q4 è un metro di paragone: se su un PC non entra, va detto. */
  function velCell(x){
    return db_tokRange(x.vel7) + (x.vel7Entra ? "" :
      ' <span class="avviso-inline">⚠️ il 7B Q4 non entra' + (x.maxP ? " · max " + db_param(x.maxP) : "") + "</span>");
  }
  riga("Velocità 7B Q4 (riferimento)", velCell(a), velCell(b), a.vel7, b.vel7, "high",
    a.vel7Entra && b.vel7Entra);
  riga("Modelli nella stima", a.perfetti.length + " entro i criteri · " + a.usabili.length + " totali", b.perfetti.length + " entro i criteri · " + b.usabili.length + " totali", a.usabili.length, b.usabili.length, "high");
  riga("Parametri massimi", a.maxP ? db_param(a.maxP) : "—", b.maxP ? db_param(b.maxP) : "—", a.maxP, b.maxP, "high");

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
  if (va > vb) verdetto = "🏆 <b>" + nomeAHtml + "</b> prevale nel conteggio indicativo: " + va + " categorie contro " + vb + ". ";
  else if (vb > va) verdetto = "🏆 <b>" + nomeBHtml + "</b> prevale nel conteggio indicativo: " + vb + " categorie contro " + va + ". ";
  else verdetto = "🤝 <b>Parità</b>: " + va + " categorie a testa. ";
  const differenza = Math.abs(a.score - b.score);
  if (differenza < 8) verdetto += "Gli indici interni di CPU e RAM sono vicini; considera anche GPU, compatibilità, consumo, prezzo e le attività che vuoi svolgere.";
  else if (differenza > 45) verdetto += "L'indice stima una differenza ampia fra le risorse inserite; non equivale a un benchmark o a un rapporto fisso di velocità.";
  else verdetto += "Le differenze stimate dipendono dai modelli compatibili e dalle prestazioni reali del runtime.";
  $("vsVerdetto").innerHTML = verdetto;

  const modA = a.usabili.slice().sort((x, y) => y.p - x.p)[0];
  const modB = b.usabili.slice().sort((x, y) => y.p - x.p)[0];
  $("vsNota").innerHTML = "Il conteggio è una stima interna basata su memoria e soglia CPU dei modelli elencati; non misura qualità o compatibilità del runtime. GPU, backend e contesto possono cambiare il risultato. " +
    (modA && modB
      ? "Fra i modelli che superano i criteri indicativi, quello con più parametri è <b>" + modA.n + "</b> su <b>" + nomeAHtml + "</b> e <b>" + modB.n + "</b> su <b>" + nomeBHtml + "</b>."
      : "La stima non individua modelli che superino i criteri interni su entrambi i PC. Verifica RAM, CPU e runtime; se il limite è la memoria, un upgrade compatibile può ampliare le opzioni.");
  const senza7 = [!a.vel7Entra ? nomeAHtml : null, !b.vel7Entra ? nomeBHtml : null].filter(Boolean);
  if (senza7.length)
    $("vsNota").innerHTML += " La velocità su <b>7B Q4</b> è un termine di paragone: su " +
      senza7.join(" e su ") + " quel modello non entra in memoria, quindi è un valore teorico, non una misura.";

  $("vsRisultato").hidden = false;
  document.querySelector(".vs-side").classList.remove("win");
  document.querySelectorAll(".vs-side")[1].classList.remove("win");
  if (va > vb) document.querySelectorAll(".vs-side")[0].classList.add("win");
  else if (vb > va) document.querySelectorAll(".vs-side")[1].classList.add("win");

  flash("Confronto completato");
}
function linuxBreve(s){
  if (/^Apple/.test(s.cpu.n)) return "Opzionale; verifica supporto";
  if (s.bit32) return "✅ Consigliato (32 bit)";
  if (s.anno <= 2013) return "✅ Consigliato";
  if (s.cpu.w11 === null) return "❓ Verifica requisiti";
  if (s.cpu.w11 === 0) return "✅ Valuta un'alternativa";
  if (s.score < 68) return "✅ Consigliato";
  return "🟡 Facoltativo";
}
/* quanto Linux serve davvero su questa macchina */
function linuxPunteggio(s){
  if (/^Apple/.test(s.cpu.n)) return 20;
  if (s.bit32) return 100;      // è l'unica strada
  if (s.anno <= 2013) return 90; // Windows 10 è a fine vita (ESU a parte)
  if (s.score < 50) return 80;
  if (s.score < 68) return 60;
  if (s.cpu.w11 !== 1 || s.ram < 4) return 75;
  return 30;                     // CPU in lista e RAM minima; altri requisiti restano da verificare
}
function lmPunteggio(s){
  if (s.lmNoAvx2) return -1;
  if (s.ram < 4) return 0;
  return s.usabili.length;
}
function lmBreve(s){
  if (s.lmNoAvx2) return "❌ Requisito AVX2";
  if (s.ram < 4) return "❌ Troppa poca RAM";
  if (!s.usabili.length) return "❌ Nessun modello";
  if (s.utile < 3) return "⚠️ Solo 0,5-1B";
  if (s.maxP >= 12) return "✅ Stima fino a " + db_param(s.maxP);
  if (s.maxP >= 7) return "✅ Stima fino a 7-8B";
  if (s.maxP >= 3) return "✅ Stima fino a 3-4B";
  return "⚠️ Solo 1-2B";
}

/* ============================================================
   7. COPIA / STAMPA / RESET / ESEMPI
   ============================================================ */
function copiaRiassunto(){
  if (!STATO){ flash("Prima premi Calcola cosa posso fare."); return; }
  const s = STATO;
  const top = s.usabili.slice().sort((a, b) => b.p - a.p).slice(0, 3)
    .map(m => "  • " + m.n + " (" + db_param(m.p) + " — " + db_tokRange(m.vel) + (m.onGpu ? ", GPU" : "") + ")").join("\n");
  const txt = [
    "GUIDA PC VECCHI — il mio verdetto",
    "PC: " + s.anno + " · " + s.ram + " GB RAM · " + s.osNome + " · " + s.cpu.n + " · " + s.gpu.n,
    "Indice indicativo: " + s.score + "/100 (RAM 45% · processore 55%; anno escluso) — livello " + s.L.n.toLowerCase(),
    "Linux: " + $("vLinuxVal").textContent.replace(/^[^\w]+/, ""),
    "LM Studio: " + $("vLMVal").textContent.replace(/^[^\w]+/, ""),
    "Windows 11: " + $("vWinVal").textContent.replace(/^[^\w]+/, ""),
    "RAM utilizzabile per l'AI: ~" + db_num(s.utile) + " GB (" + s.ram + " GB installati − " + db_num(s.overhead) + " GB di " + s.osNome + ")",
    "",
    "Modelli ammessi dai criteri indicativi:",
    top || "  (la stima non trova modelli entro i criteri indicativi)",
    "",
    s.os === "mac"
      ? "Memoria unificata: sistema operativo e modello condividono gli stessi GB."
      : s.os === "linux"
      ? "Sistema operativo valutato: Linux. La compatibilità reale dipende da distribuzione, release e periferiche."
      : "Sistema operativo valutato: Windows. La compatibilità reale dipende dai requisiti della versione.",
    "guida PC Vecchi — oldpcguide.com"
  ].join("\n");
  copia(txt);
}
function copia(txt){
  const ok = () => flash("✓ Riassunto copiato negli appunti");
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
    done ? ok() : flash("Copia non disponibile: seleziona il testo a mano");
  };
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext)
    navigator.clipboard.writeText(txt).then(ok, fallback);
  else fallback();
}
function stampa(){ window.print(); }
function reset(){
  if (ANNO_PC) ANNO_PC.resetta(2014); else $("anno").value = 2014;
  $("ram").value = 16; $("ssd").value = "ssd"; $("so").value = "win";
  $("cpu").value = "Core i5-4460 (Haswell)";
  $("gpu").value = "Solo grafica integrata / nessuna GPU";
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
  $("tbody").innerHTML = '<tr><td colspan="7" class="empty">Seleziona anno, RAM e processore e premi <b>Calcola</b>.</td></tr>';
  flash("Campi azzerati");
}
function flash(m){
  $("msg").textContent = m;
  clearTimeout(window.__t);
  window.__t = setTimeout(() => { $("msg").textContent = ""; }, 3200);
}

const ESEMPI = [
  { anno: 2011, ram: 8, cpu: "Core i5-2400 (Sandy Bridge)", gpu: "Solo grafica integrata / nessuna GPU", ssd: "hdd", so: "win", n: "Desktop del 2011 riciclato" },
  { anno: 2005, ram: 2, cpu: "Pentium 4 Prescott 2.8-3.4 GHz (verifica il modello esatto)", gpu: "Solo grafica integrata / nessuna GPU", ssd: "hdd", so: "linux", n: "PC del 2005 da 2 GB" },
  { anno: 2021, ram: 16, cpu: "Ryzen 5 3600", gpu: "GeForce RTX 3060 (12 GB)", ssd: "nvme", so: "win", n: "Ryzen 5 con 16 GB, RTX 3060 e SSD" },
  { anno: 2017, ram: 4, cpu: "Core i5-4460 (Haswell)", gpu: "GeForce GTX 1050 Ti (4 GB)", ssd: "hdd", so: "win", n: "PC del 2017 con GPU da 4 GB" }
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
  flash("Esempio caricato: " + e.n);
}
function confrontoEsempio(){
  $("cmpANome").value = "Desktop Core 2 Duo E8400";
  if (ANNO_A) ANNO_A.resetta(2008); else $("cmpAAnno").value = 2008;
  $("cmpARam").value = 4; $("cmpASo").value = "linux";
  $("cmpACpu").value = "Core 2 Duo E8400";
  $("cmpAGpu").value = "Solo grafica integrata / nessuna GPU";
  $("cmpBNome").value = "PC con Ryzen 5 3600 e RTX 3060";
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
   8. AVVIO
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
  // selettori del calcolatore
  popolaRam($("ram"), 16);
  popolaRam($("cmpARam"), 4);
  popolaRam($("cmpBRam"), 16);

  const optAltro = document.createElement("option");
  optAltro.value = "ALTRO";
  optAltro.textContent = "Non è nella lista → compilo a mano";

  const comboCpu = Combo("cpuSearch", "cpu", "cpuList", "cpuNote", DB_GRUPPI_CPU, DB_CPU, optAltro, "cpu",
                         { anno: function(){ return $("anno").value; } });
  const comboGpu = Combo("gpuSearch", "gpu", "gpuList", "gpuNote", DB_GRUPPI_GPU_HOME, DB_GPU, null, "gpu");
  COMBO_CPU = comboCpu; COMBO_GPU = comboGpu;
  // Esempio iniziale: desktop 2014 ancora utile, con RAM adeguata agli strumenti attuali.
  $("cpu").value = "Core i5-4460 (Haswell)";
  $("gpu").value = "Solo grafica integrata / nessuna GPU";
  $("ssd").value = "ssd";
  comboCpu.mostra(); comboGpu.mostra();

  // selettori del confronto: stesse liste, senza ricerca e senza "ALTRO"
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
  $("cmpAGpu").value = "Solo grafica integrata / nessuna GPU";
  $("cmpBGpu").value = "GeForce RTX 3060 (12 GB)";

  // correlazione anno ↔ processore: da qui in poi l'anno segue la CPU
  HINT_CPU_BASE = $("hintCpu").textContent;
  ANNO_PC = db_annoSync($("anno"), $("cpu"), leggiCpu, $("hintAnno"), comboCpu);
  ANNO_A  = db_annoSync($("cmpAAnno"), $("cmpACpu"), leggiCpu);
  ANNO_B  = db_annoSync($("cmpBAnno"), $("cmpBCpu"), leggiCpu);
  ANNO_PC.sincronizza(); ANNO_A.sincronizza(); ANNO_B.sincronizza();

  // eventi
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
