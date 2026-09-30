// Portafolio interactivo: fondos, parallax y collage de diseño.
(function () {
    "use strict";

    function initPortfolioPage() {
        var root = document.querySelector(".pf");
        if (!root) return;

        var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var sections = Array.prototype.slice.call(root.querySelectorAll("[data-bg]"));
        var abs = Array.prototype.slice.call(root.querySelectorAll("[data-depth]"));
        var devices = Array.prototype.slice.call(root.querySelectorAll(".pf-device"));
        var cards = Array.prototype.slice.call(root.querySelectorAll(".pf-design-card"));
        var states = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
        var mx = 0, my = 0, tx = 0, ty = 0, scrollYSm = window.scrollY, raf = 0;

        function clamp(v, a, b) {
            if (a === undefined) a = 0;
            if (b === undefined) b = 1;
            return Math.max(a, Math.min(b, v));
        }
        function lerp(a, b, t) { return a + (b - a) * t; }
        function mix(a, b, t) { return a.map(function (v, i) { return lerp(v, b[i], t); }); }

        function applyPose(el) {
            var dx = +el.dataset.dragX || 0;
            var dy = +el.dataset.dragY || 0;
            var d = +el.dataset.depth || 0.5;
            var px = 0, py = 0;
            if (!reduce && !el.classList.contains("is-dragging") && el.dataset.pinned !== "1") {
                px = mx * d * 24;
                py = my * d * 20;
            }
            el.style.translate = (px + dx) + "px " + (py + dy) + "px";
        }

        function bgState() {
            if (!sections.length) return states[0];
            var y = window.scrollY + window.innerHeight * 0.52;
            var current = 0;
            for (var i = 0; i < sections.length; i++) {
                if (sections[i].offsetTop <= y) current = i;
            }
            var a = sections[current];
            var b = sections[Math.min(current + 1, sections.length - 1)];
            if (!b || b === a) return states[+a.dataset.bg] || states[0];
            var span = Math.max(1, b.offsetTop - a.offsetTop);
            var t = clamp((y - a.offsetTop) / span);
            var smooth = t * t * (3 - 2 * t);
            return mix(states[+a.dataset.bg] || states[0], states[+b.dataset.bg] || states[0], smooth);
        }

        function sectionProgress(el) {
            if (!el) return 0.5;
            var r = el.getBoundingClientRect();
            return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
        }

        function frame() {
            raf = 0;
            mx = lerp(mx, tx, 0.075);
            my = lerp(my, ty, 0.075);
            scrollYSm = lerp(scrollYSm, window.scrollY, 0.11);
            var bg = bgState();
            var html = document.documentElement;
            html.style.setProperty("--bgA", bg[0]);
            html.style.setProperty("--bgB", bg[1]);
            html.style.setProperty("--bgC", bg[2]);
            html.style.setProperty("--bgD", bg[3]);
            abs.forEach(applyPose);
            if (!reduce) {
                devices.forEach(function (el, i) {
                    var p = sectionProgress(el.closest(".pf-marketing"));
                    el.style.transform =
                        "translate3d(" + (mx * (i - 1) * 18) + "px," +
                        ((p - 0.5) * (i === 2 ? -34 : 20) + my * (i + 1) * 7) + "px," +
                        (i === 2 ? 50 : 0) + "px) rotateY(" + ((i - 1) * -3 + mx * 2.5) +
                        "deg) rotateX(" + (my * -1.8) + "deg)";
                });
                cards.forEach(function (el, i) {
                    var p = sectionProgress(el.closest(".pf-social"));
                    var drift = Math.sin((p * 1.6 + i * 0.31) * Math.PI) * 9;
                    el.style.translate = (mx * ((i % 2) ? 9 : -9)) + "px " + (drift + my * ((i % 3) - 1) * 7) + "px";
                });
            }
            if (Math.abs(mx - tx) > 0.002 || Math.abs(my - ty) > 0.002 || Math.abs(scrollYSm - window.scrollY) > 0.3) {
                request();
            }
        }

        function request() { if (!raf) raf = requestAnimationFrame(frame); }

        if (!root.dataset.pfParallaxBound) {
            root.dataset.pfParallaxBound = "1";
            addEventListener("pointermove", function (e) {
                tx = e.clientX / innerWidth - 0.5;
                ty = e.clientY / innerHeight - 0.5;
                request();
            }, { passive: true });
            addEventListener("pointerleave", function () { tx = ty = 0; request(); });
            addEventListener("scroll", request, { passive: true });
            addEventListener("resize", request, { passive: true });
        }
        request();
        initHeroDrag(root, applyPose, request);
        initDesignStage(reduce);
    }

    function initHeroDrag(root, applyPose, request) {
        if (!root || root.dataset.pfDragBound === "1") return;
        root.dataset.pfDragBound = "1";

        var pieces = Array.prototype.slice.call(root.querySelectorAll("[data-drag]"));
        if (!pieces.length) return;

        var active = null;

        function onMove(e) {
            if (!active) return;
            var dx = e.clientX - active.startX;
            var dy = e.clientY - active.startY;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                active.moved = true;
                e.preventDefault();
            }
            active.el.dataset.dragX = String(active.baseX + dx);
            active.el.dataset.dragY = String(active.baseY + dy);
            applyPose(active.el);
        }

        function onUp(e) {
            if (!active) return;
            var el = active.el;
            var mode = el.getAttribute("data-drag");
            el.classList.remove("is-dragging");
            try { el.releasePointerCapture(active.pointerId); } catch (err) { /* ignore */ }

            if (mode === "snap") {
                el.classList.add("is-returning");
                el.dataset.dragX = "0";
                el.dataset.dragY = "0";
                applyPose(el);
                window.setTimeout(function () { el.classList.remove("is-returning"); }, 520);
            } else {
                el.dataset.pinned = "1";
            }

            if (!active.moved) {
                var href = el.getAttribute("data-href");
                if (href) window.open(href, "_blank", "noopener,noreferrer");
            }

            active = null;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            request();
        }

        pieces.forEach(function (el) {
            el.addEventListener("pointerdown", function (e) {
                if (e.button !== 0) return;
                e.preventDefault();
                active = {
                    el: el,
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    baseX: +el.dataset.dragX || 0,
                    baseY: +el.dataset.dragY || 0,
                    moved: false
                };
                el.classList.add("is-dragging");
                el.classList.remove("is-returning");
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
                window.addEventListener("pointercancel", onUp);
            });
            if (el.getAttribute("data-href")) {
                el.addEventListener("keydown", function (e) {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.open(el.getAttribute("data-href"), "_blank", "noopener,noreferrer");
                    }
                });
            }
        });
    }

    function initDesignStage(reduce) {
        var stage = document.querySelector("[data-pf-design-stage]");
        if (!stage || stage.dataset.bound === "1") return;
        stage.dataset.bound = "1";

        var scenes = Array.prototype.slice.call(stage.querySelectorAll(".pf-dg-scene"));
        if (!scenes.length) return;

        scenes.forEach(function (scene) {
            scene.style.opacity = "1";
            scene.style.transform = "none";
            scene.classList.add("is-current");
            Array.prototype.forEach.call(scene.querySelectorAll(".pf-dg-card"), function (card) {
                card.style.opacity = "1";
                card.style.transform = "none";
            });
        });

        var lb = document.createElement("div");
        lb.className = "pf-lightbox";
        lb.setAttribute("aria-hidden", "true");
        lb.innerHTML = '<div class="pf-lightbox__inner"><button class="pf-lightbox__close" type="button" aria-label="Cerrar">×</button><img alt=""></div>';
        document.body.appendChild(lb);
        var lbImg = lb.querySelector("img");
        function close() {
            lb.classList.remove("is-open");
            lb.setAttribute("aria-hidden", "true");
        }
        function open(card) {
            var img = card.querySelector("img");
            lbImg.src = img ? img.src : "";
            lbImg.alt = card.dataset.label || "";
            lb.classList.add("is-open");
            lb.setAttribute("aria-hidden", "false");
        }
        stage.querySelectorAll(".pf-dg-card").forEach(function (card) {
            card.addEventListener("click", function () { open(card); });
            card.addEventListener("keydown", function (e) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(card); }
            });
        });
        lb.querySelector(".pf-lightbox__close").addEventListener("click", close);
        lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
        addEventListener("keydown", function (e) {
            if (e.key === "Escape" && lb.classList.contains("is-open")) close();
        });
    }

    function boot() { initPortfolioPage(); }
    if (document.readyState !== "loading") boot();
    else document.addEventListener("DOMContentLoaded", boot);
    document.addEventListener("blazor:enhancedload", boot);
})();
