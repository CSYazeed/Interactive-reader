/*
=========================================================
 YAZEED ENGLISH — القارئ التفاعلي
 PDF.js 4.10.38
=========================================================

 النظام:

 1. تسجيل الدخول برمز من 6 أرقام
 2. كل رمز يفتح ملف PDF محدد
 3. الموافقة على سياسة الاستخدام
 4. تحميل PDF من مجلد pdfs
 5. PDF.js Canvas
 6. PDF.js Native TextLayer
 7. الضغط على النص الإنجليزي للنطق
 8. اختيار الصوت
 9. التحكم بسرعة النطق
 10. التكبير والتصغير
 11. التنقل بين الصفحات

=========================================================
*/


/* ======================================================
   PDF.JS
====================================================== */

import * as pdfjsLib from
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";


/*
   PDF.js Worker
*/

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* ======================================================
   رموز الدخول وملفات PDF
======================================================

   عدّل هذه القائمة فقط.

   مثال:

   "123456": "pdfs/grammar.pdf"

====================================================== */

const ACCESS_CODES = {

    "111111": "pdfs/grammar1.pdf",

    "222222": "pdfs/grammar2.pdf",

    "581293": "pdfs/grammar3.pdf",

    "726904": "pdfs/grammar4.pdf",

    "915438": "pdfs/grammar5.pdf"

};


/* ======================================================
   عناصر تسجيل الدخول
====================================================== */

const loginScreen =
    document.getElementById("loginScreen");

const loginForm =
    document.getElementById("loginForm");

const accessCodeInput =
    document.getElementById("accessCode");

const loginError =
    document.getElementById("loginError");


/* ======================================================
   عناصر سياسة الاستخدام
====================================================== */

const policyScreen =
    document.getElementById("policyScreen");

const policyAgreement =
    document.getElementById("policyAgreement");

const continueButton =
    document.getElementById("continueButton");

const policyError =
    document.getElementById("policyError");


/* ======================================================
   التطبيق
====================================================== */

const readerApp =
    document.getElementById("readerApp");


/* ======================================================
   عناصر PDF
====================================================== */

const pdfViewer =
    document.getElementById("pdfViewer");

const currentPageElement =
    document.getElementById("currentPage");

    const pageInput =
    document.getElementById("pageInput");

const totalPagesElement =
    document.getElementById("totalPages");

const previousPageButton =
    document.getElementById("previousPage");

const nextPageButton =
    document.getElementById("nextPage");

const zoomOutButton =
    document.getElementById("zoomOut");

const zoomInButton =
    document.getElementById("zoomIn");

const zoomLevelElement =
    document.getElementById("zoomLevel");

const statusMessage =
    document.getElementById("statusMessage");

const pronunciationStatus =
    document.getElementById("pronunciationStatus");


/* ======================================================
   عناصر الصوت
====================================================== */

const voiceSelect =
    document.getElementById("voiceSelect");

const testVoiceButton =
    document.getElementById("testVoiceButton");

const speedRange =
    document.getElementById("speedRange");

const speedValue =
    document.getElementById("speedValue");


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

let selectedTextElement = null;


/*
   رقم عملية الرسم الحالية.

   يمنع الصفحة القديمة من الظهور
   إذا ضغط المستخدم بسرعة على التنقل.
*/

let renderId = 0;


/* ======================================================
   إظهار شاشة الدخول
====================================================== */

function showLoginScreen() {

    loginScreen.hidden = false;

    policyScreen.hidden = true;

    readerApp.hidden = true;

}


/* ======================================================
   إظهار سياسة الاستخدام
====================================================== */

function showPolicyScreen() {

    loginScreen.hidden = true;

    policyScreen.hidden = false;

    readerApp.hidden = true;

}


/* ======================================================
   إظهار القارئ
====================================================== */

function showReaderApp() {

    loginScreen.hidden = true;

    policyScreen.hidden = true;

    readerApp.hidden = false;

}


/* ======================================================
   LOGIN
====================================================== */

loginForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        const code =
            accessCodeInput.value.trim();


        /*
           يجب أن يكون 6 أرقام.
        */

        if (!/^\d{6}$/.test(code)) {

            loginError.textContent =
                "الرجاء إدخال رمز سري مكوّن من 6 أرقام.";

            loginError.hidden = false;

            return;

        }


        /*
           البحث عن الملف.
        */

        const pdfPath =
            ACCESS_CODES[code];


        if (!pdfPath) {

            loginError.textContent =
                "الرمز غير صحيح. تأكد من إدخال الرمز الصحيح.";

            loginError.hidden = false;

            return;

        }


        /*
           حفظ الملف المصرح به.
        */

        authorizedPdfPath =
            pdfPath;


        sessionStorage.setItem(
            "accessGranted",
            "true"
        );


        sessionStorage.setItem(
            "authorizedPdfPath",
            authorizedPdfPath
        );


        /*
           الانتقال إلى السياسة.
        */

        loginError.hidden = true;

        policyAgreement.checked = false;

        policyError.hidden = true;

        showPolicyScreen();

    }
);


/* ======================================================
   منع إدخال أي شيء غير الأرقام
====================================================== */

accessCodeInput.addEventListener(
    "input",
    function () {

        this.value =
            this.value
                .replace(/\D/g, "")
                .slice(0, 6);

    }
);


/* ======================================================
   POLICY AGREEMENT
====================================================== */

continueButton.addEventListener(
    "click",
    async function () {

        if (!policyAgreement.checked) {

            policyError.textContent =
                "يجب الموافقة على الإقرار قبل المتابعة.";

            policyError.hidden = false;

            return;

        }


        policyError.hidden = true;


        /*
           التأكد من وجود ملف.
        */

        if (!authorizedPdfPath) {

            authorizedPdfPath =
                sessionStorage.getItem(
                    "authorizedPdfPath"
                );

        }


        if (!authorizedPdfPath) {

            showLoginScreen();

            return;

        }


        /*
           حفظ الموافقة.
        */

        sessionStorage.setItem(
            "policyAccepted",
            "true"
        );


        showReaderApp();


        await openPDF(
            authorizedPdfPath
        );

    }
);


/* ======================================================
   استعادة الجلسة
====================================================== */

function restoreSession() {

    const accessGranted =
        sessionStorage.getItem(
            "accessGranted"
        );


    const policyAccepted =
        sessionStorage.getItem(
            "policyAccepted"
        );


    const savedPdfPath =
        sessionStorage.getItem(
            "authorizedPdfPath"
        );


    if (
        accessGranted === "true" &&
        savedPdfPath
    ) {

        authorizedPdfPath =
            savedPdfPath;


        if (
            policyAccepted === "true"
        ) {

            showReaderApp();

            openPDF(
                authorizedPdfPath
            );

        } else {

            showPolicyScreen();

        }


        return;

    }


    showLoginScreen();

}


/* ======================================================
   تحميل PDF
====================================================== */

async function openPDF(
    pdfPath
) {

    try {

        statusMessage.textContent =
            "جارٍ تحميل الملف...";


        /*
           تحميل الملف.
        */

        const response =
            await fetch(
                pdfPath,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const arrayBuffer =
            await response.arrayBuffer();


        /*
           تحويل البيانات إلى Uint8Array.
        */

        const data =
            new Uint8Array(
                arrayBuffer
            );


        /*
           PDF.js.
        */

        const loadingTask =
            pdfjsLib.getDocument({
                data: data
            });


        pdfDocument =
            await loadingTask.promise;


        /*
           عدد الصفحات.
        */

        totalPagesElement.textContent =
            pdfDocument.numPages;


        currentPage = 1;

        scale = 1;


        statusMessage.textContent =
            "تم تحميل الملف بنجاح";


        /*
           رسم الصفحة الأولى.
        */

        await renderPage(
            currentPage
        );


        updateNavigation();

    }

    catch (error) {

        console.error(
            "خطأ في تحميل PDF:",
            error
        );


        statusMessage.textContent =
            "تعذر تحميل الملف";

    }

}


/* ======================================================
   رسم صفحة PDF
====================================================== */

async function renderPage(
    pageNumber
) {

    if (!pdfDocument) {

        return;

    }


    /*
       إنشاء رقم للعملية الحالية.
    */

    const thisRenderId =
        ++renderId;


    /*
       الحصول على الصفحة.
    */

    const page =
        await pdfDocument.getPage(
            pageNumber
        );


    /*
       إذا بدأت عملية رسم أخرى،
       تجاهل هذه العملية.
    */

    if (
        thisRenderId !== renderId
    ) {

        return;

    }


    /*
       viewport الأساسي.
    */

    const viewport =
        page.getViewport({
            scale: scale
        });


    /*
       تنظيف الصفحة السابقة.
    */

    pdfViewer.innerHTML = "";


    /*
       حاوية الصفحة.
    */

    const pageContainer =
        document.createElement(
            "div"
        );


    pageContainer.className =
        "pdf-page";


    pageContainer.style.width =
        `${viewport.width}px`;


    pageContainer.style.height =
        `${viewport.height}px`;


    /*
       ==================================================
       CANVAS
       ==================================================
    */

    const canvas =
        document.createElement(
            "canvas"
        );


    const context =
        canvas.getContext(
            "2d"
        );


    /*
       دعم الشاشات عالية الدقة.
    */

    const outputScale =
        window.devicePixelRatio || 1;


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


    /*
       تحويل الرسم إلى Retina resolution.
    */

    const renderContext = {

        canvasContext:
            context,

        viewport:
            page.getViewport({
                scale:
                    scale *
                    outputScale
            })

    };


    /*
       رسم PDF.
    */

    await page.render(
        renderContext
    ).promise;


    if (
        thisRenderId !== renderId
    ) {

        return;

    }


    pageContainer.appendChild(
        canvas
    );


    /*
       ==================================================
       TEXT LAYER
       ==================================================
    */

    const textLayerDiv =
        document.createElement(
            "div"
        );


    /*
       الاسم الذي يستخدمه PDF.js.
    */

    textLayerDiv.className =
        "textLayer";


    pageContainer.appendChild(
        textLayerDiv
    );


    /*
       الحصول على النص.
    */

    const textContent =
        await page.getTextContent();


    /*
       ==================================================
       PDF.JS NATIVE TEXT LAYER
       ==================================================

       في PDF.js 4.10.38،
       TextLayer متوفر من pdfjsLib.

       لا نقوم بتحديد:

       left
       top
       font-size
       transform

       بأنفسنا.

       PDF.js يقوم بكل ذلك.
    */

    if (
        typeof pdfjsLib.TextLayer ===
        "function"
    ) {

        const textLayer =
            new pdfjsLib.TextLayer({

                textContentSource:
                    textContent,

                container:
                    textLayerDiv,

                viewport:
                    viewport

            });


        await textLayer.render();

    }

    else {

        /*
           في حال كانت نسخة CDN لا تصدر
           TextLayer بهذه الطريقة.
        */

        console.error(
            "PDF.js TextLayer غير متوفر في هذه النسخة."
        );


        statusMessage.textContent =
            "خطأ في تشغيل طبقة النص.";

        return;

    }


    /*
       إضافة الصفحة.
    */

    pdfViewer.appendChild(
        pageContainer
    );


    /*
       إضافة النقر للنص.
    */

    setupTextInteraction(
        textLayerDiv
    );


    /*
       تحديث المعلومات.
    */

    currentPageElement.textContent =
        currentPage;


    zoomLevelElement.textContent =
        `${Math.round(scale * 100)}%`;


    selectedTextElement =
        null;

}


/* ======================================================
   التعامل مع نص TextLayer
====================================================== */

function setupTextInteraction(
    textLayer
) {

    const spans =
        textLayer.querySelectorAll(
            "span"
        );


    spans.forEach(
        function (span) {

            const text =
                normalizeText(
                    span.textContent
                );


            if (!text) {

                return;

            }


            /*
               نضيف النقر فقط للنص الإنجليزي.
            */

            if (
                !containsEnglish(
                    text
                )
            ) {

                return;

            }


            span.classList.add(
                "clickable-word"
            );


            span.dataset.speechText =
                text;


            span.title =
                "اضغط لسماع النطق";


            span.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();


                    selectTextAndSpeak(
                        span,
                        text
                    );

                }
            );

        }
    );

}


/* ======================================================
   تنظيف النص
====================================================== */

function normalizeText(
    text
) {

    return text
        .replace(/\s+/g, " ")
        .trim();

}


/* ======================================================
   اكتشاف الإنجليزية
====================================================== */

function containsEnglish(
    text
) {

    return /[A-Za-z]/.test(
        text
    );

}


/* ======================================================
   تحديد النص + النطق
====================================================== */

function selectTextAndSpeak(
    element,
    text
) {

    /*
       إزالة التحديد السابق.
    */

    if (
        selectedTextElement
    ) {

        selectedTextElement.classList.remove(
            "selected-word"
        );

    }


    /*
       تحديد الحالي.
    */

    element.classList.add(
        "selected-word"
    );


    selectedTextElement =
        element;


    /*
       النطق.
    */

    speak(
        text
    );

}


/* ======================================================
   SPEECH SYNTHESIS
====================================================== */

function speak(
    text
) {

    if (
        !("speechSynthesis" in window)
    ) {

        pronunciationStatus.textContent =
            "النطق غير مدعوم في هذا المتصفح.";

        return;

    }


    text =
        normalizeText(
            text
        );


    if (!text) {

        return;

    }


    /*
       إيقاف النطق السابق.
    */

    speechSynthesis.cancel();


    /*
       إنشاء النطق.
    */

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    /*
       الصوت.
    */

    if (selectedVoice) {

        utterance.voice =
            selectedVoice;

        utterance.lang =
            selectedVoice.lang;

    }

    else {

        utterance.lang =
            "en-US";

    }


    /*
       السرعة.
    */

    utterance.rate =
        speechRate;


    /*
       Pitch.
    */

    utterance.pitch =
        1;


    /*
       بداية النطق.
    */

    utterance.onstart =
        function () {

            pronunciationStatus.textContent =
                `🔊 ${text}`;

        };


    /*
       نهاية النطق.
    */

    utterance.onend =
        function () {

            pronunciationStatus.textContent =
                "🔊 اضغط على النص الإنجليزي لسماع النطق";

        };


    /*
       الخطأ.
    */

    utterance.onerror =
        function (error) {

            console.error(
                "Speech error:",
                error
            );

            pronunciationStatus.textContent =
                "تعذر تشغيل النطق.";

        };


    speechSynthesis.speak(
        utterance
    );

}


/* ======================================================
   VOICES
====================================================== */

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {

        return;

    }


    voices =
        speechSynthesis.getVoices();


    /*
       الإنجليزية فقط.
    */

    const englishVoices =
        voices.filter(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    if (
        englishVoices.length === 0
    ) {

        return;

    }


    voiceSelect.innerHTML = "";


    englishVoices.forEach(
        function (voice) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                `${voice.name}|${voice.lang}`;


            option.textContent =
                `${voice.name} — ${voice.lang}`;


            voiceSelect.appendChild(
                option
            );

        }
    );


    /*
       استعادة الصوت.
    */

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

            selectedVoice =
                saved;

            voiceSelect.value =
                savedVoice;

            return;

        }

    }


    /*
       اختيار أول صوت.
    */

    selectedVoice =
        englishVoices[0];


    voiceSelect.value =
        `${selectedVoice.name}|${selectedVoice.lang}`;

}


/* ======================================================
   تغيير الصوت
====================================================== */

voiceSelect.addEventListener(
    "change",
    function () {

        const value =
            this.value;


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
            speechRate
        );

    }
);


/* ======================================================
   اختبار الصوت
====================================================== */

testVoiceButton.addEventListener(
    "click",
    function () {

        speak(
            "Hello! This is a pronunciation test."
        );

    }
);


/* ======================================================
   استعادة إعدادات السرعة
====================================================== */

function loadSpeechSettings() {

    const savedRate =
        localStorage.getItem(
            "pdfReaderSpeechRate"
        );


    if (savedRate) {

        const parsed =
            parseFloat(
                savedRate
            );


        if (
            !Number.isNaN(parsed) &&
            parsed >= 0.5 &&
            parsed <= 1.5
        ) {

            speechRate =
                parsed;

        }

    }


    speedRange.value =
        speechRate;


    updateSpeed();

}


/* ======================================================
   PAGE NAVIGATION
====================================================== */

async function goToPage(
    pageNumber
) {

    if (!pdfDocument) {

        return;

    }


    const target =
        Math.max(
            1,
            Math.min(
                pageNumber,
                pdfDocument.numPages
            )
        );


    if (
        target === currentPage &&
        pdfViewer.children.length > 0
    ) {

        return;

    }


    currentPage =
        target;


    await renderPage(
        currentPage
    );


    updateNavigation();

}

/* ======================================================
   الانتقال المباشر إلى صفحة
====================================================== */

pageInput.addEventListener(
    "change",
    function () {

        if (!pdfDocument) {
            return;
        }

        let requestedPage =
            parseInt(this.value, 10);

        /*
           التأكد من أن الرقم صحيح
        */

        if (Number.isNaN(requestedPage)) {

            this.value = currentPage;

            return;
        }

        /*
           منع تجاوز عدد الصفحات
        */

        requestedPage =
            Math.max(
                1,
                Math.min(
                    requestedPage,
                    pdfDocument.numPages
                )
            );

        /*
           الانتقال للصفحة
        */

        goToPage(requestedPage);

    }
);

/* ======================================================
   الصفحة السابقة
====================================================== */

previousPageButton.addEventListener(
    "click",
    function () {

        goToPage(
            currentPage - 1
        );

    }
);


/* ======================================================
   الصفحة التالية
====================================================== */

nextPageButton.addEventListener(
    "click",
    function () {

        goToPage(
            currentPage + 1
        );

    }
);


/* ======================================================
   تحديث أزرار الصفحات
====================================================== */

function updateNavigation() {

    if (!pdfDocument) {

        previousPageButton.disabled =
            true;

        nextPageButton.disabled =
            true;

        return;

    }


    previousPageButton.disabled =
        currentPage <= 1;


    nextPageButton.disabled =
        currentPage >=
        pdfDocument.numPages;

}


/* ======================================================
   ZOOM
====================================================== */

async function zoomIn() {

    if (!pdfDocument) {

        return;

    }


    scale += 0.1;


    if (scale > 3) {

        scale = 3;

    }


    await renderPage(
        currentPage
    );

}


async function zoomOut() {

    if (!pdfDocument) {

        return;

    }


    scale -= 0.1;


    if (scale < 0.5) {

        scale = 0.5;

    }


    await renderPage(
        currentPage
    );

}


/* ======================================================
   أزرار التكبير
====================================================== */

zoomInButton.addEventListener(
    "click",
    zoomIn
);


zoomOutButton.addEventListener(
    "click",
    zoomOut
);


/* ======================================================
   اختصارات لوحة المفاتيح
====================================================== */

document.addEventListener(
    "keydown",
    function (event) {

        const active =
            document.activeElement;


        /*
           لا نستخدم الاختصارات
           أثناء إدخال الرمز.
        */

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


        if (
            event.key === "ArrowLeft"
        ) {

            goToPage(
                currentPage + 1
            );

        }


        if (
            event.key === "ArrowRight"
        ) {

            goToPage(
                currentPage - 1
            );

        }


        if (
            event.key === "+" ||
            event.key === "="
        ) {

            zoomIn();

        }


        if (
            event.key === "-"
        ) {

            zoomOut();

        }

    }
);


/* ======================================================
   إيقاف النطق عند إغلاق الصفحة
====================================================== */

window.addEventListener(
    "beforeunload",
    function () {

        if (
            "speechSynthesis" in window
        ) {

            speechSynthesis.cancel();

        }

    }
);


/* ======================================================
   INITIALIZATION
====================================================== */

loadSpeechSettings();


if (
    "speechSynthesis" in window
) {

    loadVoices();


    speechSynthesis.onvoiceschanged =
        loadVoices;

}


/* ======================================================
   تشغيل الجلسة
====================================================== */

restoreSession();