/*
==================================================
 INTERACTIVE PDF READER
==================================================

 Features:

 ✓ PDF upload
 ✓ PDF.js rendering
 ✓ Text layer
 ✓ English text detection
 ✓ Click text to pronounce
 ✓ Voice selection
 ✓ Voice testing
 ✓ Speech speed control
 ✓ Saved voice preference
 ✓ Saved speed preference
 ✓ Page navigation
 ✓ Zoom
*/


/* ==============================================
   IMPORT PDF.JS
============================================== */

import * as pdfjsLib from
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";


/* ==============================================
   PDF.JS WORKER
============================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


/* ==============================================
   HTML ELEMENTS
============================================== */

const pdfInput =
    document.getElementById("pdfInput");

const pdfInputLarge =
    document.getElementById("pdfInputLarge");

const pdfViewer =
    document.getElementById("pdfViewer");

const welcomeScreen =
    document.getElementById("welcomeScreen");

const currentPageElement =
    document.getElementById("currentPage");

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
    document.getElementById(
        "pronunciationStatus"
    );


/* ==============================================
   VOICE ELEMENTS
============================================== */

const voiceSelect =
    document.getElementById(
        "voiceSelect"
    );

const testVoiceButton =
    document.getElementById(
        "testVoiceButton"
    );

const speedRange =
    document.getElementById(
        "speedRange"
    );

const speedValue =
    document.getElementById(
        "speedValue"
    );


/* ==============================================
   VARIABLES
============================================== */

let pdfDocument = null;

let currentPage = 1;

let scale = 1.0;

let selectedWordElement = null;


/*
   All available browser voices.
*/

let voices = [];


/*
   Currently selected voice.
*/

let selectedVoice = null;


/*
   Default speaking speed.

   0.85 is intentionally slightly slower
   because this is an English learning website.
*/

let speechRate = 0.85;


/* ==============================================
   LOAD SAVED SETTINGS
============================================== */

function loadSpeechSettings() {

    const savedRate =
        localStorage.getItem(
            "pdfReaderSpeechRate"
        );


    if (savedRate) {

        speechRate =
            parseFloat(savedRate);

        speedRange.value =
            speechRate;

        updateSpeedDisplay();
    }

}


/* ==============================================
   GET BROWSER VOICES
============================================== */

function loadVoices() {

    /*
       Get all voices installed/available
       on the user's device.
    */

    voices =
        speechSynthesis.getVoices();


    /*
       Some browsers return voices that
       aren't English.

       We only want English voices.
    */

    const englishVoices =
        voices.filter(
            voice =>
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    /*
       Clear current options.
    */

    voiceSelect.innerHTML = "";


    /*
       If there are no voices yet,
       show a message.

       Some browsers load voices
       asynchronously.
    */

    if (
        englishVoices.length === 0
    ) {

        const option =
            document.createElement(
                "option"
            );

        option.textContent =
            "Loading English voices...";

        option.disabled = true;

        voiceSelect.appendChild(
            option
        );

        return;
    }


    /*
       Sort voices.

       We try to put more natural
       sounding voices near the top.

       Words such as:
       "Natural"
       "Online"
       "Neural"

       are often associated with
       higher-quality voices.
    */

    englishVoices.sort(
        (a, b) => {

            const aScore =
                getVoiceQualityScore(a);

            const bScore =
                getVoiceQualityScore(b);

            return bScore - aScore;
        }
    );


    /*
       Create dropdown options.
    */

    englishVoices.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            /*
               Use a unique value.
            */

            option.value =
                `${voice.name}|${voice.lang}`;


            /*
               Create friendly label.
            */

            option.textContent =
                createVoiceLabel(voice);


            voiceSelect.appendChild(
                option
            );
        }
    );


    /*
       Try to restore the voice
       previously selected by the user.
    */

    const savedVoice =
        localStorage.getItem(
            "pdfReaderVoice"
        );


    if (savedVoice) {

        const matchingVoice =
            englishVoices.find(
                voice =>
                    `${voice.name}|${voice.lang}` ===
                    savedVoice
            );


        if (matchingVoice) {

            selectedVoice =
                matchingVoice;

            voiceSelect.value =
                savedVoice;

            return;
        }
    }


    /*
       No saved voice.

       Choose the highest-quality
       voice from our sorted list.
    */

    selectedVoice =
        englishVoices[0];


    voiceSelect.value =
        `${selectedVoice.name}|${selectedVoice.lang}`;
}


/* ==============================================
   VOICE QUALITY SCORE
============================================== */

function getVoiceQualityScore(voice) {

    let score = 0;


    const name =
        voice.name.toLowerCase();


    /*
       These keywords often indicate
       higher-quality voices.
    */

    if (name.includes("natural")) {

        score += 100;
    }


    if (name.includes("neural")) {

        score += 90;
    }


    if (name.includes("online")) {

        score += 80;
    }


    /*
       Prefer United States English
       for this English-learning project.
    */

    if (
        voice.lang.toLowerCase() ===
        "en-us"
    ) {

        score += 30;
    }


    /*
       Prefer United Kingdom English
       next.
    */

    if (
        voice.lang.toLowerCase() ===
        "en-gb"
    ) {

        score += 20;
    }


    return score;
}


/* ==============================================
   CREATE VOICE LABEL
============================================== */

function createVoiceLabel(voice) {

    /*
       Example:

       Microsoft Jenny Online (Natural)
       English (United States)
    */

    const language =
        getLanguageName(
            voice.lang
        );


    return `${voice.name} — ${language}`;
}


/* ==============================================
   LANGUAGE NAME
============================================== */

function getLanguageName(languageCode) {

    try {

        return new Intl.DisplayNames(
            ["en"],
            {
                type: "language"
            }
        ).of(languageCode);

    } catch {

        return languageCode;

    }
}


/* ==============================================
   VOICE SELECT EVENT
============================================== */

voiceSelect.addEventListener(
    "change",
    function() {

        const value =
            this.value;


        /*
           Find the selected voice.
        */

        selectedVoice =
            voices.find(
                voice =>
                    `${voice.name}|${voice.lang}` ===
                    value
            );


        /*
           Save the selection.

           This means when the student
           returns later, their preferred
           voice will still be selected.
        */

        if (selectedVoice) {

            localStorage.setItem(
                "pdfReaderVoice",
                value
            );


            pronunciationStatus.textContent =
                `🎙️ ${selectedVoice.name}`;
        }

    }
);


/* ==============================================
   SPEED CONTROL
============================================== */

speedRange.addEventListener(
    "input",
    function() {

        speechRate =
            parseFloat(this.value);


        updateSpeedDisplay();


        /*
           Save speed.
        */

        localStorage.setItem(
            "pdfReaderSpeechRate",
            speechRate
        );

    }
);


/* ==============================================
   UPDATE SPEED DISPLAY
============================================== */

function updateSpeedDisplay() {

    speedValue.textContent =
        `${speechRate.toFixed(2)}×`;
}


/* ==============================================
   TEST VOICE
============================================== */

testVoiceButton.addEventListener(
    "click",
    function() {

        speak(
            "Hello! This is a pronunciation test."
        );

    }
);


/* ==============================================
   TEXT TO SPEECH
============================================== */

function speak(text) {

    /*
       Make sure browser supports
       speech synthesis.
    */

    if (
        !("speechSynthesis" in window)
    ) {

        alert(
            "Text-to-speech is not supported in this browser."
        );

        return;
    }


    /*
       Stop anything currently speaking.
    */

    speechSynthesis.cancel();


    /*
       Create speech object.
    */

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    /*
       Use selected voice.
    */

    if (selectedVoice) {

        utterance.voice =
            selectedVoice;


        /*
           Use the voice's actual
           language.

           This is better than always
           forcing en-US.
        */

        utterance.lang =
            selectedVoice.lang;

    } else {

        /*
           Fallback.
        */

        utterance.lang =
            "en-US";
    }


    /*
       Use selected speed.
    */

    utterance.rate =
        speechRate;


    /*
       Normal pitch.
    */

    utterance.pitch =
        1;


    /*
       Update status when speech starts.
    */

    utterance.onstart =
        function() {

            pronunciationStatus.textContent =
                `🔊 ${text}`;

        };


    /*
       Update status when speech finishes.
    */

    utterance.onend =
        function() {

            pronunciationStatus.textContent =
                "🔊 Click English text";

        };


    /*
       Handle errors.
    */

    utterance.onerror =
        function(event) {

            console.error(
                "Speech error:",
                event
            );

            pronunciationStatus.textContent =
                "⚠️ Could not play voice";

        };


    /*
       Speak.
    */

    speechSynthesis.speak(
        utterance
    );
}


/* ==============================================
   OPEN PDF
============================================== */

async function openPDF(file) {

    if (!file) {
        return;
    }


    if (
        file.type !==
        "application/pdf"
    ) {

        alert(
            "Please select a PDF file."
        );

        return;
    }


    try {

        const arrayBuffer =
            await file.arrayBuffer();


        const typedArray =
            new Uint8Array(
                arrayBuffer
            );


        /*
           Load PDF.
        */

        pdfDocument =
            await pdfjsLib
                .getDocument({
                    data: typedArray
                })
                .promise;


        /*
           Update page count.
        */

        totalPagesElement.textContent =
            pdfDocument.numPages;


        /*
           Start from page 1.
        */

        currentPage = 1;


        /*
           Hide welcome screen.
        */

        welcomeScreen.style.display =
            "none";


        /*
           Show file name.
        */

        statusMessage.textContent =
            file.name;


        /*
           Render page.
        */

        await renderPage(
            currentPage
        );


        updateNavigation();

    } catch (error) {

        console.error(error);

        alert(
            "There was a problem opening this PDF."
        );

    }
}


/* ==============================================
   RENDER PAGE
============================================== */

async function renderPage(
    pageNumber
) {

    if (!pdfDocument) {
        return;
    }


    const page =
        await pdfDocument.getPage(
            pageNumber
        );


    const viewport =
        page.getViewport({
            scale: scale
        });


    /*
       Clear previous page.
    */

    pdfViewer.innerHTML =
        "";


    /*
       Create page container.
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
       Canvas.
    */

    const canvas =
        document.createElement(
            "canvas"
        );


    const context =
        canvas.getContext(
            "2d"
        );


    const devicePixelRatio =
        window.devicePixelRatio || 1;


    canvas.width =
        viewport.width *
        devicePixelRatio;

    canvas.height =
        viewport.height *
        devicePixelRatio;

    canvas.style.width =
        `${viewport.width}px`;

    canvas.style.height =
        `${viewport.height}px`;


    context.scale(
        devicePixelRatio,
        devicePixelRatio
    );


    pageContainer.appendChild(
        canvas
    );


    /*
       Text layer.
    */

    const textLayer =
        document.createElement(
            "div"
        );

    textLayer.className =
        "text-layer";


    pageContainer.appendChild(
        textLayer
    );


    pdfViewer.appendChild(
        pageContainer
    );


    /*
       Render PDF.
    */

    await page.render({

        canvasContext: context,

        viewport: viewport

    }).promise;


    /*
       Get PDF text.
    */

    const textContent =
        await page.getTextContent();


    /*
       Build clickable text.
    */

    createTextLayer(
        textContent,
        viewport,
        textLayer
    );


    currentPageElement.textContent =
        pageNumber;


    zoomLevelElement.textContent =
        `${Math.round(scale * 100)}%`;


    /*
       Scroll back to top.
    */

    document
        .querySelector(
            ".viewer-container"
        )
        .scrollTop = 0;
}


/* ==============================================
   CREATE TEXT LAYER
============================================== */

function createTextLayer(
    textContent,
    viewport,
    textLayer
) {

    textContent.items.forEach(
        item => {

            const text =
                item.str;


            /*
               Ignore empty items.
            */

            if (!text.trim()) {
                return;
            }


            /*
               Transform PDF coordinates.
            */

            const transform =
                pdfjsLib.Util.transform(
                    viewport.transform,
                    item.transform
                );


            const x =
                transform[4];

            const y =
                transform[5];


            /*
               Determine font size.
            */

            const fontSize =
                Math.sqrt(
                    transform[2] *
                    transform[2] +
                    transform[3] *
                    transform[3]
                );


            /*
               Create text element.
            */

            const span =
                document.createElement(
                    "span"
                );


            span.textContent =
                text;


            span.style.left =
                `${x}px`;


            span.style.top =
                `${y - fontSize}px`;


            span.style.fontSize =
                `${fontSize}px`;


            /*
               Only make English text
               clickable.
            */

            if (
                containsEnglish(text)
            ) {

                span.classList.add(
                    "clickable-word"
                );


                span.dataset.text =
                    text.trim();


                span.addEventListener(
                    "click",
                    function(event) {

                        event.stopPropagation();


                        selectAndSpeak(
                            span,
                            span.dataset.text
                        );

                    }
                );

            }


            textLayer.appendChild(
                span
            );

        }
    );
}


/* ==============================================
   DETECT ENGLISH
============================================== */

function containsEnglish(text) {

    return /[A-Za-z]/.test(
        text
    );
}


/* ==============================================
   SELECT + SPEAK
============================================== */

function selectAndSpeak(
    element,
    text
) {

    /*
       Remove previous highlight.
    */

    if (
        selectedWordElement
    ) {

        selectedWordElement
            .classList
            .remove(
                "selected-word"
            );

    }


    /*
       Highlight current text.
    */

    element.classList.add(
        "selected-word"
    );


    selectedWordElement =
        element;


    /*
       Speak.
    */

    speak(text);
}


/* ==============================================
   NEXT PAGE
============================================== */

async function nextPage() {

    if (!pdfDocument) {
        return;
    }


    if (
        currentPage <
        pdfDocument.numPages
    ) {

        currentPage++;

        await renderPage(
            currentPage
        );

        updateNavigation();

    }
}


/* ==============================================
   PREVIOUS PAGE
============================================== */

async function previousPage() {

    if (!pdfDocument) {
        return;
    }


    if (currentPage > 1) {

        currentPage--;

        await renderPage(
            currentPage
        );

        updateNavigation();

    }
}


/* ==============================================
   NAVIGATION
============================================== */

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


/* ==============================================
   ZOOM IN
============================================== */

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


/* ==============================================
   ZOOM OUT
============================================== */

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


/* ==============================================
   FILE INPUTS
============================================== */

pdfInput.addEventListener(
    "change",
    function() {

        openPDF(
            this.files[0]
        );

    }
);


pdfInputLarge.addEventListener(
    "change",
    function() {

        openPDF(
            this.files[0]
        );

    }
);


/* ==============================================
   PAGE BUTTONS
============================================== */

nextPageButton.addEventListener(
    "click",
    nextPage
);


previousPageButton.addEventListener(
    "click",
    previousPage
);


/* ==============================================
   ZOOM BUTTONS
============================================== */

zoomInButton.addEventListener(
    "click",
    zoomIn
);


zoomOutButton.addEventListener(
    "click",
    zoomOut
);


/* ==============================================
   KEYBOARD SHORTCUTS
============================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "ArrowRight"
        ) {

            nextPage();

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            previousPage();

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


/* ==============================================
   INITIALIZE SPEECH SETTINGS
============================================== */

loadSpeechSettings();

updateSpeedDisplay();


/*
==================================================
 IMPORTANT:
 VOICES MAY LOAD AFTER PAGE LOAD
==================================================

 Chrome and other browsers sometimes don't
 immediately return the voices.

 So we listen for voiceschanged.
*/

speechSynthesis.onvoiceschanged =
    function() {

        loadVoices();

    };


/*
   Try loading immediately too.
*/

loadVoices();