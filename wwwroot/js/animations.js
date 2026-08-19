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

    function initHeroIntro() {
        var intro = document.querySelector(".hero__intro");
        var smile = document.querySelector(".hero__smile");
        if (!intro || !smile) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            intro.classList.add("is-done");
            smile.classList.add("is-visible");
            return;
        }

        var INTRO_MS = 2600;
        var baseSrc = intro.getAttribute("src").split("?")[0];

        function finishIntro() {
            intro.classList.add("is-done");
            smile.classList.add("is-visible");
        }

        function startIntro() {
            intro.classList.remove("is-done");
            smile.classList.remove("is-visible");

            if (intro._introTimer) {
                clearTimeout(intro._introTimer);
            }

            intro._introTimer = setTimeout(finishIntro, INTRO_MS);
        }

        function whenReady(forceReplay) {
            if (forceReplay) {
                intro.src = baseSrc + "?v=2&t=" + Date.now();
                intro.addEventListener("load", startIntro, { once: true });
                return;
            }

            if (intro.complete && intro.naturalWidth > 0) {
                startIntro();
            } else {
                intro.addEventListener("load", startIntro, { once: true });
            }
        }

        if (!intro.dataset.heroBound) {
            intro.dataset.heroBound = "1";
            whenReady(false);
        } else {
            whenReady(true);
        }
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

    function initNumeros() {
        var stage = document.querySelector(".numeros__stage");
        if (!stage) return;

        var gallery = stage.querySelector(".numeros__gallery");
        var mobileMq = window.matchMedia("(max-width: 900px)");

        function isMobile() {
            return mobileMq.matches;
        }

        function openGapPx() {
            var w = gallery ? gallery.clientWidth : stage.clientWidth;
            return Math.round(Math.min(40, Math.max(18, w * 0.024)));
        }

        /** Distribuye capturas como flex+gap, pero en absolute para poder animar left (desktop) */
        function applyOpenLayout() {
            if (!gallery || isMobile()) return;
            var cards = gallery.querySelectorAll(".numeros__card");
            if (!cards.length) return;

            var gap = openGapPx();
            var widths = [];
            var total = 0;
            for (var i = 0; i < cards.length; i++) {
                var w = cards[i].offsetWidth || 0;
                widths.push(w);
                total += w;
            }

            var free = gallery.clientWidth - total - gap * (cards.length - 1);
            var x = Math.max(8, free / 2);

            for (var j = 0; j < cards.length; j++) {
                var center = x + widths[j] / 2;
                var pct = gallery.clientWidth ? (center / gallery.clientWidth) * 100 : 50;
                cards[j].style.left = pct.toFixed(3) + "%";
                cards[j].style.setProperty("--card-rot", "0deg");
                x += widths[j] + gap;
            }
        }

        function clearOpenLayout() {
            if (!gallery) return;
            gallery.querySelectorAll(".numeros__card").forEach(function (card) {
                card.style.removeProperty("left");
                card.style.removeProperty("top");
                card.style.removeProperty("--card-rot");
                card.style.removeProperty("transform");
            });
            stage.style.removeProperty("height");
        }

        function setOpen(open) {
            if (open) {
                stage.classList.add("is-open");
                if (!isMobile()) {
                    requestAnimationFrame(function () {
                        applyOpenLayout();
                    });
                }
            } else {
                clearOpenLayout();
                stage.classList.remove("is-open");
            }
            stage.setAttribute("aria-expanded", open ? "true" : "false");
        }

        if (!stage.dataset.numerosBound) {
            stage.dataset.numerosBound = "1";
            stage.setAttribute("role", "button");
            stage.setAttribute("aria-expanded", "false");

            stage.addEventListener("click", function () {
                setOpen(!stage.classList.contains("is-open"));
            });

            stage.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(!stage.classList.contains("is-open"));
                }
            });

            window.addEventListener("resize", function () {
                if (!stage.classList.contains("is-open")) return;
                if (isMobile()) {
                    clearOpenLayout();
                    stage.classList.add("is-open");
                } else {
                    applyOpenLayout();
                }
            });
        }

        function markReady() {
            if (stage.classList.contains("is-visible")) {
                setTimeout(function () { stage.classList.add("is-ready"); }, 700);
            }
        }

        if (stage.classList.contains("is-visible")) {
            markReady();
            return;
        }

        if ("MutationObserver" in window && !stage._numerosMo) {
            stage._numerosMo = new MutationObserver(markReady);
            stage._numerosMo.observe(stage, { attributes: true, attributeFilter: ["class"] });
        }
        markReady();
    }

    function init() {
        initReveal();
        initNav();
        initScrollTop();
        initHeroIntro();
        initProceso();
        initNumeros();
    }

    if (document.readyState !== "loading") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
    // Re-inicializa tras navegación mejorada de Blazor.
    document.addEventListener("blazor:enhancedload", init);
})();
