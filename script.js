/*
=========================================================
 YAZEED ENGLISH — القارئ التفاعلي
 PDF.js 4.10.38

 الوظائف:
 1. تسجيل الدخول برمز من 6 أرقام
 2. سياسة الاستخدام
 3. PDF.js — عرض مستمر للصفحات
 4. تنقل بالصفحة + مزامنة مع التمرير
 5. تكبير وتصغير
 6. 🖐️ النطق + تمييز مؤقت للجملة
 7. ✏️ قلم أحمر مع سُمك قابل للتعديل
 8. 🖍️ محدد أصفر للنص
 9. 🧽 ممحاة كاملة للخطوط والتحديدات
 10. حفظ التحديدات والرسومات بعد إغلاق المتصفح
 11. حفظ منفصل لكل PDF / رمز وصول
 12. إشعار أول استخدام
 13. روابط التقييم والدعم الفني
=========================================================
*/

import * as pdfjsLib from
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* ======================================================
   رموز الدخول وملفات PDF
====================================================== */

const ACCESS_CODES = {
    "111111": "pdfs/grammar1.pdf",
    "222222": "pdfs/grammar2.pdf",
    "581293": "pdfs/grammar3.pdf",
    "726904": "pdfs/grammar4.pdf",
    "915438": "pdfs/grammar5.pdf"
};


/* ======================================================
   عناصر الواجهة
====================================================== */

const loginScreen = document.getElementById("loginScreen");
const loginForm = document.getElementById("loginForm");
const accessCodeInput = document.getElementById("accessCode");
const loginError = document.getElementById("loginError");

const policyScreen = document.getElementById("policyScreen");
const policyAgreement = document.getElementById("policyAgreement");
const continueButton = document.getElementById("continueButton");
const policyError = document.getElementById("policyError");

const readerApp = document.getElementById("readerApp");

const viewerContainer = document.getElementById("viewerContainer");
const pdfViewer = document.getElementById("pdfViewer");
const pageInput = document.getElementById("pageInput");
const totalPagesElement = document.getElementById("totalPages");

const previousPageButton = document.getElementById("previousPage");
const nextPageButton = document.getElementById("nextPage");

const zoomOutButton = document.getElementById("zoomOut");
const zoomInButton = document.getElementById("zoomIn");
const zoomLevelElement = document.getElementById("zoomLevel");

const statusMessage = document.getElementById("statusMessage");
const pronunciationStatus = document.getElementById("pronunciationStatus");

const voiceSelect = document.getElementById("voiceSelect");
const testVoiceButton = document.getElementById("testVoiceButton");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

const handTool = document.getElementById("handTool");
const penTool = document.getElementById("penTool");
const highlighterTool = document.getElementById("highlighterTool");
const eraserTool = document.getElementById("eraserTool");

const penThickness = document.getElementById("penThickness");
const thicknessValue = document.getElementById("thicknessValue");

const pronunciationModal = document.getElementById("pronunciationModal");
const understoodButton = document.getElementById("understoodButton");


/* ======================================================
   حالة التطبيق
====================================================== */

let pdfDocument = null;
let currentPage = 1;
let scale = 1;

let voices = [];
let selectedVoice = null;
let speechRate = 0.85;

let authorizedPdfPath = null;
let authorizedAccessCode = null;

let activeMode = "hand"; // hand | pen | highlighter | eraser

let renderGeneration = 0;
let pageObserver = null;
let pageJumpTimer = null;

let currentSpeechSentence = [];
let currentSpeechPageContainer = null;

let annotationStore = {};
let annotationStorageKey = "";

let activeDrawing = null;

const renderedPages = new Map();


/* ======================================================
   عرض الشاشات
====================================================== */

function showLoginScreen() {
    loginScreen.hidden = false;
    policyScreen.hidden = true;
    readerApp.hidden = true;
}

function showPolicyScreen() {
    loginScreen.hidden = true;
    policyScreen.hidden = false;
    readerApp.hidden = true;
}

function showReaderApp() {
    loginScreen.hidden = true;
    policyScreen.hidden = true;
    readerApp.hidden = false;
}


/* ======================================================
   LOGIN
====================================================== */

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const code = accessCodeInput.value.trim();

    if (!/^\d{6}$/.test(code)) {
        loginError.textContent =
            "الرجاء إدخال رمز سري مكوّن من 6 أرقام.";
        loginError.hidden = false;
        return;
    }

    const pdfPath = ACCESS_CODES[code];

    if (!pdfPath) {
        loginError.textContent =
            "الرمز غير صحيح. تأكد من إدخال الرمز الصحيح.";
        loginError.hidden = false;
        return;
    }

    authorizedPdfPath = pdfPath;
    authorizedAccessCode = code;

    sessionStorage.setItem("accessGranted", "true");
    sessionStorage.setItem("authorizedPdfPath", authorizedPdfPath);
    sessionStorage.setItem("authorizedAccessCode", authorizedAccessCode);

    loginError.hidden = true;
    policyAgreement.checked = false;
    policyError.hidden = true;

    showPolicyScreen();
});

accessCodeInput.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 6);
});


/* ======================================================
   POLICY
====================================================== */

continueButton.addEventListener("click", async function () {
    if (!policyAgreement.checked) {
        policyError.textContent =
            "يجب الموافقة على الإقرار قبل المتابعة.";
        policyError.hidden = false;
        return;
    }

    policyError.hidden = true;

    if (!authorizedPdfPath) {
        authorizedPdfPath =
            sessionStorage.getItem("authorizedPdfPath");
    }

    if (!authorizedPdfPath) {
        showLoginScreen();
        return;
    }

    sessionStorage.setItem("policyAccepted", "true");

    showReaderApp();

    await openPDF(authorizedPdfPath);
});


/* ======================================================
   RESTORE SESSION
====================================================== */

function restoreSession() {
    const accessGranted =
        sessionStorage.getItem("accessGranted");

    const policyAccepted =
        sessionStorage.getItem("policyAccepted");

    const savedPdfPath =
        sessionStorage.getItem("authorizedPdfPath");

    if (accessGranted === "true" && savedPdfPath) {
        authorizedPdfPath = savedPdfPath;

        if (policyAccepted === "true") {
            showReaderApp();
            openPDF(authorizedPdfPath);
        } else {
            showPolicyScreen();
        }

        return;
    }

    showLoginScreen();
}


/* ======================================================
   ANNOTATION STORAGE
====================================================== */

function getAnnotationStorageKey(pdfPath) {
    const safeCode =
        String(
            authorizedAccessCode || "unknown"
        )
        .replace(/[^0-9a-zA-Z_-]/g, "_")
        .slice(0, 80);

    const safePath =
        String(pdfPath)
            .replace(/[^a-zA-Z0-9_-]/g, "_")
            .slice(0, 150);

    return (
        "yazeedInteractiveReaderAnnotations:" +
        `${safeCode}:${safePath}`
    );
}

function loadAnnotations() {
    annotationStorageKey =
        getAnnotationStorageKey(authorizedPdfPath);

    try {
        const raw =
            localStorage.getItem(annotationStorageKey);

        annotationStore =
            raw ? JSON.parse(raw) : {};

    } catch (error) {
        console.error("تعذر تحميل التحديدات:", error);
        annotationStore = {};
    }
}

function saveAnnotations() {
    try {
        localStorage.setItem(
            annotationStorageKey,
            JSON.stringify(annotationStore)
        );
    } catch (error) {
        console.error("تعذر حفظ التحديدات:", error);
        statusMessage.textContent =
            "تعذر حفظ بعض التحديدات محلياً.";
    }
}

function getPageAnnotations(pageNumber) {
    const key = String(pageNumber);

    if (!annotationStore[key]) {
        annotationStore[key] = {
            strokes: [],
            highlights: []
        };
    }

    if (!Array.isArray(annotationStore[key].strokes)) {
        annotationStore[key].strokes = [];
    }

    if (!Array.isArray(annotationStore[key].highlights)) {
        annotationStore[key].highlights = [];
    }

    return annotationStore[key];
}


/* ======================================================
   PDF LOAD
====================================================== */

async function openPDF(pdfPath) {
    try {
        statusMessage.textContent =
            "جارٍ تحميل الملف...";

        window.speechSynthesis?.cancel();

        loadAnnotations();

        const response = await fetch(pdfPath, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const arrayBuffer =
            await response.arrayBuffer();

        const data =
            new Uint8Array(arrayBuffer);

        const loadingTask =
            pdfjsLib.getDocument({ data });

        pdfDocument =
            await loadingTask.promise;

        totalPagesElement.textContent =
            pdfDocument.numPages;

        currentPage = 1;
        pageInput.value = "1";

        scale = 1;

        zoomLevelElement.textContent = "100%";

        await buildContinuousViewer();

        statusMessage.textContent =
            "تم تحميل الملف بنجاح";

        updateNavigation();

        maybeShowPronunciationNotice();

    } catch (error) {
        console.error("خطأ في تحميل PDF:", error);

        statusMessage.textContent =
            "تعذر تحميل الملف";

        pdfViewer.innerHTML = `
            <div class="pdf-error">
                تعذر فتح الملف. تأكد من مسار ملف PDF.
            </div>
        `;
    }
}


/* ======================================================
   CONTINUOUS VIEWER
====================================================== */

async function buildContinuousViewer(targetPage = currentPage) {
    if (!pdfDocument) {
        return;
    }

    renderGeneration++;

    renderedPages.clear();

    if (pageObserver) {
        pageObserver.disconnect();
        pageObserver = null;
    }

    pdfViewer.innerHTML = "";

    const fragment = document.createDocumentFragment();

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        const page = await pdfDocument.getPage(pageNumber);

        const viewport = page.getViewport({ scale });

        const pageContainer =
            document.createElement("div");

        pageContainer.className = "pdf-page";
        pageContainer.dataset.pageNumber = String(pageNumber);

        pageContainer.style.width =
            `${viewport.width}px`;

        pageContainer.style.height =
            `${viewport.height}px`;

        pageContainer.setAttribute(
            "aria-label",
            `صفحة ${pageNumber}`
        );

        const loadingLabel =
            document.createElement("div");

        loadingLabel.className = "page-loading";
        loadingLabel.textContent = `صفحة ${pageNumber}`;

        pageContainer.appendChild(loadingLabel);
        fragment.appendChild(pageContainer);
    }

    pdfViewer.appendChild(fragment);

    setupPageObserver();

    requestAnimationFrame(() => {
        scrollToPage(targetPage, "auto");
        renderNearbyPages(targetPage);
    });
}

function setupPageObserver() {
    const pageElements =
        pdfViewer.querySelectorAll(".pdf-page");

    pageObserver =
        new IntersectionObserver(
            (entries) => {
                const visible =
                    entries
                        .filter(entry => entry.isIntersecting)
                        .sort(
                            (a, b) =>
                                b.intersectionRatio -
                                a.intersectionRatio
                        );

                if (visible.length > 0) {
                    const pageNumber =
                        Number(
                            visible[0]
                                .target
                                .dataset
                                .pageNumber
                        );

                    setCurrentPage(pageNumber);
                    renderNearbyPages(pageNumber);
                }
            },
            {
                root: viewerContainer,
                threshold: [0.25, 0.5, 0.75]
            }
        );

    pageElements.forEach(pageElement => {
        pageObserver.observe(pageElement);
    });
}

function renderNearbyPages(centerPage) {
    const first =
        Math.max(1, centerPage - 1);

    const last =
        Math.min(
            pdfDocument.numPages,
            centerPage + 1
        );

    for (let pageNumber = first; pageNumber <= last; pageNumber++) {
        renderPage(pageNumber);
    }
}

async function renderPage(pageNumber) {
    const pageContainer =
        pdfViewer.querySelector(
            `.pdf-page[data-page-number="${pageNumber}"]`
        );

    if (!pageContainer || renderedPages.has(pageNumber)) {
        return;
    }

    renderedPages.set(pageNumber, true);

    const generation = renderGeneration;

    try {
        const page =
            await pdfDocument.getPage(pageNumber);

        if (generation !== renderGeneration) {
            return;
        }

        const viewport =
            page.getViewport({ scale });

        const outputScale =
            window.devicePixelRatio || 1;

        pageContainer.innerHTML = "";

        /*
         ==================================================
         CANVAS
         ==================================================
        */

        const canvas =
            document.createElement("canvas");

        const context =
            canvas.getContext("2d", {
                alpha: false
            });

        canvas.width =
            Math.floor(
                viewport.width *
                outputScale
            );

        canvas.height =
            Math.floor(
                viewport.height *
                outputScale
            );

        canvas.style.width =
            `${viewport.width}px`;

        canvas.style.height =
            `${viewport.height}px`;

        canvas.className = "pdf-canvas";

        await page.render({
            canvasContext: context,
            viewport: page.getViewport({
                scale:
                    scale *
                    outputScale
            })
        }).promise;

        /*
         ==================================================
         TEXT LAYER
         ==================================================
        */

        const textLayerDiv =
            document.createElement("div");

        textLayerDiv.className =
            "textLayer";

        const textContent =
            await page.getTextContent();

        if (typeof pdfjsLib.TextLayer !== "function") {
            throw new Error(
                "PDF.js TextLayer غير متوفر."
            );
        }

        const textLayer =
            new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textLayerDiv,
                viewport
            });

        await textLayer.render();

        /*
         ==================================================
         ANNOTATION CANVAS
         ==================================================
        */

        const annotationCanvas =
            document.createElement("canvas");

        annotationCanvas.className =
            "annotation-canvas";

        annotationCanvas.width =
            Math.floor(
                viewport.width *
                outputScale
            );

        annotationCanvas.height =
            Math.floor(
                viewport.height *
                outputScale
            );

        annotationCanvas.style.width =
            `${viewport.width}px`;

        annotationCanvas.style.height =
            `${viewport.height}px`;

        annotationCanvas.dataset.pageNumber =
            String(pageNumber);

        pageContainer.appendChild(canvas);
        pageContainer.appendChild(textLayerDiv);
        pageContainer.appendChild(annotationCanvas);

        setupTextInteraction(
            textLayerDiv,
            pageContainer,
            pageNumber
        );

        setupAnnotationCanvas(
            annotationCanvas,
            pageContainer,
            pageNumber
        );

        redrawAnnotations(
            pageContainer,
            pageNumber
        );

        applyModeToPage(pageContainer);

    } catch (error) {
        console.error(
            `تعذر رسم الصفحة ${pageNumber}:`,
            error
        );

        renderedPages.delete(pageNumber);

        pageContainer.innerHTML = "";

        const errorMessage =
            document.createElement("div");

        errorMessage.className = "page-error";
        errorMessage.textContent =
            `تعذر رسم الصفحة ${pageNumber}`;

        pageContainer.appendChild(errorMessage);
    }
}


/* ======================================================
   PAGE STATE
====================================================== */

function setCurrentPage(pageNumber) {
    if (!pdfDocument) {
        return;
    }

    currentPage =
        Math.max(
            1,
            Math.min(
                pageNumber,
                pdfDocument.numPages
            )
        );

    pageInput.value =
        String(currentPage);

    updateNavigation();
}

function updateNavigation() {
    if (!pdfDocument) {
        previousPageButton.disabled = true;
        nextPageButton.disabled = true;
        return;
    }

    previousPageButton.disabled =
        currentPage <= 1;

    nextPageButton.disabled =
        currentPage >= pdfDocument.numPages;
}

function scrollToPage(pageNumber, behavior = "smooth") {
    if (!pdfDocument) {
        return;
    }

    const target =
        Math.max(
            1,
            Math.min(
                Number(pageNumber) || 1,
                pdfDocument.numPages
            )
        );

    const pageElement =
        pdfViewer.querySelector(
            `.pdf-page[data-page-number="${target}"]`
        );

    if (!pageElement) {
        return;
    }

    setCurrentPage(target);

    pageElement.scrollIntoView({
        behavior,
        block: "start"
    });

    renderNearbyPages(target);
}


/* ======================================================
   PAGE INPUT
   بدون الحاجة إلى Enter
====================================================== */

function navigateFromPageInput() {
    if (!pdfDocument) {
        return;
    }

    let requested =
        parseInt(
            pageInput.value,
            10
        );

    if (Number.isNaN(requested)) {
        pageInput.value =
            String(currentPage);
        return;
    }

    requested =
        Math.max(
            1,
            Math.min(
                requested,
                pdfDocument.numPages
            )
        );

    pageInput.value =
        String(requested);

    scrollToPage(requested);
}

/*
   لا نحتاج إلى ضغط Enter.
   عندما ينتهي المستخدم من الكتابة
   ويترك خانة الرقم، ينتقل للصفحة.
*/
pageInput.addEventListener(
    "change",
    navigateFromPageInput
);

pageInput.addEventListener(
    "blur",
    navigateFromPageInput
);

pageInput.addEventListener(
    "keydown",
    function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            navigateFromPageInput();
            pageInput.blur();
        }
    }
);


/* ======================================================
   PREVIOUS / NEXT
====================================================== */

previousPageButton.addEventListener(
    "click",
    function () {
        if (currentPage > 1) {
            scrollToPage(
                currentPage - 1
            );
        }
    }
);

nextPageButton.addEventListener(
    "click",
    function () {
        if (
            pdfDocument &&
            currentPage < pdfDocument.numPages
        ) {
            scrollToPage(
                currentPage + 1
            );
        }
    }
);


/* ======================================================
   ZOOM
====================================================== */

async function rebuildAtCurrentZoom() {
    const targetPage = currentPage;

    await buildContinuousViewer(targetPage);

    zoomLevelElement.textContent =
        `${Math.round(scale * 100)}%`;
}

zoomInButton.addEventListener(
    "click",
    async function () {
        if (!pdfDocument) {
            return;
        }

        scale =
            Math.min(
                3,
                Number(
                    (scale + 0.1).toFixed(2)
                )
            );

        await rebuildAtCurrentZoom();
    }
);

zoomOutButton.addEventListener(
    "click",
    async function () {
        if (!pdfDocument) {
            return;
        }

        scale =
            Math.max(
                0.5,
                Number(
                    (scale - 0.1).toFixed(2)
                )
            );

        await rebuildAtCurrentZoom();
    }
);


/* ======================================================
   TEXT HELPERS
====================================================== */

function normalizeText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function containsEnglish(text) {
    return /[A-Za-z]/.test(text);
}

function isSentenceEnding(text) {
    return /[.!?]["'”’)\]]*\s*$/.test(text);
}

/*
   PDF.js can split one visual sentence into many spans.
   We therefore keep a lightweight reading-order list, but we
   NEVER use the entire page as a fallback sentence.
*/
function buildSentenceGroups(spans) {
    const groups = [];
    let current = [];

    spans.forEach(span => {
        const text = normalizeText(span.textContent);
        if (!text || !containsEnglish(text)) return;

        current.push(span);

        if (isSentenceEnding(text)) {
            groups.push(current);
            current = [];
        }
    });

    if (current.length) {
        groups.push(current);
    }

    return groups;
}

function findSentenceForSpan(span, sentenceGroups) {
    const group = sentenceGroups.find(g => g.includes(span));
    return group && group.length ? group : [span];
}

function getGroupText(group) {
    return normalizeText(
        group
            .map(span => normalizeText(span.textContent))
            .filter(Boolean)
            .join(" ")
    );
}

/*
   Find the exact word under the pointer inside a PDF.js span.
   This prevents a large text span from causing the whole line/page
   to be spoken when the user only clicked one word.
*/
function getWordAtPoint(event, fallbackSpan) {
    let range = null;

    try {
        if (document.caretPositionFromPoint) {
            const position = document.caretPositionFromPoint(
                event.clientX,
                event.clientY
            );

            if (position && position.offsetNode) {
                range = document.createRange();
                range.setStart(position.offsetNode, position.offset);
                range.collapse(true);
            }
        } else if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(
                event.clientX,
                event.clientY
            );
        }
    } catch (error) {
        range = null;
    }

    if (!range) {
        return normalizeText(fallbackSpan.textContent);
    }

    const textNode = range.startContainer;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        return normalizeText(fallbackSpan.textContent);
    }

    if (!fallbackSpan.contains(textNode)) {
        return normalizeText(fallbackSpan.textContent);
    }

    const fullText = textNode.textContent || "";
    const offset = Math.max(
        0,
        Math.min(range.startOffset, fullText.length)
    );

    let start = offset;
    let end = offset;

    while (start > 0 && !/\s/.test(fullText[start - 1])) {
        start--;
    }

    while (end < fullText.length && !/\s/.test(fullText[end])) {
        end++;
    }

    const word = normalizeText(fullText.slice(start, end));

    return word || normalizeText(fallbackSpan.textContent);
}

function getSentenceFromTextPosition(span, sentenceGroups) {
    return findSentenceForSpan(span, sentenceGroups);
}

/* ======================================================
   TEXT INTERACTION
====================================================== */

function setupTextInteraction(
    textLayer,
    pageContainer,
    pageNumber
) {
    const spans = Array.from(
        textLayer.querySelectorAll("span")
    ).filter(span => {
        const text = normalizeText(span.textContent);
        return text && containsEnglish(text);
    });

    if (!spans.length) return;

    const sentenceGroups = buildSentenceGroups(spans);

    spans.forEach((span, index) => {
        const text = normalizeText(span.textContent);

        span.classList.add("clickable-text");
        span.dataset.textIndex = String(index);
        span.dataset.speechText = text;
        span.title = "اضغط لسماع النطق — نقرتان للجملة";

        span.addEventListener("click", function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (activeMode !== "hand" && activeMode !== "highlighter") {
                return;
            }

            /*
               Wait briefly so a double-click does not trigger both
               word and sentence actions.
            */
            if (pageContainer._speechClickTimer) {
                clearTimeout(pageContainer._speechClickTimer);
            }

            pageContainer._speechClickTimer = setTimeout(() => {
                pageContainer._speechClickTimer = null;

                const word = getWordAtPoint(event, span);
                const target = word || text;

                if (activeMode === "hand") {
                    handlePronunciation(
                        pageContainer,
                        [span],
                        pageNumber,
                        target
                    );
                } else {
                    createPersistentHighlight(
                        pageContainer,
                        [span],
                        pageNumber,
                        target
                    );
                }
            }, 180);
        });

        span.addEventListener("dblclick", function (event) {
            event.preventDefault();
            event.stopPropagation();

            if (pageContainer._speechClickTimer) {
                clearTimeout(pageContainer._speechClickTimer);
                pageContainer._speechClickTimer = null;
            }

            if (activeMode !== "hand" && activeMode !== "highlighter") {
                return;
            }

            const sentence = getSentenceFromTextPosition(
                span,
                sentenceGroups
            );

            /*
               Safety guard: never allow a fallback that spans an
               abnormally large portion of the page.
            */
            const safeSentence =
                sentence.length > 80 ? [span] : sentence;

            if (activeMode === "hand") {
                handlePronunciation(
                    pageContainer,
                    safeSentence,
                    pageNumber,
                    getGroupText(safeSentence)
                );
            } else {
                createPersistentHighlight(
                    pageContainer,
                    safeSentence,
                    pageNumber,
                    getGroupText(safeSentence)
                );
            }
        });
    });
}

/* ======================================================
   TEMPORARY PRONUNCIATION HIGHLIGHT
====================================================== */

function handlePronunciation(
    pageContainer,
    selectedSpans,
    pageNumber,
    explicitText = ""
) {
    clearTemporarySpeechHighlight();

    const spans = Array.isArray(selectedSpans) ? selectedSpans : [];
    if (!spans.length) return;

    currentSpeechSentence = spans;
    currentSpeechPageContainer = pageContainer;

    spans.forEach(span => {
        span.classList.add("speech-highlight");
    });

    const text = normalizeText(explicitText) || getGroupText(spans);

    if (!text) {
        clearTemporarySpeechHighlight();
        return;
    }

    speak(
        text,
        () => clearTemporarySpeechHighlight(),
        pageNumber
    );
}

function clearTemporarySpeechHighlight() {
    currentSpeechSentence.forEach(span => {
        span.classList.remove("speech-highlight");
    });

    currentSpeechSentence = [];
    currentSpeechPageContainer = null;
}

/* ======================================================
   SPEECH SYNTHESIS
====================================================== */

function speak(text, onComplete, pageNumber) {
    if (!("speechSynthesis" in window)) {
        pronunciationStatus.textContent =
            "النطق غير مدعوم في هذا المتصفح.";
        onComplete?.();
        return;
    }

    const cleanText = normalizeText(text);

    if (!cleanText) {
        onComplete?.();
        return;
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    const availableVoices = speechSynthesis.getVoices();
    const samantha = availableVoices.find(voice =>
        voice.name.toLowerCase().includes("samantha")
    );

    if (samantha) {
        utterance.voice = samantha;
        utterance.lang = samantha.lang;
    } else if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
    } else {
        utterance.lang = "en-US";
    }

    utterance.rate = speechRate;
    utterance.pitch = 1;

    let completed = false;
    const finish = () => {
        if (completed) return;
        completed = true;
        onComplete?.();
    };

    utterance.onstart = function () {
        pronunciationStatus.textContent = `🔊 ${cleanText}`;
    };

    utterance.onend = function () {
        pronunciationStatus.textContent =
            "🖐️ اضغط على أي كلمة إنجليزية لسماع النطق";
        finish();
    };

    utterance.onerror = function (error) {
        console.error("Speech error:", error);
        pronunciationStatus.textContent = "تعذر تشغيل النطق.";
        finish();
    };

    speechSynthesis.speak(utterance);
}

/* ======================================================
   VOICES
====================================================== */

function loadVoices() {
    if (!("speechSynthesis" in window)) {
        return;
    }

    voices =
        speechSynthesis.getVoices();

    const englishVoices =
        voices.filter(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );

    if (englishVoices.length === 0) {
        return;
    }

    voiceSelect.innerHTML = "";

    englishVoices.forEach(voice => {
        const option =
            document.createElement("option");

        option.value =
            `${voice.name}|${voice.lang}`;

        option.textContent =
            `${voice.name} — ${voice.lang}`;

        voiceSelect.appendChild(option);
    });

    const savedVoice =
        localStorage.getItem(
            "pdfReaderVoice"
        );

    if (savedVoice) {
        const saved =
            englishVoices.find(
                voice =>
                    `${voice.name}|${voice.lang}` ===
                    savedVoice
            );

        if (saved) {
            selectedVoice = saved;
            voiceSelect.value = savedVoice;
            return;
        }
    }

    const samantha =
        englishVoices.find(
            voice =>
                voice.name
                    .toLowerCase()
                    .includes("samantha")
        );

    selectedVoice =
        samantha || englishVoices[0];

    voiceSelect.value =
        `${selectedVoice.name}|${selectedVoice.lang}`;
}

voiceSelect.addEventListener(
    "change",
    function () {
        const value = this.value;

        selectedVoice =
            voices.find(
                voice =>
                    `${voice.name}|${voice.lang}` ===
                    value
            );

        if (selectedVoice) {
            localStorage.setItem(
                "pdfReaderVoice",
                value
            );
        }
    }
);

testVoiceButton.addEventListener(
    "click",
    function () {
        speak(
            "Hello! This is a pronunciation test.",
            null
        );
    }
);


/* ======================================================
   SPEED
====================================================== */

function updateSpeed() {
    speedValue.textContent =
        `${speechRate.toFixed(2)}×`;
}

speedRange.addEventListener(
    "input",
    function () {
        speechRate =
            parseFloat(
                this.value
            );

        updateSpeed();

        localStorage.setItem(
            "pdfReaderSpeechRate",
            String(speechRate)
        );
    }
);

function loadSpeechSettings() {
    const savedRate =
        localStorage.getItem(
            "pdfReaderSpeechRate"
        );

    if (savedRate) {
        const parsed =
            parseFloat(savedRate);

        if (
            !Number.isNaN(parsed) &&
            parsed >= 0.5 &&
            parsed <= 1.5
        ) {
            speechRate = parsed;
        }
    }

    speedRange.value =
        String(speechRate);

    updateSpeed();
}


/* ======================================================
   MODES
====================================================== */

const modeButtons = [
    handTool,
    penTool,
    highlighterTool,
    eraserTool
];

function setActiveMode(mode) {
    activeMode = mode;

    modeButtons.forEach(button => {
        button.classList.remove("active");
    });

    const activeButton = {
        hand: handTool,
        pen: penTool,
        highlighter: highlighterTool,
        eraser: eraserTool
    }[mode];

    activeButton?.classList.add("active");

    document.body.dataset.readerMode =
        mode;

    document.querySelectorAll(".pdf-page")
        .forEach(applyModeToPage);
}

function applyModeToPage(pageContainer) {
    const textLayer =
        pageContainer.querySelector(
            ".textLayer"
        );

    const annotationCanvas =
        pageContainer.querySelector(
            ".annotation-canvas"
        );

    if (!textLayer || !annotationCanvas) {
        return;
    }

    /*
       Hand + Highlighter:
       النص يتلقى الضغط.
    */

    if (
        activeMode === "hand" ||
        activeMode === "highlighter"
    ) {
        textLayer.style.pointerEvents =
            "auto";

        annotationCanvas.style.pointerEvents =
            "none";

    } else {
        /*
           Pen + Eraser:
           لوحة الرسم تتلقى الضغط.
        */

        textLayer.style.pointerEvents =
            "none";

        annotationCanvas.style.pointerEvents =
            "auto";
    }

    annotationCanvas.style.cursor =
        activeMode === "pen"
            ? "crosshair"
            : activeMode === "eraser"
                ? "cell"
                : "default";
}

handTool.addEventListener(
    "click",
    () => setActiveMode("hand")
);

penTool.addEventListener(
    "click",
    () => setActiveMode("pen")
);

highlighterTool.addEventListener(
    "click",
    () => setActiveMode("highlighter")
);

eraserTool.addEventListener(
    "click",
    () => setActiveMode("eraser")
);

penThickness.addEventListener(
    "input",
    function () {
        thicknessValue.textContent =
            this.value;
    }
);


/* ======================================================
   PEN DRAWING
====================================================== */

function setupAnnotationCanvas(
    canvas,
    pageContainer,
    pageNumber
) {
    const ctx =
        canvas.getContext("2d");

    let drawing = false;

    canvas.addEventListener(
        "pointerdown",
        function (event) {
            if (activeMode !== "pen" && activeMode !== "eraser") {
                return;
            }

            event.preventDefault();

            canvas.setPointerCapture(
                event.pointerId
            );

            if (activeMode === "pen") {
                drawing = true;

                const point =
                    getNormalizedPoint(
                        event,
                        canvas
                    );

                activeDrawing = {
                    pageNumber,
                    points: [point],
                    width: Number(
                        penThickness.value
                    )
                };

                redrawAnnotations(
                    pageContainer,
                    pageNumber,
                    activeDrawing
                );

                return;
            }

            if (activeMode === "eraser") {
                eraseAtPoint(
                    event,
                    canvas,
                    pageContainer,
                    pageNumber
                );
            }
        }
    );

    canvas.addEventListener(
        "pointermove",
        function (event) {
            if (
                activeMode === "pen" &&
                drawing &&
                activeDrawing
            ) {
                event.preventDefault();

                activeDrawing.points.push(
                    getNormalizedPoint(
                        event,
                        canvas
                    )
                );

                redrawAnnotations(
                    pageContainer,
                    pageNumber,
                    activeDrawing
                );
            }
        }
    );

    function finishDrawing(event) {
        if (
            activeMode !== "pen" ||
            !drawing ||
            !activeDrawing
        ) {
            return;
        }

        event.preventDefault();

        drawing = false;

        canvas.releasePointerCapture?.(
            event.pointerId
        );

        if (
            activeDrawing.points.length >= 2
        ) {
            const annotations =
                getPageAnnotations(
                    pageNumber
                );

            annotations.strokes.push(
                activeDrawing
            );

            saveAnnotations();
        }

        activeDrawing = null;

        redrawAnnotations(
            pageContainer,
            pageNumber
        );
    }

    canvas.addEventListener(
        "pointerup",
        finishDrawing
    );

    canvas.addEventListener(
        "pointercancel",
        finishDrawing
    );

    canvas.addEventListener(
        "pointerleave",
        function () {
            if (activeMode === "pen" && drawing) {
                /*
                   لا ننهي الرسم عند مغادرة
                   الكانفاس لأن pointer capture
                   سيبقي الرسم مستمراً.
                */
            }
        }
    );

    canvas.addEventListener(
        "click",
        function (event) {
            if (activeMode !== "eraser") {
                return;
            }

            eraseAtPoint(
                event,
                canvas,
                pageContainer,
                pageNumber
            );
        }
    );
}

function getNormalizedPoint(
    event,
    canvas
) {
    const rect =
        canvas.getBoundingClientRect();

    return {
        x:
            Math.max(
                0,
                Math.min(
                    1,
                    (event.clientX - rect.left) /
                    rect.width
                )
            ),
        y:
            Math.max(
                0,
                Math.min(
                    1,
                    (event.clientY - rect.top) /
                    rect.height
                )
            )
    };
}

function drawCurrentStroke(
    ctx,
    canvas,
    stroke
) {
    if (!stroke?.points?.length) {
        return;
    }

    const rect =
        canvas.getBoundingClientRect();

    ctx.save();

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.scale(
        canvas.width / rect.width,
        canvas.height / rect.height
    );

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = Number(
        stroke.width || 5
    );

    ctx.beginPath();

    stroke.points.forEach(
        (point, index) => {
            const x =
                point.x * rect.width;

            const y =
                point.y * rect.height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    );

    ctx.stroke();

    ctx.restore();
}


/* ======================================================
   HIGHLIGHT
====================================================== */

function createPersistentHighlight(
    pageContainer,
    sentence,
    pageNumber
) {
    const rect =
        pageContainer.getBoundingClientRect();

    if (!sentence || sentence.length === 0) {
        return;
    }

    const pageRect =
        pageContainer.getBoundingClientRect();

    const rectangles = [];

    sentence.forEach(span => {
        const spanRect =
            span.getBoundingClientRect();

        if (
            spanRect.width <= 0 ||
            spanRect.height <= 0
        ) {
            return;
        }

        rectangles.push({
            x:
                (spanRect.left - pageRect.left) /
                pageRect.width,

            y:
                (spanRect.top - pageRect.top) /
                pageRect.height,

            width:
                spanRect.width /
                pageRect.width,

            height:
                spanRect.height /
                pageRect.height
        });
    });

    if (rectangles.length === 0) {
        return;
    }

    const annotations =
        getPageAnnotations(
            pageNumber
        );

    annotations.highlights.push(
        rectangles
    );

    saveAnnotations();

    redrawAnnotations(
        pageContainer,
        pageNumber
    );
}


/* ======================================================
   DRAW ALL PERSISTENT ANNOTATIONS
====================================================== */

function redrawAnnotations(
    pageContainer,
    pageNumber,
    temporaryStroke = null
) {
    const canvas =
        pageContainer.querySelector(
            ".annotation-canvas"
        );

    if (!canvas) {
        return;
    }

    const ctx =
        canvas.getContext("2d");

    const displayRect =
        canvas.getBoundingClientRect();

    const width =
        displayRect.width;

    const height =
        displayRect.height;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /*
       الرسم في CSS-pixel coordinates،
       مع دعم Retina.
    */

    ctx.save();

    ctx.scale(
        canvas.width / width,
        canvas.height / height
    );

    const annotations =
        getPageAnnotations(
            pageNumber
        );

    /*
       ==================================================
       HIGHLIGHTS
       ==================================================
    */

    annotations.highlights.forEach(
        group => {
            group.forEach(rect => {
                ctx.fillStyle =
                    "rgba(250, 204, 21, 0.42)";

                ctx.fillRect(
                    rect.x * width,
                    rect.y * height,
                    rect.width * width,
                    rect.height * height
                );
            });
        }
    );

    /*
       ==================================================
       PEN STROKES
       ==================================================
    */

    annotations.strokes.forEach(
        stroke => {
            drawStrokeOnContext(
                ctx,
                width,
                height,
                stroke
            );
        }
    );

    if (temporaryStroke) {
        drawStrokeOnContext(
            ctx,
            width,
            height,
            temporaryStroke
        );
    }

    ctx.restore();
}

function drawStrokeOnContext(
    ctx,
    width,
    height,
    stroke
) {
    if (!stroke?.points?.length) {
        return;
    }

    ctx.save();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth =
        Number(stroke.width || 5);

    ctx.beginPath();

    stroke.points.forEach(
        (point, index) => {
            const x =
                point.x * width;

            const y =
                point.y * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
    );

    ctx.stroke();

    ctx.restore();
}


/* ======================================================
   ERASER
   يمسح stroke كامل أو highlighter group كامل
====================================================== */

function eraseAtPoint(
    event,
    canvas,
    pageContainer,
    pageNumber
) {
    const point =
        getNormalizedPoint(
            event,
            canvas
        );

    const annotations =
        getPageAnnotations(
            pageNumber
        );

    const width =
        canvas.getBoundingClientRect().width;

    const height =
        canvas.getBoundingClientRect().height;

    const hitRadius =
        Math.max(
            8 / Math.max(width, height),
            0.006
        );

    /*
       ابحث من آخر رسم إلى أوله
       حتى تمسح العنصر الأعلى أولاً.
    */

    for (
        let i = annotations.strokes.length - 1;
        i >= 0;
        i--
    ) {
        const stroke =
            annotations.strokes[i];

        if (
            stroke.points.some(
                p =>
                    distance(
                        point,
                        p
                    ) <= hitRadius
            )
        ) {
            annotations.strokes.splice(i, 1);

            saveAnnotations();

            redrawAnnotations(
                pageContainer,
                pageNumber
            );

            return;
        }

        /*
           قياس أقرب نقطة على المسار
           في حالة السحب فوق الخط.
        */

        for (
            let p = 1;
            p < stroke.points.length;
            p++
        ) {
            if (
                distanceToSegment(
                    point,
                    stroke.points[p - 1],
                    stroke.points[p]
                ) <= hitRadius
            ) {
                annotations.strokes.splice(
                    i,
                    1
                );

                saveAnnotations();

                redrawAnnotations(
                    pageContainer,
                    pageNumber
                );

                return;
            }
        }
    }

    /*
       ابحث عن highlighter groups.
    */

    for (
        let i = annotations.highlights.length - 1;
        i >= 0;
        i--
    ) {
        const group =
            annotations.highlights[i];

        const inside =
            group.some(rect =>
                point.x >= rect.x &&
                point.x <= rect.x + rect.width &&
                point.y >= rect.y &&
                point.y <= rect.y + rect.height
            );

        if (inside) {
            annotations.highlights.splice(
                i,
                1
            );

            saveAnnotations();

            redrawAnnotations(
                pageContainer,
                pageNumber
            );

            return;
        }
    }
}

function distance(a, b) {
    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function distanceToSegment(
    point,
    a,
    b
) {
    const dx =
        b.x - a.x;

    const dy =
        b.y - a.y;

    if (dx === 0 && dy === 0) {
        return distance(point, a);
    }

    const t =
        Math.max(
            0,
            Math.min(
                1,
                (
                    (point.x - a.x) * dx +
                    (point.y - a.y) * dy
                ) /
                (dx * dx + dy * dy)
            )
        );

    return distance(
        point,
        {
            x: a.x + t * dx,
            y: a.y + t * dy
        }
    );
}


/* ======================================================
   إشعار أول استخدام
====================================================== */

function maybeShowPronunciationNotice() {
    const seen =
        localStorage.getItem(
            "yazeedPronunciationNoticeSeen"
        );

    if (seen === "true") {
        return;
    }

    pronunciationModal.hidden = false;

    setActiveMode("hand");

    setTimeout(() => {
        understoodButton.focus();
    }, 50);
}

understoodButton.addEventListener(
    "click",
    function () {
        localStorage.setItem(
            "yazeedPronunciationNoticeSeen",
            "true"
        );

        pronunciationModal.hidden = true;
    }
);


/* ======================================================
   KEYBOARD SHORTCUTS
====================================================== */

document.addEventListener(
    "keydown",
    function (event) {
        const active =
            document.activeElement;

        if (
            active &&
            (
                active.tagName === "INPUT" ||
                active.tagName === "TEXTAREA" ||
                active.tagName === "SELECT"
            )
        ) {
            return;
        }

        if (event.key === "ArrowLeft") {
            if (pdfDocument) {
                scrollToPage(
                    currentPage + 1
                );
            }
        }

        if (event.key === "ArrowRight") {
            if (pdfDocument) {
                scrollToPage(
                    currentPage - 1
                );
            }
        }

        if (event.key === "+" || event.key === "=") {
            zoomInButton.click();
        }

        if (event.key === "-") {
            zoomOutButton.click();
        }
    }
);


/* ======================================================
   RESIZE
====================================================== */

let resizeTimer = null;

window.addEventListener(
    "resize",
    function () {
        clearTimeout(resizeTimer);

        resizeTimer =
            setTimeout(() => {
                if (
                    pdfDocument &&
                    readerApp.hidden === false
                ) {
                    buildContinuousViewer(
                        currentPage
                    );
                }
            }, 250);
    }
);


/* ======================================================
   CANCEL SPEECH
====================================================== */

window.addEventListener(
    "beforeunload",
    function () {
        if ("speechSynthesis" in window) {
            speechSynthesis.cancel();
        }
    }
);


/* ======================================================
   INITIALIZATION
====================================================== */

loadSpeechSettings();
setActiveMode("hand");

if ("speechSynthesis" in window) {
    loadVoices();

    speechSynthesis.onvoiceschanged =
        loadVoices;
}

restoreSession();
