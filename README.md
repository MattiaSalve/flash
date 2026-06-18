# Flash

Generate Anki cloze deletion flashcards from sentences in any language.

## What it does

1. Paste one or more sentences (one per line)
2. For each sentence, click the word you want to memorize
3. Preview the cloze card and English translation
4. Add cards to your deck
5. Download a single CSV file and import it into Anki

## Setup

```bash
# Create a virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install flask deep-translator
```

## Running

```bash
python app.py
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

## Importing into Anki

1. Open Anki → **File → Import**
2. Select the downloaded `flashcards.txt`
3. Choose note type: **Cloze**
4. Map the `cloze` field to the **Text** field
5. The `{{c1::word}}` syntax is natively understood by Anki

## How it works

- **Translation**: Uses [deep-translator](https://github.com/nidhaloff/deep-translator) (free Google Translate wrapper) with auto language detection
- **Cloze syntax**: Selected words are wrapped in `{{c1::word}}` — Anki's native cloze deletion format
- **File format**: Tab-separated with four columns — `sentence` (cloze sentence), `translation` (sentence translation), `word` (hidden word), `meaning` (word translation). Tabs are used instead of commas so the separator never appears inside a sentence; the file begins with `#separator:tab` so Anki auto-detects it.
