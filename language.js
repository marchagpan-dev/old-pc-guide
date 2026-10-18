/* Seleziona la versione in base alla lingua principale del browser.
   Una lingua scelta manualmente è indicata da ?lang=it o ?lang=en e segue
   i collegamenti interni; un URL senza parametro torna alla scelta automatica. */
(function () {
  "use strict";

  const routes = {
    "/": { en: "/", it: "/it/" },
    "/lm-studio-old-pc/": { en: "/lm-studio-old-pc/", it: "/it/lm-studio-pc-vecchio/" },
    "/linux-old-pcs/": { en: "/linux-old-pcs/", it: "/it/linux-per-pc-datati/" },
    "/best-local-ai-models/": { en: "/best-local-ai-models/", it: "/it/migliori-modelli-ai-locali/" },
    "/ollama-vs-lm-studio/": { en: "/ollama-vs-lm-studio/", it: "/it/ollama-vs-lm-studio/" },
    "/about/": { en: "/about/", it: "/it/chi-siamo/" },
    "/privacy-policy/": { en: "/privacy-policy/", it: "/it/privacy-policy/" },
    "/methodology/": { en: "/methodology/", it: "/it/metodo-stime/" }
  };

  const englishToItalian = Object.fromEntries(
    Object.values(routes).map(route => [route.en, route.it])
  );
  const italianToEnglish = Object.fromEntries(
    Object.values(routes).map(route => [route.it, route.en])
  );

  const url = new URL(window.location.href);
  const requested = url.searchParams.get("lang");
  const manualLanguage = requested === "it" || requested === "en" ? requested : null;
  if (requested !== null && !manualLanguage) url.searchParams.delete("lang");

  const browserLanguage = (window.navigator.languages && window.navigator.languages[0])
    || window.navigator.language
    || "en";
  const desired = manualLanguage || (/^it(?:-|$)/i.test(browserLanguage) ? "it" : "en");

  let path = url.pathname.replace(/index\.html$/i, "");
  if (path === "") path = "/";
  if (path === "/it") path = "/it/";
  if (!path.endsWith("/") && (englishToItalian[path + "/"] || italianToEnglish[path + "/"])) {
    path += "/";
  }

  const currentIsItalian = /^\/it(?:\/|$)/i.test(path);
  const targetPath = desired === "it"
    ? (currentIsItalian ? path : englishToItalian[path])
    : (currentIsItalian ? italianToEnglish[path] : path);

  if (targetPath && targetPath !== url.pathname) {
    window.location.replace(targetPath + url.search + url.hash);
    return;
  }

  if (requested !== null && !manualLanguage) {
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  if (manualLanguage && typeof document !== "undefined") {
    function addManualLanguage(anchor) {
      if (!anchor || anchor.hasAttribute("hreflang")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.searchParams.has("lang")) return;
      if (destination.pathname === url.pathname && destination.hash) return;
      destination.searchParams.set("lang", manualLanguage);
      anchor.href = destination.href;
    }

    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll("a[href]").forEach(addManualLanguage);
    }, { once: true });

    function preserveManualLanguage(event) {
      const target = event.target;
      addManualLanguage(target && typeof target.closest === "function"
        ? target.closest("a[href]")
        : null);
    }

    document.addEventListener("pointerdown", preserveManualLanguage, true);
    document.addEventListener("click", preserveManualLanguage, true);
    document.addEventListener("auxclick", preserveManualLanguage, true);
  }
})();
