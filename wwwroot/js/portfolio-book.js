// Arrieta — visor de portafolio tipo libro (desktop) / scroll vertical (móvil).
(function () {
    "use strict";

    var PDFJS_SRC = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
    var PDF_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    var PAGEFLIP_SRC = "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js";

    var MOBILE_MQ = "(max-width: 900px)";
    var active = null;

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) {
                resolve();
                return;
            }
            var s = document.createElement("script");
            s.src = src;
            s.async = true;
            s.onload = resolve;
            s.onerror = function () { reject(new Error("No se pudo cargar " + src)); };
            document.head.appendChild(s);
        });
    }

    function waitForPageFlip() {
        if (window.St && window.St.PageFlip) return Promise.resolve();
        return loadScript(PAGEFLIP_SRC).then(function () {
            if (!window.St || !window.St.PageFlip) {
                throw new Error("PageFlip no está disponible");
            }
        });
    }

    function renderPdfPages(url) {
        return import(PDFJS_SRC).then(function (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
            return pdfjsLib.getDocument({ url: url, withCredentials: false }).promise;
        }).then(function (pdf) {
            var scale = Math.min(2, (window.devicePixelRatio || 1) * 1.25);
            var pages = [];

            function renderOne(i) {
                return pdf.getPage(i).then(function (page) {
                    var viewport = page.getViewport({ scale: scale });
                    var canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    return page.render({
                        canvasContext: canvas.getContext("2d", { alpha: false }),
                        viewport: viewport
                    }).promise.then(function () {
                        return new Promise(function (resolve) {
                            canvas.toBlob(function (blob) {
                                pages.push({
                                    url: URL.createObjectURL(blob),
                                    width: viewport.width,
                                    height: viewport.height
                                });
                                resolve();
                            }, "image/jpeg", 0.86);
                        });
                    });
                });
            }

            var chain = Promise.resolve();
            for (var i = 1; i <= pdf.numPages; i++) {
                (function (n) {
                    chain = chain.then(function () { return renderOne(n); });
                })(i);
            }
            return chain.then(function () { return pages; });
        });
    }

    function setStatus(root, text) {
        var el = root.querySelector("[data-book-status]");
        if (el) el.textContent = text;
    }

    function createMobile(root, pages) {
        var host = root.querySelector("[data-book-mobile]");
        var desktop = root.querySelector("[data-book-desktop]");
        var stage = root.closest(".portfolio-view__stage");
        root.classList.add("is-mobile-mode");
        root.classList.remove("is-desktop-mode");
        host.hidden = false;
        host.removeAttribute("hidden");
        if (desktop) {
            desktop.hidden = true;
            desktop.innerHTML = "";
        }
        host.innerHTML = "";
        host.classList.add("is-ready");

        pages.forEach(function (page, index) {
            var slide = document.createElement("figure");
            slide.className = "portfolio-book__slide";
            var img = document.createElement("img");
            img.src = page.url;
            img.alt = "Página " + (index + 1);
            img.draggable = false;
            slide.appendChild(img);
            host.appendChild(slide);
        });

        function pageHeight() {
            var bar = document.querySelector(".portfolio-view__bar");
            var stageH = stage ? stage.clientHeight : 0;
            if (stageH > 40) return stageH;
            return Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 56));
        }

        function layout() {
            var h = pageHeight();
            host.style.height = h + "px";
            var slides = host.querySelectorAll(".portfolio-book__slide");
            for (var i = 0; i < slides.length; i++) {
                slides[i].style.height = h + "px";
                slides[i].style.minHeight = h + "px";
            }
        }

        function currentIndex() {
            var h = pageHeight() || 1;
            return Math.max(0, Math.min(pages.length - 1, Math.round(host.scrollTop / h)));
        }

        function update() {
            setStatus(document, (currentIndex() + 1) + " / " + pages.length);
        }

        layout();
        host.scrollTop = 0;
        host.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", layout);
        // Segundo layout tras paint (por si el stage aún no tenía alto)
        requestAnimationFrame(function () {
            layout();
            update();
        });
        update();

        return {
            prev: function () {
                host.scrollTo({ top: (currentIndex() - 1) * pageHeight(), behavior: "smooth" });
            },
            next: function () {
                host.scrollTo({ top: (currentIndex() + 1) * pageHeight(), behavior: "smooth" });
            },
            destroy: function () {
                window.removeEventListener("resize", layout);
                host.innerHTML = "";
                host.style.height = "";
                host.hidden = true;
                host.classList.remove("is-ready");
                root.classList.remove("is-mobile-mode");
            }
        };
    }

    function createDesktop(root, pages) {
        var host = root.querySelector("[data-book-desktop]");
        var mobile = root.querySelector("[data-book-mobile]");
        root.classList.add("is-desktop-mode");
        root.classList.remove("is-mobile-mode");
        host.hidden = false;
        if (mobile) {
            mobile.hidden = true;
            mobile.innerHTML = "";
            mobile.classList.remove("is-ready");
        }
        host.innerHTML = "";

        var first = pages[0];
        var stage = root.closest(".portfolio-view__stage") || host.parentElement;
        var availW = Math.max(280, (stage.clientWidth || window.innerWidth) - 24);
        var availH = Math.max(200, (stage.clientHeight || (window.innerHeight - 80)) - 24);
        var ratio = first.height / first.width;

        // ¿Caben 2 páginas a la altura máxima sin salirse del ancho? (sin estirar)
        var dualPageH = availH;
        var dualPageW = dualPageH / ratio;
        var canShowDual = pages.length > 1 && (dualPageW * 2) <= availW;

        var pageW;
        var pageH;
        if (canShowDual) {
            pageW = dualPageW;
            pageH = dualPageH;
        } else {
            pageW = availW;
            pageH = pageW * ratio;
            if (pageH > availH) {
                pageH = availH;
                pageW = pageH / ratio;
            }
        }
        pageW = Math.max(1, Math.round(pageW));
        pageH = Math.max(1, Math.round(pageH));

        var flip = new window.St.PageFlip(host, {
            width: pageW,
            height: pageH,
            size: "fixed",
            minWidth: pageW,
            maxWidth: pageW,
            minHeight: pageH,
            maxHeight: pageH,
            drawShadow: true,
            flippingTime: 700,
            usePortrait: !canShowDual,
            startZIndex: 1,
            autoSize: false,
            maxShadowOpacity: 0.45,
            showCover: !canShowDual,
            mobileScrollSupport: false,
            swipeDistance: 30,
            clickEventForward: true,
            useMouseEvents: true,
            showPageCorners: true,
            disableFlipByClick: false
        });

        flip.loadFromImages(pages.map(function (p) { return p.url; }));

        function update() {
            var current = typeof flip.getCurrentPageIndex === "function"
                ? flip.getCurrentPageIndex() + 1
                : 1;
            setStatus(document, current + " / " + pages.length);
        }

        flip.on("flip", update);
        flip.on("changeState", update);
        update();

        var hint = document.querySelector("[data-book-hint]");
        if (hint) hint.hidden = false;

        return {
            prev: function () { flip.flipPrev(); },
            next: function () { flip.flipNext(); },
            destroy: function () {
                try { flip.destroy(); } catch (e) { /* already gone */ }
                host.innerHTML = "";
                if (hint) hint.hidden = true;
                root.classList.remove("is-desktop-mode");
            }
        };
    }

    function bindControls(book) {
        var prev = document.querySelector("[data-book-prev]");
        var next = document.querySelector("[data-book-next]");
        function onPrev(e) { e.preventDefault(); book.prev(); }
        function onNext(e) { e.preventDefault(); book.next(); }
        function onKey(e) {
            if (e.key === "ArrowLeft") book.prev();
            if (e.key === "ArrowRight" || e.key === "ArrowDown") book.next();
            if (e.key === "ArrowUp") book.prev();
            if (e.key === "Escape") window.location.href = "/";
        }
        if (prev) prev.addEventListener("click", onPrev);
        if (next) next.addEventListener("click", onNext);
        window.addEventListener("keydown", onKey);
        return function () {
            if (prev) prev.removeEventListener("click", onPrev);
            if (next) next.removeEventListener("click", onNext);
            window.removeEventListener("keydown", onKey);
        };
    }

    function init(root) {
        var loading = root.parentElement.querySelector("[data-book-loading]");
        var error = root.parentElement.querySelector("[data-book-error]");
        var pdfUrl = root.getAttribute("data-pdf");
        if (!pdfUrl) return;

        var isMobile = window.matchMedia(MOBILE_MQ).matches;
        var unbind = function () {};
        var book = null;
        var objectUrls = [];
        var mq = window.matchMedia(MOBILE_MQ);
        var pagesCache = null;

        function showError() {
            if (loading) loading.hidden = true;
            if (error) error.hidden = false;
            setStatus(document, "—");
        }

        function mount(pages) {
            if (book && book.destroy) book.destroy();
            unbind();
            book = isMobile ? createMobile(root, pages) : createDesktop(root, pages);
            unbind = bindControls(book);
            if (loading) loading.hidden = true;
            root.classList.add("is-ready");
        }

        // Móvil: solo PDF.js. Desktop: PageFlip + PDF.js.
        var load = isMobile
            ? renderPdfPages(pdfUrl)
            : waitForPageFlip().then(function () { return renderPdfPages(pdfUrl); });

        load.then(function (pages) {
            pagesCache = pages;
            objectUrls = pages.map(function (x) { return x.url; });
            mount(pages);

            function onModeChange() {
                var nowMobile = mq.matches;
                if (nowMobile === isMobile) return;
                isMobile = nowMobile;
                var ready = isMobile
                    ? Promise.resolve(pagesCache)
                    : waitForPageFlip().then(function () { return pagesCache; });
                ready.then(function (pages) { mount(pages); });
            }
            if (mq.addEventListener) mq.addEventListener("change", onModeChange);
            else mq.addListener(onModeChange);

            // Solo desktop recalcula 1 vs 2 páginas al redimensionar
            var resizeTimer;
            window.addEventListener("resize", function () {
                if (isMobile) return;
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function () {
                    if (!pagesCache || isMobile) return;
                    mount(pagesCache);
                }, 180);
            });
        }).catch(function () {
            showError();
        });

        return {
            destroy: function () {
                unbind();
                if (book && book.destroy) book.destroy();
                objectUrls.forEach(function (u) { URL.revokeObjectURL(u); });
            }
        };
    }

    function boot() {
        if (active) {
            active.destroy();
            active = null;
        }
        var root = document.querySelector("[data-portfolio-book]");
        if (!root) return;
        active = init(root);
    }

    if (document.readyState !== "loading") boot();
    else document.addEventListener("DOMContentLoaded", boot);
    document.addEventListener("blazor:enhancedload", boot);
})();
