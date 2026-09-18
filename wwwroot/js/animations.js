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

    function initMarcasTypewriter() {
        var layer = document.querySelector("[data-marcas-typewriter]");
        var wordEl = document.querySelector("[data-marcas-typewriter-word]");
        var section = document.querySelector(".marcas");
        if (!layer || !wordEl || !section) return;

        var words = Array.prototype.map.call(
            layer.querySelectorAll("[data-word]"),
            function (el) { return (el.getAttribute("data-word") || "").trim(); }
        ).filter(Boolean);
        if (!words.length) return;

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            wordEl.textContent = words[0];
            return;
        }

        if (layer.dataset.typewriterBound === "1") return;
        layer.dataset.typewriterBound = "1";

        var wordIndex = 0;
        var charIndex = 0;
        var deleting = false;
        var pauseUntil = 0;
        var visible = false;
        var raf = 0;
        var lastTick = 0;

        function currentWord() {
            return words[wordIndex % words.length] || "";
        }

        function tick(now) {
            raf = window.requestAnimationFrame(tick);
            if (!visible) return;
            if (now < pauseUntil) return;
            if (now - lastTick < (deleting ? 32 : 72)) return;
            lastTick = now;

            var full = currentWord();
            if (!full) return;

            if (!deleting) {
                charIndex = Math.min(full.length, charIndex + 1);
                wordEl.textContent = full.slice(0, charIndex);
                if (charIndex >= full.length) {
                    deleting = true;
                    pauseUntil = now + 1400;
                }
            } else {
                charIndex = Math.max(0, charIndex - 1);
                wordEl.textContent = full.slice(0, charIndex);
                if (charIndex <= 0) {
                    deleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    pauseUntil = now + 280;
                }
            }
        }

        if ("IntersectionObserver" in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    visible = entry.isIntersecting;
                    if (visible && !raf) raf = window.requestAnimationFrame(tick);
                });
            }, { threshold: 0.25 });
            io.observe(section);
        } else {
            visible = true;
            raf = window.requestAnimationFrame(tick);
        }
    }

    function initResenas() {
        var root = document.querySelector("[data-resenas-carousel]");
        if (!root) return;

        var track = root.querySelector("[data-resenas-track]");
        var cards = Array.prototype.slice.call(root.querySelectorAll("[data-resenas-card]"));
        var dotsWrap = root.querySelector("[data-resenas-dots]");
        var viewport = root.querySelector(".resenas__viewport") || track.parentElement;
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

            dotsWrap.addEventListener("click", function (e) {
                var t = e.target.closest("[data-resenas-dot]");
                if (!t) return;
                goTo(Number(t.dataset.resenasDot) || 0);
            });
            window.addEventListener("resize", function () {
                goTo(Math.min(index, maxIndex()));
            });

            var startX = 0;
            var startY = 0;
            var swiping = false;

            function clearSelection() {
                var sel = window.getSelection && window.getSelection();
                if (sel && sel.removeAllRanges) sel.removeAllRanges();
            }

            viewport.addEventListener("selectstart", function (e) { e.preventDefault(); });
            viewport.addEventListener("dragstart", function (e) { e.preventDefault(); });
            viewport.addEventListener("pointerdown", function (e) {
                if (e.pointerType === "mouse" && e.button !== 0) return;
                startX = e.clientX;
                startY = e.clientY;
                swiping = true;
                clearSelection();
                viewport.setPointerCapture(e.pointerId);
            });
            viewport.addEventListener("pointermove", function () {
                if (swiping) clearSelection();
            });
            viewport.addEventListener("pointerup", function (e) {
                if (!swiping) return;
                swiping = false;
                clearSelection();
                var dx = e.clientX - startX;
                var dy = e.clientY - startY;
                if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
                goTo(index + (dx < 0 ? 1 : -1));
            });
            viewport.addEventListener("pointercancel", function () { swiping = false; });
        }

        goTo(index);
    }

    function initCreemosLogo() {
        var host = document.querySelector("[data-creemos-logo]");
        if (!host || host.dataset.creemosInlined) return;
        var img = host.querySelector(".creemos__logo--base, .creemos__logo");
        if (!img || !img.getAttribute("src")) return;

        fetch(img.getAttribute("src"), { credentials: "same-origin" })
            .then(function (res) { return res.ok ? res.text() : Promise.reject(); })
            .then(function (markup) {
                if (host.dataset.creemosInlined) return;
                var doc = new DOMParser().parseFromString(markup, "image/svg+xml");
                var svg = doc.querySelector("svg");
                if (!svg) return;
                host.dataset.creemosInlined = "1";
                svg.removeAttribute("width");
                svg.removeAttribute("height");
                svg.classList.add("creemos__logo", "creemos-svg");
                svg.setAttribute("role", "img");
                svg.setAttribute("aria-label", "Creemos juntos");
                img.replaceWith(svg);
            })
            .catch(function () { /* keep the raster/SVG <img> fallback */ });
    }

    function initCalendlyWarm() {
        var link = document.querySelector(".hero__calendly, a[href*='calendly.com']");
        if (!link) return;
        var url = link.getAttribute("href");
        if (!url || document.querySelector('link[data-calendly-warm]')) return;

        var warm = document.createElement("link");
        warm.rel = "prefetch";
        warm.href = url;
        warm.setAttribute("data-calendly-warm", "1");
        document.head.appendChild(warm);

        // Si el script ya está, tocamos la API en idle para que el primer click abra más rápido.
        function touch() {
            if (!window.Calendly) return;
            try {
                /* no-op: fuerza resolución del módulo en memoria */
                void window.Calendly.initPopupWidget;
            } catch (e) { /* ignore */ }
        }
        if (window.requestIdleCallback) window.requestIdleCallback(touch, { timeout: 2500 });
        else window.setTimeout(touch, 1200);
    }

    function init() {
        initReveal();
        initNav();
        initScrollTop();
        initProceso();
        initResenas();
        initMarcasTypewriter();
        initCreemosLogo();
        initCalendlyWarm();
    }

    if (document.readyState !== "loading") {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init);
    }
    // Re-inicializa tras navegación mejorada de Blazor.
    document.addEventListener("blazor:enhancedload", init);
})();
