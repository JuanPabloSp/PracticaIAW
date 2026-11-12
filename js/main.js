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

  // Año dinámico en el footer
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
