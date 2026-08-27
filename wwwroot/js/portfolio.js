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
            if (!reduce) {
                abs.forEach(function (el) {
                    var d = +el.dataset.depth || 0.5;
                    el.style.translate = (mx * d * 24) + "px " + (my * d * 20) + "px";
                });
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
        initDesignStage(reduce);
    }

    function initDesignStage(reduce) {
        var stage = document.querySelector("[data-pf-design-stage]");
        if (!stage || stage.dataset.bound === "1") return;
        stage.dataset.bound = "1";

        var scenes = Array.prototype.slice.call(stage.querySelectorAll(".pf-dg-scene"));
        var sticky = stage.querySelector(".pf-design-sticky");
        var head = stage.querySelector(".pf-dg-head");
        var name = stage.querySelector("[data-pf-dg-name]");
        if (!scenes.length) return;

        function clamp(v, a, b) {
            if (a === undefined) a = 0;
            if (b === undefined) b = 1;
            return Math.max(a, Math.min(b, v));
        }
        function ease(t) { return 1 - Math.pow(1 - t, 3); }
        function smooth(t) { return t * t * (3 - 2 * t); }

        var palette = [[255, 255, 255], [255, 205, 20], [101, 77, 221], [72, 191, 131], [255, 78, 78]];
        function mixRgb(a, b, t) {
            return "rgb(" + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(",") + ")";
        }

        var last = -1;
        function setLabel(i) {
            if (i === last || !name) return;
            last = i;
            if (head) head.classList.add("is-changing");
            setTimeout(function () {
                name.textContent = scenes[i].dataset.label || "";
                if (head) head.classList.remove("is-changing");
            }, 90);
        }

        function setTypeColor(p) {
            if (!sticky) return;
            var seg = p * (palette.length - 1);
            var i = Math.min(palette.length - 2, Math.floor(seg));
            var t = seg - i;
            var c = mixRgb(palette[i], palette[i + 1], t);
            sticky.style.setProperty("--dg-type", c);
            sticky.style.setProperty("--dg-caption", c);
        }

        function mobile() { return window.matchMedia("(max-width: 900px)").matches; }

        var vectorsByScene = {
            identity: [[-18, 14, -3], [-6, -15, 2], [10, 12, -2], [-14, 18, 2], [7, 14, -1], [18, -12, 3], [12, 8, 2], [-10, -8, -2]],
            pop: [[-16, 12, -2], [5, -15, 2], [16, 11, 2], [-7, 18, -1], [8, 10, 1], [-12, 6, -2]],
            packaging: [[-19, 7, -2], [0, -16, 1], [19, 9, 2], [-8, 14, 1], [10, -8, -1]],
            giga: [[-18, -5, -2], [0, 18, 1], [18, -8, 2], [-6, 10, 1]]
        };

        var raf = 0;
        function render() {
            raf = 0;
            if (reduce || mobile()) return;
            var r = stage.getBoundingClientRect();
            var span = Math.max(1, stage.offsetHeight - innerHeight);
            var p = clamp(-r.top / span);
            setTypeColor(p);
            var raw = p * scenes.length;
            var active = Math.min(scenes.length - 1, Math.floor(Math.min(raw, scenes.length - 0.0001)));
            setLabel(active);
            scenes.forEach(function (scene, i) {
                var local = clamp(raw - i);
                var enter = smooth(clamp(local / 0.34));
                var exit = smooth(clamp((local - 0.76) / 0.24));
                scene.style.opacity = String(clamp(enter * (1 - exit * 0.96)));
                scene.style.transform = "translate3d(" + ((1 - enter) * 2.5 - exit * 2.5) + "vw,0,0)";
                scene.classList.toggle("is-current", local > 0.15 && local < 0.9);
                var key = scene.dataset.scene || "";
                var vecs = vectorsByScene[key] || [];
                Array.prototype.forEach.call(scene.querySelectorAll(".pf-dg-card"), function (card, j) {
                    var start = 0.035 + j * 0.07;
                    var t = ease(clamp((local - start) / 0.25));
                    var vectors = vecs[j] || [0, 0, 0];
                    var depth = (j % 2 ? 1 : -1) * Math.sin((p * 4.2) + (j * 0.8)) * 1.2;
                    card.style.opacity = String(clamp(t * (1 - exit * 0.9)));
                    card.style.transform =
                        "translate3d(" + ((1 - t) * vectors[0] + depth) + "px," +
                        ((1 - t) * vectors[1]) + "px," + j + "px) rotate(" +
                        ((1 - t) * vectors[2]) + "deg) scale(" + (0.94 + 0.06 * t) + ")";
                });
            });
        }

        function req() { if (!raf) raf = requestAnimationFrame(render); }
        addEventListener("scroll", req, { passive: true });
        addEventListener("resize", req, { passive: true });
        req();

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
