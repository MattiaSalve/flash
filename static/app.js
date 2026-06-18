// State
let sentences = [];
let currentIndex = 0;
let selectedWord = "";
let selectedElement = null;
let currentTranslation = "";
let currentMeaning = "";
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
    selectedWord = "";
    selectedElement = null;
    currentTranslation = "";

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
    // Deselect previous
    document.querySelectorAll(".word-chip").forEach(c => c.classList.remove("selected"));
    element.classList.add("selected");
    selectedWord = word;
    selectedElement = element;

    const sentence = sentences[currentIndex];

    // Build cloze locally
    const cloze = sentence.replace(word, `{{c1::${word}}}`);
    $("cloze-preview").textContent = cloze;
    $("translation-preview").textContent = "Translating…";
    $("meaning-preview").textContent = "Translating…";
    $("step-preview").classList.remove("hidden");

    // Fetch sentence translation and word meaning in parallel
    [currentTranslation, currentMeaning] = await Promise.all([
        translateText(sentence),
        translateText(word),
    ]);
    $("translation-preview").textContent = currentTranslation;
    $("meaning-preview").textContent = currentMeaning;
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
    if (!selectedWord) { showError("Please select a word first."); return; }

    const sentence = sentences[currentIndex];
    const cloze = sentence.replace(selectedWord, `{{c1::${selectedWord}}}`);

    deck.push({
        sentence: sentence,
        word: selectedWord,
        translation: currentTranslation,
        meaning: currentMeaning,
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
                    word: c.word,
                    translation: c.translation,
                    meaning: c.meaning,
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
