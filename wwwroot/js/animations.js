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

    function init() {
        initReveal();
        initNav();
        initScrollTop();
        initHeroIntro();
    }

    if (document.readyState !== "loading") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
    // Re-inicializa tras navegación mejorada de Blazor.
    document.addEventListener("blazor:enhancedload", init);
})();
