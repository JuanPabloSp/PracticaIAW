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

  // Arquitecturas con scroll: pestañas + diagrama fijo cuyas capas se iluminan por pasos
  const archSection = document.getElementById("arquitectura");
  if (archSection) {
    const panes = {};
    archSection.querySelectorAll("[data-arch-pane]").forEach((el) => { panes[el.dataset.archPane] = el; });
    const tabs = archSection.querySelectorAll(".arch-tab");
    const isMobile = () => window.matchMedia("(max-width: 991px)").matches;
    let ctl = null; // controlador del panel activo

    const makeController = (pane) => {
      const diagram = pane.querySelector(".scrolly-svg");
      const stepEls = pane.querySelectorAll(".scrolly-step");
      const FULL = diagram.dataset.full.split(" ").map(Number);
      let current = FULL.slice(), raf = null, io = null;
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
        diagram.querySelectorAll(".layer").forEach((g) => g.classList.toggle("on", ids.includes(g.id)));
        tweenTo(isMobile() ? step.dataset.focus.split(" ").map(Number) : FULL);
      };
      const observe = () => {
        if (io) io.disconnect();
        // En móvil el diagrama fijo ocupa la parte alta: la franja activa baja para no quedar tapada
        const margin = isMobile() ? "-62% 0px -28% 0px" : "-45% 0px -45% 0px";
        io = new IntersectionObserver((entries) => {
          entries.forEach((e) => { if (e.isIntersecting) activate(e.target); });
        }, { rootMargin: margin, threshold: 0 });
        stepEls.forEach((s) => io.observe(s));
      };
      let lastMobile = isMobile();
      const onResize = () => {
        const act = pane.querySelector(".scrolly-step.active") || stepEls[0];
        tweenTo(isMobile() ? act.dataset.focus.split(" ").map(Number) : FULL);
        if (lastMobile !== isMobile()) { lastMobile = isMobile(); observe(); }
      };
      return {
        start() { current = FULL.slice(); setVB(current); observe(); activate(stepEls[0]); window.addEventListener("resize", onResize); },
        stop() { if (io) io.disconnect(); if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); },
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
  }

  // Año dinámico en el footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
