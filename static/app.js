// State
let sentences = [];
let currentIndex = 0;
let selectedWords = [];
let selectedWordElements = [];
let currentTranslation = "";
let currentMeanings = [];
let deck = [];

// DOM refs
const $ = (id) => document.getElementById(id);

// ── Step 1: process input ──────────────────────────────────────────
function processSentences() {
    const raw = $("sentences-input").value.trim();
    if (!raw) { showError("Please enter at least one sentence."); return; }

    sentences = raw.split("\n").map(s => s.trim()).filter(Boolean);
    if (!sentences.length) { showError("Please enter at least one sentence."); return; }

    currentIndex = 0;
    selectedWords = [];
    selectedWordElements = [];
    currentTranslation = "";
    currentMeanings = [];
    deck = [];
    renderDeck();

    $("step-input").classList.add("hidden");
    renderCurrentSentence();
}

// ── Step 2: render word chips for the current sentence ─────────────
function renderCurrentSentence() {
    if (currentIndex >= sentences.length) {
        showDone();
        return;
    }

    const sentence = sentences[currentIndex];
    selectedWords = [];
    selectedWordElements = [];
    currentTranslation = "";
    currentMeanings = [];

    $("progress-text").textContent = `Sentence ${currentIndex + 1} of ${sentences.length}`;
    $("current-sentence").textContent = sentence;

    const words = sentence.split(/\s+/);
    const container = $("words-container");
    container.innerHTML = "";

    words.forEach((word, i) => {
        const span = document.createElement("span");
        span.className = "word-chip";
        span.textContent = word;
        span.addEventListener("click", () => selectWord(span, word));
        container.appendChild(span);
    });

    $("step-words").classList.remove("hidden");
    $("step-preview").classList.add("hidden");
    hideError();
}

// ── Word selection ──────────────────────────────────────────────────
async function selectWord(element, word) {
    // Toggle selection (allow multiple)
    if (element.classList.contains("selected")) {
        element.classList.remove("selected");
        selectedWords = selectedWords.filter(w => w !== word);
        selectedWordElements = selectedWordElements.filter(el => el !== element);
    } else {
        element.classList.add("selected");
        selectedWords.push(word);
        selectedWordElements.push(element);
    }

    const sentence = sentences[currentIndex];

    // Build cloze preview with all selected words
    let cloze = sentence;
    for (let i = 0; i < selectedWords.length; i++) {
        const word = selectedWords[i];
        cloze = cloze.replace(word, `{{c${i + 1}::${word}}}`);
    }
    $("cloze-preview").textContent = cloze;

    // Update preview section title and show
    $("preview-title").textContent = selectedWords.length === 1
        ? "Cloze & translation"
        : `Cloze (${selectedWords.length} words) & translations`;
    $("translation-preview").innerHTML = Array.from(
        {length: selectedWords.length},
        (_, i) => `<div class="translation-item">${selectedWords[i]}: <span class="translating">Translating...</span></div>`
    ).join("");
    $("meaning-preview").innerHTML = Array.from(
        {length: selectedWords.length},
        (_, i) => `<div class="translation-item">${selectedWords[i]}: <span class="translating">Translating...</span></div>`
    ).join("");

    // Fetch all translations and meanings
    if (selectedWords.length > 0) {
        const [sentenceTrans, ...wordTranslations] = await Promise.all([
            translateText(sentence),
            ...selectedWords.map(w => translateText(w))
        ]);
        currentTranslation = sentenceTrans;
        currentMeanings = wordTranslations;

        // Update preview
        $("translation-preview").innerHTML = selectedWords.map((word, i) =>
            `<div class="translation-item">${word}: ${currentMeanings[i] || "(translation unavailable)"}</div>`
        ).join("");
        $("meaning-preview").innerHTML = selectedWords.map((word, i) =>
            `<div class="translation-item">${word}: ${currentMeanings[i] || "(translation unavailable)"}</div>`
        ).join("");
    }

    $("step-preview").classList.remove("hidden");
}

async function translateText(text) {
    try {
        const resp = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sentence: text }),
        });
        const data = await resp.json();
        return data.translation;
    } catch {
        return "(translation unavailable)";
    }
}

// ── Add card to deck ────────────────────────────────────────────────
function addToDeck() {
    if (selectedWords.length === 0) { showError("Please select at least one word."); return; }

    const sentence = sentences[currentIndex];
    // Build cloze with all selected words
    let cloze = sentence;
    for (let i = 0; i < selectedWords.length; i++) {
        const word = selectedWords[i];
        cloze = cloze.replace(word, `{{c${i + 1}::${word}}}`);
    }

    deck.push({
        sentence: sentence,
        words: [...selectedWords],
        translation: currentTranslation,
        meanings: [...currentMeanings],
        cloze: cloze,
    });

    renderDeck();
    advance();
}

// ── Skip current sentence ──────────────────────────────────────────
function skipSentence() {
    advance();
}

// ── Advance to next sentence ───────────────────────────────────────
function advance() {
    currentIndex++;
    $("step-words").classList.add("hidden");
    $("step-preview").classList.add("hidden");
    renderCurrentSentence();
}

// ── Step: all done ─────────────────────────────────────────────────
function showDone() {
    $("step-words").classList.add("hidden");
    $("step-preview").classList.add("hidden");
    $("step-done").classList.remove("hidden");
}

// ── Sidebar deck management ────────────────────────────────────────
function renderDeck() {
    $("card-count").textContent = deck.length;
    $("download-all-btn").disabled = deck.length === 0;

    const list = $("card-list");
    if (!deck.length) {
        list.innerHTML = '<p class="empty-hint">No cards yet. Add some from the main panel.</p>';
        return;
    }

    list.innerHTML = deck.map((card, i) => `
        <div class="card-item">
            <button class="remove-btn" onclick="removeFromDeck(${i})" title="Remove">×</button>
            <div class="cloze-text">${escapeHtml(card.cloze)}</div>
            <div class="original-text">${escapeHtml(card.word)} → ${escapeHtml(card.meaning)}</div>
        </div>
    `).join("");
}

function removeFromDeck(index) {
    deck.splice(index, 1);
    renderDeck();
}

// ── Download CSV ───────────────────────────────────────────────────
async function downloadCSV() {
    if (!deck.length) return;

    try {
        const resp = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                cards: deck.map(c => ({
                    sentence: c.sentence,
                    words: c.words,
                    translation: c.translation,
                    meanings: c.meanings,
                })),
            }),
        });

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "flashcards.txt";
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        showError("Failed to generate CSV. Please try again.");
    }
}

// ── Reset ──────────────────────────────────────────────────────────
function resetApp() {
    sentences = [];
    currentIndex = 0;
    selectedWord = "";
    selectedElement = null;
    currentTranslation = "";
    currentMeaning = "";
    deck = [];

    $("sentences-input").value = "";
    $("step-input").classList.remove("hidden");
    $("step-words").classList.add("hidden");
    $("step-preview").classList.add("hidden");
    $("step-done").classList.add("hidden");
    renderDeck();
    hideError();
}

// ── Helpers ────────────────────────────────────────────────────────
function showError(msg) {
    const el = $("error-msg");
    el.textContent = msg;
    el.classList.remove("hidden");
}

function hideError() {
    $("error-msg").classList.add("hidden");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
