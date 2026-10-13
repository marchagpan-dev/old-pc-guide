/* ============================================================
   linux.js — strumento di scelta della distribuzione Linux
   Riusa ../db.js: stessa base dati del calcolatore principale,
   così i due strumenti non possono mai contraddirsi.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];

/* Riuso i selettori con optgroup come nella home */
function popolaSel(sel, valori, suffisso, defaultVal){
  sel.innerHTML = "";
  valori.forEach(v => {
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
    const etichetta = entry[0], chiave = entry[1];
    const voci = fonte[chiave] || [];
    if (!voci.length) return;
    const og = document.createElement("optgroup");
    og.label = etichetta;
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

/* ------------------------------------------------------------
   Cosa cambia l'uso previsto. Il filtro non serve a
   "scegliere meglio": serve a cambiare la priorità.
   ------------------------------------------------------------ */
const LX_USO = {
  navigare: {
    nome: "navigare e lavorare",
    serve: ["Xubuntu", "Linux Mint XFCE", "Lubuntu (LXQt, versione supportata)", "Zorin OS 18.1 Lite"],
    nota: "Per uso quotidiano conta la semplicità: driver che funzionano al primo colpo e un desktop riconoscibile valgono più di 100 MB di RAM risparmiati."
  },
  ai: {
    nome: "far girare modelli AI in locale",
    serve: ["Linux Mint XFCE", "Lubuntu (LXQt, versione supportata)", "Debian stable (64 bit)", "Xubuntu"],
    nota: "Per l'AI locale conta la memoria libera dopo l'avvio; il consumo del desktop dipende da versione, driver e servizi. Misuralo sul PC prima di scegliere un modello."
  },
  scuola: {
    nome: "scuola, ufficio e programmazione",
    serve: ["Linux Mint XFCE", "Zorin OS 18.1 Lite", "Xubuntu", "Debian stable (64 bit)"],
    nota: "Se arrivi da Windows, Zorin ha un'interfaccia familiare; Mint, Xubuntu e Debian sono opzioni diffuse. Su un portatile verifica driver, sospensione e autonomia dalla modalità Live."
  },
  server: {
    nome: "server di casa, sempre acceso",
    serve: ["Debian stable (64 bit)", "Linux Mint XFCE", "antiX 26.1 (32 bit)"],
    nota: "Un server può fare a meno del desktop. Verifica prima i requisiti e la compatibilità del runtime AI con CPU, RAM e architettura; le CPU a 32 bit hanno opzioni e supporto molto limitati."
  }
};

/* Il sito ufficiale giusto per ciascuna distribuzione: mandare
   qualcuno su una pagina sbagliata è il modo più rapido per fargli
   perdere mezz'ora. */
const LX_SITO = {
  "antiX 26.1 (32 bit)": "antixlinux.com/download/",
  "Debian 12 i386 (LTS fino al 2028)": "debian.org/releases/bookworm/",
  "Linux Mint XFCE": "linuxmint.com/download.php",
  "Xubuntu": "xubuntu.org/download",
  "Lubuntu (LXQt, versione supportata)": "lubuntu.me/download",
  "Zorin OS 18.1 Lite": "help.zorin.com/docs/getting-started/getting-zorin-os-lite/",
  "Debian stable (64 bit)": "debian.org/CD/index.it.html",
  "Ubuntu LTS (64 bit)": "ubuntu.com/download/desktop",
  "Fedora Workstation": "fedoraproject.org/workstation/download",
  "Manjaro / Arch": "manjaro.org/download"
};
function lxRiposo(){ return "variabile"; }

function lxScegli(){
  const ram = Number($("lxRam").value);
  const cpu = cerca(DB_CPU, $("lxCpu").value);
  const uso = LX_USO[$("lxUso").value];
  const win = $("lxWin").value === "si";
  const portatile = $("lxPortatile").value === "si";

  if (!cpu){ $("lxEsito").innerHTML = '<div class="callout errore">Scegli un processore.</div>'; return; }

  if (cpu.b32 === null){
    $("lxEsito").innerHTML = '<div class="callout attenzione"><h3>Verifica l’architettura della CPU</h3><p>Il profilo selezionato è generico e non basta a stabilire se il processore supporti x86-64. Controlla il modello completo con CPU-Z o <code>lscpu</code>, poi verifica i requisiti della distribuzione e scegli l’immagine a 32 o 64 bit corretta.</p><p>Non installare un’immagine prima di aver fatto questo controllo. Puoi provare una USB Live senza modificare il disco.</p></div>';
    return;
  }

  const bit32 = cpu.b32 === 1;
  const score = db_punteggioPc(ram, cpu);

  /* Tutte le distro compatibili con questa macchina: il filtro
     32-bit è esplicito, perché confonderlo è l'errore più grave. */
  let compatibili = DB_DISTRO.filter(function(d){
    if (!!d.b32 !== bit32) return false;
    return score >= d.s && score <= d.e;
  });
  /* prima scelta: le distro indicate per quell'uso, nell'ordine
     in cui le preferisco; poi le altre valide. */
  const preferite = [];
  uso.serve.forEach(function(n){
    const d = compatibili.filter(function(x){ return x.n === n; })[0];
    if (d) preferite.push(d);
  });
  const altre = compatibili.filter(function(d){ return preferite.indexOf(d) === -1; })
    .sort(function(a, b){ return (b.top || 0) - (a.top || 0) || a.n.localeCompare(b.n); });

  /* Sotto i 4 GB la priorità è ridurre il carico del desktop. Sui 32 bit
     il catalogo è limitato e l'utente deve controllare il supporto attuale. */
  let classificate;
  if (bit32){
    classificate = compatibili.slice().sort(function(a, b){
      return (b.top || 0) - (a.top || 0);
    });
  } else if (ram <= 3){
    classificate = preferite.concat(altre);
  } else {
    classificate = preferite.concat(altre);
  }

  /* Macchina troppo debole per qualsiasi distro installabile:
     meglio dirlo che proporre qualcosa che non parte. */
  if (!classificate.length){
    $("lxEsito").innerHTML =
      '<div class="callout errore"><h3>La stima non trova una distribuzione adatta</h3><p>' +
      "Con " + ram + " GB di RAM e <b>" + cpu.n + "</b> (del " + cpu.y + ") non trovo nel catalogo una distribuzione che superi i criteri indicativi. " +
      "I requisiti reali dipendono dalla release, dal desktop e dai programmi che vuoi usare.</p>" +
      "<p>Prova una distribuzione supportata in modalità Live e verifica la compatibilità; puoi anche aumentare la RAM se il PC lo consente " +
      "oppure usarlo come client di un servizio remoto.</p></div>" +
      '<div class="paginv" style="margin-top:22px"><a href="../#calcolatore"><b>🖥️ Calcolatore</b><span>Il verdetto completo su questo PC</span></a></div>';
    return;
  }

  const scelta = classificate[0];

  /* --- verdetto --- */
  let verdetto, classe;
  if (bit32){
    classe = "attenzione";
    verdetto = "<h3>Macchina a 32 bit: verifica l'immagine prima di installare</h3><p><b>" + cpu.n +
      "</b> è del " + cpu.y + " e non supporta x86-64. Le opzioni installabili a 32 bit sono limitate. antiX 26.1 e Debian 12 i386 sono possibili candidati, ma differiscono per supporto e compatibilità; Debian 12 richiede almeno una CPU i686 e riceve LTS fino a giugno 2028. Controlla le istruzioni richieste e prova la modalità Live.</p>" +
      "<p>Per navigazione e servizi online controlla che sistema e browser ricevano aggiornamenti. Il calcolatore non garantisce il supporto di applicazioni AI moderne su CPU a 32 bit.</p>";
  } else if (ram <= 3){
    classe = "attenzione";
    verdetto = "<h3>Memoria limitata: prova il sistema dal vivo</h3><p>Con " + ram + " GB la memoria disponibile per browser e programmi può essere limitata. La CPU <b>" + cpu.n +
      "</b> è a 64 bit; requisiti e consumo variano per release e configurazione. Prova una USB Live, misura la memoria libera e verifica rete, grafica, audio e sospensione prima di installare.</p>";
  } else if (ram <= 6){
    classe = "info";
    verdetto = "<h3>Prova una distribuzione adatta al tuo uso</h3><p>Con " + ram +
      " GB puoi valutare ambienti diversi, ma il consumo dipende da release, servizi e applicazioni aperte. Prova in modalità Live prima di installare e controlla quanta memoria rimane nei programmi che usi.</p>";
  } else {
    classe = "ok";
    verdetto = "<h3>Più opzioni a 64 bit</h3><p>Con " + ram +
      " GB di RAM e <b>" + cpu.n + "</b> hai diverse opzioni Linux. Prova una release supportata in modalità Live e verifica che applicazioni e periferiche funzionino prima di installarla.</p>";
  }

  /* --- la scheda della distro consigliata --- */
  const riga = function(a, b, c){
    return '<div class="d-row"><div class="dn">' + a + '</div><div class="db">' + b + '</div><div class="dd">' + (c || "") + "</div></div>";
  };
  let blocco = "";
  if (scelta){
    blocco = '<h3 style="margin-top:22px">La tua scelta: ' + scelta.n + "</h3><div class=\"distro\">" +
      riga("Scaricala da", "<a href='https://" + (LX_SITO[scelta.n] || "") + "' target='_blank' rel='noopener'>" + (LX_SITO[scelta.n] || "sito ufficiale") + "</a>",
        "Scegli l'immagine <b>" + (scelta.b32 ? "i586 / 32 bit" : "64 bit (amd64)") + "</b>: scaricare la versione sbagliata è l'errore più comune.") +
      riga("Spazio e requisiti", "verifica la release", "Consulta la documentazione ufficiale della versione scelta: spazio richiesto e requisiti cambiano tra distribuzioni e release.") +
      riga("RAM a riposo", lxRiposo(),
        "Non c'è una misura universale: prova la modalità Live e controlla la memoria libera sul tuo PC.") +
      riga("Perché proprio questa", scelta.d, "") +
      "</div>";
  }

  /* --- altre opzioni valide --- */
  let alternative = "";
  if (classificate.length > 1){
    alternative = '<h3 style="margin-top:24px">Altre scelte valide per la tua macchina</h3><div class="cards">' +
      classificate.slice(1, 4).map(function(d){
        return '<div class="mcard"><div class="mf">Requisiti della release da verificare</div><h3>' + d.n +
          '</h3><p>' + d.d + '</p><div class="mrow"><span>RAM a riposo <b>variabile</b></span>' +
          "<a href='https://" + (LX_SITO[d.n] || "") + "' target='_blank' rel='noopener'>Sito ufficiale ↗</a></div></div>";
      }).join("") + "</div>";
  }

  /* --- note sul tuo caso --- */
  const note = [];
  note.push("<b>Uso previsto:</b> " + uso.nome + ". " + uso.nota);
  if (!cpu.arm && cpu.avx < 2){
    note.push("<b>Questa CPU non ha AVX2.</b> Per Windows x64 LM Studio lo indica tra i requisiti; il pacchetto Linux x64 lo include per impostazione predefinita. La compatibilità degli altri runtime, incluso Ollama, varia con build e backend: verifica i requisiti prima di pianificare l'AI locale.");
  }
  if (ram <= 8 && cpu.avx > 0){
    note.push("<b>Per l'AI locale:</b> Linux può lasciare più RAM disponibile in alcune configurazioni, ma il risultato dipende da desktop, driver e programmi. Controlla la memoria libera effettiva dopo l'avvio.");
  }
  if (portatile){
    note.push("<b>È un portatile:</b> prova batteria, Wi-Fi, sospensione e luminosità dalla modalità Live. Consumi e autonomia dipendono da firmware, driver, stato della batteria e carico.");
  }
  if (win){
    note.push("<b>Dual boot:</b> prima fai un backup e ridimensiona la partizione Windows dagli strumenti di Windows. Lascia lo spazio richiesto dalla distribuzione e dall'uso previsto, poi segui la procedura ufficiale per installarla a fianco. Un errore di partizionamento può rendere il sistema non avviabile: controlla attentamente le schermate prima di confermare.");
  } else {
    note.push("<b>Sostituisce Windows:</b> fai prima un backup completo, poi usa «Cancella disco e installa». La modalità Live ti permette di provare tutto senza toccare nulla.");
  }
  if (ram <= 8){
    note.push("<b>Possibili aggiornamenti:</b> se il PC lo consente, più RAM o un SSD possono migliorare l’esperienza. Verifica tipo e capacità massima della memoria, formato e interfaccia del disco, poi controlla compatibilità e prezzi prima dell’acquisto.");
  }

  $("lxEsito").innerHTML =
    '<div class="callout ' + classe + '">' + verdetto + "</div>" +
    blocco + alternative +
    '<h3 style="margin-top:24px">Note sulla tua situazione</h3><div class="nota"><ul style="list-style:none;display:grid;gap:9px">' +
    note.map(function(n){ return "<li>• " + n + "</li>"; }).join("") + "</ul></div>" +
    '<div class="paginv" style="margin-top:22px">' +
    '<a href="../#calcolatore"><b>🖥️ Calcolatore</b><span>Il verdetto completo su Linux, AI e Windows</span></a>' +
    '<a href="../lm-studio-pc-vecchio/"><b>🤖 LM Studio su PC vecchio</b><span>Il passo successivo: modelli AI</span></a>' +
    "</div>";
}

function lxAzzera(){
  popolaSel($("lxRam"), RAM_VALS, " GB", 4);
  popolaOptgroup($("lxCpu"), DB_GRUPPI_CPU, DB_CPU, "Core 2 Duo E8400");
  $("lxUso").value = "navigare";
  $("lxWin").value = "si";
  $("lxPortatile").value = "no";
  $("lxEsito").innerHTML = "";
}

document.addEventListener("DOMContentLoaded", function(){
  popolaSel($("lxRam"), RAM_VALS, " GB", 4);
  popolaOptgroup($("lxCpu"), DB_GRUPPI_CPU, DB_CPU, "Core 2 Duo E8400");
});
