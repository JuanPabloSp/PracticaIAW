// Animaciones de entrada: cada elemento aparece una sola vez al entrar en pantalla.
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = document.querySelectorAll(".reveal, .section-title, .timeline");

  // Escalonado automático dentro de cada contenedor con data-stagger
  document.querySelectorAll("[data-stagger]").forEach((box) => {
    box.querySelectorAll(".reveal").forEach((el, i) => el.style.setProperty("--d", i * 0.1 + "s"));
  });

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("show"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("show"); io.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  }

  // Barra de progreso de scroll
  const bar = document.getElementById("scrollProgress");
  function progress() {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (bar) bar.style.transform = "scaleX(" + p + ")";
  }
  window.addEventListener("scroll", progress, { passive: true });
  progress();

  // Efecto tilt 3D en las insignias (misma mecánica que la demo logosJPSP)
  if (!reduce) {
    document.querySelectorAll(".cert").forEach((card) => {
      const vis = card.querySelector(".cert-visual");
      if (!vis) return;
      card.addEventListener("mousemove", (e) => {
        const r = vis.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        vis.style.transform = `rotateX(${-y / 5}deg) rotateY(${x / 5}deg) scale(1.15) translateZ(30px)`;
      });
      card.addEventListener("mouseleave", () => { vis.style.transform = ""; });
    });
  }

  // Titular: mide el ancho real del nombre para que el cursor quede pegado al texto
  const name = document.getElementById("myname");
  if (name) {
    const start = () => {
      name.style.setProperty("--w", name.scrollWidth + "px");
      if (!reduce) name.classList.add("typing");
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(start);
  }

  // Titular que sigue al ratón con retraso suave (solo punteros finos)
  const hero = document.getElementById("inicio");
  const title = document.getElementById("heroTitle");
  if (hero && title && !reduce && window.matchMedia("(pointer: fine)").matches) {
    const FX = 40, FY = 20, EASE = 0.07;
    let cx = 0, cy = 0, tx = 0, ty = 0, running = false;
    const loop = () => {
      cx += (tx - cx) * EASE; cy += (ty - cy) * EASE;
      title.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * FX;
      ty = ((e.clientY - r.top) / r.height - 0.5) * FY;
      kick();
    });
    hero.addEventListener("mouseleave", () => { tx = 0; ty = 0; kick(); });
  }

  // Botón "Ver otros proyectos": cambia el texto según el estado
  const otros = document.getElementById("otros-proyectos");
  const btnOtros = document.getElementById("toggleOtros");
  if (otros && btnOtros) {
    const label = btnOtros.querySelector("[data-label]");
    otros.addEventListener("shown.bs.collapse", () => { label.textContent = "Ocultar otros proyectos"; });
    otros.addEventListener("hidden.bs.collapse", () => { label.textContent = "Ver otros proyectos (5)"; });
  }

  // Arquitecturas con scroll: pestañas + diagrama fijo (escritorio) o mini-diagrama por paso (móvil)
  const archSection = document.getElementById("arquitectura");
  if (archSection) {
    const panes = {};
    archSection.querySelectorAll("[data-arch-pane]").forEach((el) => { panes[el.dataset.archPane] = el; });
    const tabs = archSection.querySelectorAll(".arch-tab");
    const isMobile = () => window.matchMedia("(max-width: 991px)").matches;
    let ctl = null; // controlador del panel activo
    let miniCount = 0;
    let activeKey = "comandero";

    const makeController = (pane) => {
      const diagram = pane.querySelector(".scrolly-svg");
      const mobileSvg = pane.querySelector(".scrolly-svg-m");
      const useMobileSvg = () => isMobile() && !!mobileSvg;
      const stepEls = pane.querySelectorAll(".scrolly-step");
      const FULL = diagram.dataset.full.split(" ").map(Number);
      let current = FULL.slice(), raf = null, io = null, ro = null;
      const setVB = (v) => diagram.setAttribute("viewBox", v.map((n) => n.toFixed(1)).join(" "));
      const tweenTo = (target) => {
        if (raf) cancelAnimationFrame(raf);
        if (reduce) { current = target.slice(); setVB(current); return; }
        const from = current.slice(), t0 = performance.now(), D = 600;
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
          current = from.map((v, i) => v + (target[i] - v) * e);
          setVB(current);
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };
      const activate = (step) => {
        stepEls.forEach((s) => s.classList.toggle("active", s === step));
        const ids = step.dataset.layers.split(" ");
        pane.querySelectorAll(".layer").forEach((g) => g.classList.toggle("on", ids.includes(g.dataset.layer)));
        if (typeof fillCaption === "function") fillCaption(step);
        if (useMobileSvg()) { if (raf) cancelAnimationFrame(raf); }
        else tweenTo(isMobile() ? step.dataset.focus.split(" ").map(Number) : FULL);
      };
      const observe = () => {
        if (io) io.disconnect();
        io = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) activate(e.target); });
        }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
        stepEls.forEach((s) => io.observe(s));
      };
      // Escritorio: centra el diagrama fijo verticalmente en pantalla (alineado con el texto del paso)
      const stage = pane.querySelector(".scrolly-stage");
      const alignStage = () => {
        if (isMobile()) { stage.style.top = (document.getElementById("mainNav") ? document.getElementById("mainNav").offsetHeight : 64) + 8 + "px"; return; }
        stage.style.top = Math.max(84, (window.innerHeight - stage.offsetHeight) / 2) + "px";
      };
      // Móvil: el pie de la escena fija muestra el texto del paso activo
      const caption = document.createElement("div");
      caption.className = "scene-caption";
      caption.setAttribute("aria-live", "polite");
      stage.appendChild(caption);
      const fillCaption = (step) => {
        caption.innerHTML = '<span class="step-num">' + step.querySelector(".step-num").textContent + "</span><h3>" +
          step.querySelector("h3").innerHTML + "</h3><p>" + step.querySelector("p").innerHTML + "</p>";
      };
      const applyMode = () => {
        observe();
        activate(pane.querySelector(".scrolly-step.active") || stepEls[0]);
        alignStage();
      };
      let lastMobile = isMobile();
      const onResize = () => {
        if (lastMobile !== isMobile()) { lastMobile = isMobile(); applyMode(); }
        else alignStage();
      };
      return {
        start() {
          current = FULL.slice(); setVB(current);
          stepEls.forEach((s) => s.classList.remove("active"));
          activate(stepEls[0]);
          applyMode();
          if ("ResizeObserver" in window) { ro = new ResizeObserver(alignStage); ro.observe(stage); }
          window.addEventListener("resize", onResize);
        },
        stop() {
          if (io) io.disconnect(); if (ro) ro.disconnect(); if (raf) cancelAnimationFrame(raf);
          window.removeEventListener("resize", onResize);
        },
      };
    };

    const scrollToArch = () => {
      const top = archSection.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    };
    const setArch = (key, scroll) => {
      if (!panes[key]) return;
      if (ctl) ctl.stop();
      Object.entries(panes).forEach(([k, el]) => { el.hidden = k !== key; });
      tabs.forEach((t) => {
        const on = t.dataset.arch === key;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      activeKey = key;
      ctl = makeController(panes[key]);
      ctl.start();
      if (scroll) scrollToArch();
    };
    tabs.forEach((t) => t.addEventListener("click", () => setArch(t.dataset.arch, false)));
    // Botones "Ver arquitectura" de las tarjetas de proyecto
    document.querySelectorAll("a[data-arch]").forEach((a) => {
      a.addEventListener("click", (e) => { e.preventDefault(); setArch(a.dataset.arch, true); });
    });
    setArch("comandero", false);

    // Scroll "imantado": un gesto avanza exactamente un paso del diagrama (rueda en escritorio, deslizar en móvil).
    // Fuera del primer y último paso el scroll es el normal, así que nunca atrapa la página.
    const desktopWheel = () => window.matchMedia("(min-width: 992px) and (pointer: fine)").matches;
    let lockUntil = 0;
    const navH = () => (document.getElementById("mainNav") ? document.getElementById("mainNav").offsetHeight : 70) + 10;
    // Posiciones de scroll de cada paso: centrado en escritorio, bajo el menú en móvil
    const positions = () => Array.from(panes[activeKey].querySelectorAll(".scrolly-step")).map((st) => {
      const r = st.getBoundingClientRect();
      return r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
    });
    const goTo = (y) => {
      window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
      lockUntil = performance.now() + 750;
    };
    // Índice del paso al que saltar (o null = dejar el scroll normal)
    const stepTarget = (pos, down) => {
      const cur = window.scrollY, half = window.innerHeight * 0.5;
      const first = pos[0], last = pos[pos.length - 1];
      if (cur < first - half || cur > last + half) return null;
      if (cur < first - 8) return down ? 0 : null;
      if (cur > last + 8) return down ? null : pos.length - 1;
      let idx = 0;
      pos.forEach((y, i) => { if (y <= cur + 8) idx = i; });
      if (down) return idx < pos.length - 1 ? idx + 1 : null;
      if (cur - pos[idx] > 8) return idx;
      return idx > 0 ? idx - 1 : null;
    };

    // Escritorio: rueda / trackpad
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || !desktopWheel() || Math.abs(e.deltaY) < 4) return;
      const pos = positions();
      if (!pos.length) return;
      const now = performance.now();
      const cur = window.scrollY, half = window.innerHeight * 0.5;
      if (cur < pos[0] - half || cur > pos[pos.length - 1] + half) return;
      // Mientras dura la animación (y la inercia del gesto) se ignora la rueda
      if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 140); e.preventDefault(); return; }
      const t = stepTarget(pos, e.deltaY > 0);
      if (t === null) return;
      e.preventDefault();
      goTo(pos[t]);
    }, { passive: false });

    // Móvil: deslizar con el dedo
    let tStart = null; // { y, mode: "pending" | "page" | "native", target, pos }
    document.addEventListener("touchstart", (e) => {
      tStart = null;
      if (!isMobile() || e.touches.length !== 1) return;
      tStart = { y: e.touches[0].clientY, dy: 0, mode: "pending", target: null, pos: null };
    }, { passive: true });
    document.addEventListener("touchmove", (e) => {
      if (!tStart || tStart.mode === "native") return;
      const dy = e.touches[0].clientY - tStart.y;
      tStart.dy = dy;
      if (tStart.mode === "pending") {
        if (Math.abs(dy) < 8) return;
        const pos = positions();
        const half = window.innerHeight * 0.5;
        const inZone = pos.length && window.scrollY >= pos[0] - half && window.scrollY <= pos[pos.length - 1] + half;
        if (!inZone) { tStart.mode = "native"; return; }
        if (performance.now() < lockUntil) { tStart.mode = "page"; tStart.target = null; tStart.pos = pos; }
        else {
          const t = stepTarget(pos, dy < 0); // dedo hacia arriba = bajar
          if (t === null) { tStart.mode = "native"; return; }
          tStart.mode = "page"; tStart.target = t; tStart.pos = pos;
        }
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    document.addEventListener("touchend", () => {
      if (tStart && tStart.mode === "page" && tStart.target !== null && Math.abs(tStart.dy) >= 30) goTo(tStart.pos[tStart.target]);
      tStart = null;
    }, { passive: true });
    document.addEventListener("touchcancel", () => { tStart = null; }, { passive: true });
  }

  // Año dinámico en el footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
