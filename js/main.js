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
        diagram.querySelectorAll(".layer").forEach((g) => g.classList.toggle("on", ids.includes(g.id)));
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
        if (isMobile()) { stage.style.top = ""; return; }
        stage.style.top = Math.max(84, (window.innerHeight - stage.offsetHeight) / 2) + "px";
      };
      // Móvil: cada paso lleva su propio mini-diagrama, encuadrado a su zona y sin capas ajenas
      const clearMinis = () => pane.querySelectorAll(".mini-wrap").forEach((m) => m.remove());
      const buildMinis = () => {
        clearMinis();
        stepEls.forEach((step) => {
          const ids = (step.dataset.mlayers || step.dataset.layers).split(" ");
          const svg = diagram.cloneNode(true);
          const vb = step.dataset.focus.split(" ").map(Number);
          svg.setAttribute("viewBox", vb.join(" "));
          svg.style.aspectRatio = vb[2] + " / " + vb[3];
          svg.removeAttribute("id");
          svg.removeAttribute("aria-labelledby");
          svg.setAttribute("aria-hidden", "true");
          svg.querySelectorAll("title").forEach((t) => t.remove());
          const uid = "m" + (miniCount++);
          svg.querySelectorAll("marker").forEach((m) => { m.id = m.id + uid; });
          svg.querySelectorAll("[marker-end],[marker-start]").forEach((el) => {
            ["marker-end", "marker-start"].forEach((a) => {
              const v = el.getAttribute(a);
              if (v) el.setAttribute(a, v.replace(/\)$/, uid + ")"));
            });
          });
          svg.querySelectorAll(".layer").forEach((g) => {
            g.classList.toggle("on", ids.includes(g.id));
            g.classList.toggle("off", !ids.includes(g.id));
            g.removeAttribute("id");
          });
          const wrap = document.createElement("div");
          wrap.className = "mini-wrap";
          wrap.appendChild(svg);
          step.insertBefore(wrap, step.firstChild);
        });
      };
      const applyMode = () => {
        if (isMobile()) { if (io) io.disconnect(); buildMinis(); }
        else { clearMinis(); observe(); activate(pane.querySelector(".scrolly-step.active") || stepEls[0]); alignStage(); }
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
          clearMinis();
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

    // Scroll "imantado" (solo escritorio): una rueda/gesto avanza exactamente un paso del diagrama.
    // Fuera del primer y último paso el scroll es el normal, así que nunca atrapa la página.
    const desktopWheel = () => window.matchMedia("(min-width: 992px) and (pointer: fine)").matches;
    let lockUntil = 0;
    const centers = () => Array.from(panes[activeKey].querySelectorAll(".scrolly-step")).map((s) => {
      const r = s.getBoundingClientRect();
      return r.top + window.scrollY + r.height / 2;
    });
    const goTo = (centerY) => {
      window.scrollTo({ top: centerY - window.innerHeight / 2, behavior: reduce ? "auto" : "smooth" });
      lockUntil = performance.now() + 750;
    };
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || !desktopWheel() || Math.abs(e.deltaY) < 4) return;
      const now = performance.now();
      const c = centers();
      if (!c.length) return;
      const mid = window.scrollY + window.innerHeight / 2;
      const first = c[0], last = c[c.length - 1], half = window.innerHeight * 0.5;
      const down = e.deltaY > 0;
      // Fuera de la zona imantada: scroll normal
      if (mid < first - half || mid > last + half) return;
      // Mientras dura la animación (y la inercia del gesto) se ignora la rueda
      if (now < lockUntil) { lockUntil = Math.max(lockUntil, now + 140); e.preventDefault(); return; }
      let target = null;
      if (mid < first - 8) { if (down) target = 0; }                      // antes del primer paso
      else if (mid > last + 8) { if (!down) target = c.length - 1; }       // después del último paso
      else {
        let idx = 0;
        c.forEach((y, i) => { if (y <= mid + 8) idx = i; });
        if (down) { if (idx < c.length - 1) target = idx + 1; }
        else if (mid - c[idx] > 8) target = idx;
        else if (idx > 0) target = idx - 1;
      }
      if (target === null) return;                                         // extremos: scroll normal
      e.preventDefault();
      goTo(c[target]);
    }, { passive: false });
  }

  // Año dinámico en el footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
