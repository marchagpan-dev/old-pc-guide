/* ============================================================
   linux.js — Linux distribution picker tool
   Reuses ../db.js: the same database as the main calculator,
   so the two tools can never contradict each other.
   ============================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const RAM_VALS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 128];

/* Reuse the selectors with optgroup like on the home page */
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
   What changes with the intended use. The filter is not about
   "choosing better": it changes the priority.
   ------------------------------------------------------------ */
const LX_USO = {
  navigare: {
    nome: "browsing and working",
    serve: ["Xubuntu", "Linux Mint XFCE", "Lubuntu (LXQt, supported release)", "Zorin OS 18.1 Lite"],
    nota: "For daily use simplicity matters: drivers that work on the first try and a recognizable desktop are worth more than 100 MB of RAM saved."
  },
  ai: {
    nome: "running AI models locally",
    serve: ["Linux Mint XFCE", "Lubuntu (LXQt, supported release)", "Debian stable (64-bit)", "Xubuntu"],
    nota: "For local AI what matters is the free memory after boot; desktop usage depends on version, drivers and services. Measure it on the PC before choosing a model."
  },
  scuola: {
    nome: "school, office and programming",
    serve: ["Linux Mint XFCE", "Zorin OS 18.1 Lite", "Xubuntu", "Debian stable (64-bit)"],
    nota: "If you come from Windows, Zorin has a familiar interface; Mint, Xubuntu and Debian are widely used options. On a laptop check drivers, suspend and battery life from Live mode."
  },
  server: {
    nome: "home server, always on",
    serve: ["Debian stable (64-bit)", "Linux Mint XFCE", "antiX 26.1 (32-bit)"],
    nota: "A server can do without the desktop. First check the requirements and the AI runtime compatibility with CPU, RAM and architecture; 32-bit CPUs have very limited options and support."
  }
};

/* The right official site for each distribution: sending
   someone to the wrong page is the fastest way to make them
   waste half an hour. */
const LX_SITO = {
  "antiX 26.1 (32-bit)": "antixlinux.com/download/",
  "Debian 12 i386 (LTS until 2028)": "debian.org/releases/bookworm/",
  "Linux Mint XFCE": "linuxmint.com/download.php",
  "Xubuntu": "xubuntu.org/download",
  "Lubuntu (LXQt, supported release)": "lubuntu.me/download",
  "Zorin OS 18.1 Lite": "help.zorin.com/docs/getting-started/getting-zorin-os-lite/",
  "Debian stable (64-bit)": "debian.org/CD/index.it.html",
  "Ubuntu LTS (64-bit)": "ubuntu.com/download/desktop",
  "Fedora Workstation": "fedoraproject.org/workstation/download",
  "Manjaro / Arch": "manjaro.org/download"
};
function lxRiposo(){ return "variable"; }

function lxScegli(){
  const ram = Number($("lxRam").value);
  const cpu = cerca(DB_CPU, $("lxCpu").value);
  const uso = LX_USO[$("lxUso").value];
  const win = $("lxWin").value === "si";
  const portatile = $("lxPortatile").value === "si";

  if (!cpu){ $("lxEsito").innerHTML = '<div class="callout errore">Choose a processor.</div>'; return; }

  if (cpu.b32 === null){
    $("lxEsito").innerHTML = '<div class="callout attenzione"><h3>Check the CPU architecture</h3><p>The selected profile is generic and isn’t enough to determine whether the processor supports x86-64. Check the full model with CPU-Z or <code>lscpu</code>, then verify the distribution requirements and choose the correct 32 or 64-bit image.</p><p>Don’t install an image before doing this check. You can try a Live USB without modifying the disk.</p></div>';
    return;
  }

  const bit32 = cpu.b32 === 1;
  const score = db_punteggioPc(ram, cpu);

  /* All the distros compatible with this machine: the 32-bit
     filter is explicit, because confusing it is the most serious error. */
  let compatibili = DB_DISTRO.filter(function(d){
    if (!!d.b32 !== bit32) return false;
    return score >= d.s && score <= d.e;
  });
  /* first choice: the distros suggested for that use, in the order
     I prefer them; then the other valid ones. */
  const preferite = [];
  uso.serve.forEach(function(n){
    const d = compatibili.filter(function(x){ return x.n === n; })[0];
    if (d) preferite.push(d);
  });
  const altre = compatibili.filter(function(d){ return preferite.indexOf(d) === -1; })
    .sort(function(a, b){ return (b.top || 0) - (a.top || 0) || a.n.localeCompare(b.n); });

  /* Under 4 GB the priority is reducing the desktop load. On 32-bit
     the catalog is limited and the user must check current support. */
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

  /* Machine too weak for any installable distro:
     better to say it than suggest something that won't start. */
  if (!classificate.length){
    $("lxEsito").innerHTML =
      '<div class="callout errore"><h3>The estimate doesn’t find a suitable distribution</h3><p>' +
      "With " + ram + " GB of RAM and <b>" + cpu.n + "</b> (from " + cpu.y + ") I don't find in the catalog a distribution that meets the indicative criteria. " +
      "The real requirements depend on the release, the desktop and the programs you want to use.</p>" +
      "<p>Try a supported distribution in Live mode and check compatibility; you can also add RAM if the PC allows it " +
      "or use it as a client of a remote service.</p></div>" +
      '<div class="paginv" style="margin-top:22px"><a href="../#calcolatore"><b>🖥️ Calculator</b><span>The complete verdict on this PC</span></a></div>';
    return;
  }

  const scelta = classificate[0];

  /* --- verdict --- */
  let verdetto, classe;
  if (bit32){
    classe = "attenzione";
    verdetto = "<h3>32-bit machine: check the image before installing</h3><p><b>" + cpu.n +
      "</b> is from " + cpu.y + " and doesn't support x86-64. Installable 32-bit options are limited. antiX 26.1 and Debian 12 i386 are possible candidates, but they differ in support and compatibility; Debian 12 requires at least an i686 CPU and gets LTS until June 2028. Check the required CPU instructions and try Live mode.</p>" +
      "<p>For browsing and online services make sure the system and browser receive updates. The calculator doesn't guarantee support for modern AI applications on 32-bit CPUs.</p>";
  } else if (ram <= 3){
    classe = "attenzione";
    verdetto = "<h3>Limited memory: try the system live</h3><p>With " + ram + " GB the memory available for browsers and programs can be limited. The CPU <b>" + cpu.n +
      "</b> is 64-bit; requirements and usage vary by release and configuration. Try a Live USB, measure the free memory and check network, graphics, audio and suspend before installing.</p>";
  } else if (ram <= 6){
    classe = "info";
    verdetto = "<h3>Try a distribution suited to your use</h3><p>With " + ram +
      " GB you can evaluate different environments, but usage depends on release, services and open applications. Try Live mode before installing and check how much memory remains in the programs you use.</p>";
  } else {
    classe = "ok";
    verdetto = "<h3>More 64-bit options</h3><p>With " + ram +
      " GB of RAM and <b>" + cpu.n + "</b> you have several Linux options. Try a supported release in Live mode and check that applications and peripherals work before installing it.</p>";
  }

  /* --- the recommended distro card --- */
  const riga = function(a, b, c){
    return '<div class="d-row"><div class="dn">' + a + '</div><div class="db">' + b + '</div><div class="dd">' + (c || "") + "</div></div>";
  };
  let blocco = "";
  if (scelta){
    blocco = '<h3 style="margin-top:22px">Your choice: ' + scelta.n + "</h3><div class=\"distro\">" +
      riga("Download it from", "<a href='https://" + (LX_SITO[scelta.n] || "") + "' target='_blank' rel='noopener'>" + (LX_SITO[scelta.n] || "official site") + "</a>",
        "Choose the <b>" + (scelta.b32 ? "i586 / 32 bit" : "64 bit (amd64)") + "</b> image: downloading the wrong version is the most common mistake.") +
      riga("Space and requirements", "check the release", "Consult the official documentation of the chosen version: required space and requirements change between distributions and releases.") +
      riga("Idle RAM", lxRiposo(),
        "There's no universal measure: try Live mode and check the free memory on your PC.") +
      riga("Why this one", scelta.d, "") +
      "</div>";
  }

  /* --- other valid options --- */
  let alternative = "";
  if (classificate.length > 1){
    alternative = '<h3 style="margin-top:24px">Other valid choices for your machine</h3><div class="cards">' +
      classificate.slice(1, 4).map(function(d){
        return '<div class="mcard"><div class="mf">Release requirements to check</div><h3>' + d.n +
          '</h3><p>' + d.d + '</p><div class="mrow"><span>Idle RAM <b>variable</b></span>' +
          "<a href='https://" + (LX_SITO[d.n] || "") + "' target='_blank' rel='noopener'>Official site ↗</a></div></div>";
      }).join("") + "</div>";
  }

  /* --- notes on your case --- */
  const note = [];
  note.push("<b>Intended use:</b> " + uso.nome + ". " + uso.nota);
  if (!cpu.arm && cpu.avx < 2){
    note.push("<b>This CPU doesn't have AVX2.</b> For Windows x64 LM Studio lists it among the requirements; the Linux x64 package includes it by default. The compatibility of other runtimes, including Ollama, varies with build and backend: check the requirements before planning local AI.");
  }
  if (ram <= 8 && cpu.avx > 0){
    note.push("<b>For local AI:</b> Linux can leave more RAM available in some configurations, but the result depends on desktop, drivers and programs. Check the actual free memory after boot.");
  }
  if (portatile){
    note.push("<b>It's a laptop:</b> test battery, Wi-Fi, suspend and brightness from Live mode. Usage and battery life depend on firmware, drivers, battery state and load.");
  }
  if (win){
    note.push("<b>Dual boot:</b> first make a backup and resize the Windows partition from the Windows tools. Leave the space required by the distribution and the intended use, then follow the official procedure to install it alongside. A partitioning mistake can make the system unbootable: check the screens carefully before confirming.");
  } else {
    note.push("<b>Replaces Windows:</b> first make a complete backup, then use «Erase disk and install». Live mode lets you try everything without touching anything.");
  }
  if (ram <= 8){
    note.push("<b>Possible upgrades:</b> if the PC allows it, more RAM or an SSD can improve the experience. Check the type and maximum capacity of the memory, the disk format and interface, then check compatibility and prices before buying.");
  }

  $("lxEsito").innerHTML =
    '<div class="callout ' + classe + '">' + verdetto + "</div>" +
    blocco + alternative +
    '<h3 style="margin-top:24px">Notes on your situation</h3><div class="nota"><ul style="list-style:none;display:grid;gap:9px">' +
    note.map(function(n){ return "<li>• " + n + "</li>"; }).join("") + "</ul></div>" +
    '<div class="paginv" style="margin-top:22px">' +
    '<a href="../#calcolatore"><b>🖥️ Calculator</b><span>The complete verdict on Linux, AI and Windows</span></a>' +
    '<a href="../lm-studio-old-pc/"><b>🤖 LM Studio on an Old PC</b><span>The next step: AI models</span></a>' +
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