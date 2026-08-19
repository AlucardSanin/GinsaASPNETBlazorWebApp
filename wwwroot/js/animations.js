// Arrieta — capa de interacción: scroll-reveal + estado del nav.
(function () {
    "use strict";

    function initReveal() {
        var els = document.querySelectorAll(".reveal:not(.is-visible)");
        if (!("IntersectionObserver" in window)) {
            els.forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
        els.forEach(function (el) { io.observe(el); });
    }

    function initNav() {
        var nav = document.querySelector(".site-nav");
        if (!nav) return;
        var onScroll = function () {
            nav.classList.toggle("is-scrolled", window.scrollY > 40);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    function initScrollTop() {
        var btn = document.querySelector(".scroll-top");
        var hero = document.querySelector(".hero");
        if (!btn) return;

        if (!btn.dataset.bound) {
            btn.dataset.bound = "1";
            btn.addEventListener("click", function () {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }

        if (!hero) return;

        var onScroll = function () {
            var heroBottom = hero.getBoundingClientRect().bottom;
            btn.classList.toggle("is-hidden", heroBottom > window.innerHeight * 0.85);
        };

        if (!window._scrollTopHandler) {
            window._scrollTopHandler = onScroll;
            window.addEventListener("scroll", onScroll, { passive: true });
        }
        onScroll();
    }

    function initProceso() {
        var section = document.querySelector(".proceso");
        if (!section) return;

        var cards = Array.prototype.slice.call(section.querySelectorAll(".step-card"));
        var bgs = Array.prototype.slice.call(section.querySelectorAll(".proceso__bg"));
        var total = cards.length;
        if (!total) return;

        function setStep(index) {
            var next = ((index % total) + total) % total;
            section.dataset.step = String(next);

            cards.forEach(function (card, i) {
                card.classList.toggle("is-active", i === next);
                card.classList.toggle("is-past", i < next);
                card.classList.toggle("is-next", i === next + 1);
                card.classList.toggle("is-far", i > next + 1);
                if (i === next) {
                    card.setAttribute("aria-current", "true");
                } else {
                    card.removeAttribute("aria-current");
                }
            });

            bgs.forEach(function (bg, i) {
                bg.classList.toggle("is-active", i === next);
            });
        }

        if (!section.dataset.procesoBound) {
            section.dataset.procesoBound = "1";

            // Evita el menú flotante de imagen (Edge/Copilot) al interactuar con los stickers
            section.querySelectorAll(".step-card__art img").forEach(function (img) {
                img.setAttribute("draggable", "false");
                img.addEventListener("dragstart", function (e) { e.preventDefault(); });
            });

            section.addEventListener("click", function (e) {
                var past = e.target.closest(".step-card.is-past");
                if (past) {
                    setStep(Number(past.dataset.step));
                    return;
                }
                var current = Number(section.dataset.step || "0");
                setStep(current + 1);
            });

            section.addEventListener("keydown", function (e) {
                var current = Number(section.dataset.step || "0");
                if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setStep(current + 1);
                } else if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    setStep(current - 1);
                } else if (e.key === "Home") {
                    e.preventDefault();
                    setStep(0);
                } else if (e.key === "End") {
                    e.preventDefault();
                    setStep(total - 1);
                }
            });
        }

        setStep(Number(section.dataset.step || "0"));
    }

    function initResenas() {
        var root = document.querySelector("[data-resenas-carousel]");
        if (!root) return;

        var track = root.querySelector("[data-resenas-track]");
        var cards = Array.prototype.slice.call(root.querySelectorAll("[data-resenas-card]"));
        var dotsWrap = root.querySelector("[data-resenas-dots]");
        var prevBtn = root.querySelector("[data-resenas-prev]");
        var nextBtn = root.querySelector("[data-resenas-next]");
        if (!track || !cards.length || !dotsWrap) return;

        var index = Number(root.dataset.resenasIndex || "0") || 0;

        function perView() {
            return window.matchMedia("(min-width: 901px)").matches ? Math.min(2, cards.length) : 1;
        }

        function maxIndex() {
            return Math.max(0, cards.length - perView());
        }

        function renderDots() {
            var pages = maxIndex() + 1;
            dotsWrap.innerHTML = "";
            for (var i = 0; i < pages; i++) {
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "resenas__dot" + (i === index ? " is-active" : "");
                btn.setAttribute("aria-label", "Ir a grupo " + (i + 1));
                btn.dataset.resenasDot = String(i);
                dotsWrap.appendChild(btn);
            }
        }

        function goTo(next) {
            index = Math.max(0, Math.min(maxIndex(), next));
            root.dataset.resenasIndex = String(index);
            var card = cards[0];
            var gap = parseFloat(getComputedStyle(track).gap) || 18;
            var step = card.getBoundingClientRect().width + gap;
            track.style.transform = "translateX(" + (-index * step) + "px)";
            renderDots();
        }

        if (!root.dataset.resenasBound) {
            root.dataset.resenasBound = "1";

            if (prevBtn) {
                prevBtn.addEventListener("click", function () { goTo(index - 1); });
            }
            if (nextBtn) {
                nextBtn.addEventListener("click", function () { goTo(index + 1); });
            }
            dotsWrap.addEventListener("click", function (e) {
                var t = e.target.closest("[data-resenas-dot]");
                if (!t) return;
                goTo(Number(t.dataset.resenasDot) || 0);
            });
            window.addEventListener("resize", function () {
                goTo(Math.min(index, maxIndex()));
            });
        }

        goTo(index);
    }

    function init() {
        initReveal();
        initNav();
        initScrollTop();
        initProceso();
        initResenas();
    }

    if (document.readyState !== "loading") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
    // Re-inicializa tras navegación mejorada de Blazor.
    document.addEventListener("blazor:enhancedload", init);
})();
