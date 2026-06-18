# CLAUDE.md — Flash

## Project Overview

A Flask web app that generates Anki cloze deletion flashcards from sentences in any language. Users paste sentences, select words to memorize, and download a CSV for Anki import.

## How to Run

```bash
source .venv/bin/activate
python app.py
# → http://localhost:5000
```

## Project Structure

```
flash/
├── app.py                    # Flask app — routes: GET /, POST /api/translate, POST /api/generate
├── flashcard/
│   ├── __init__.py
│   ├── translator.py         # deep-translator wrapper (auto-detect → English)
│   └── csv_generator.py      # Anki CSV with {{c1::word}} cloze syntax
├── templates/
│   └── index.html            # Single-page frontend
├── static/
│   ├── style.css
│   └── app.js                # Word selection, card queue, CSV download
├── pyproject.toml
└── README.md
```

## Key Design Decisions

- **Flask** over FastAPI: lightweight, no async needed for a personal tool
- **deep-translator**: free, no API key, auto-detects source language
- **Vanilla JS**: no frontend framework needed for this scope
- **Batch input**: users paste multiple sentences at once (one per line), process them sequentially, download one CSV

## API Endpoints

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `/` | — | HTML page |
| POST | `/api/translate` | `{"sentence": "..."}` | `{"translation": "..."}` |
| POST | `/api/generate` | `{"cards": [{"sentence":"...", "word":"...", "translation":"...", "meaning":"..."}]}` | Tab-separated `.txt` file download |

`translation` and `meaning` are optional in the request — the backend fills
in any that are missing by translating the sentence / word respectively.

## File Format

Tab-separated (not comma) so the separator never collides with sentence
content — no quoting needed and Anki imports cleanly. The file starts with
the `#separator:tab` directive so Anki auto-detects the delimiter.

Four columns:
- `sentence` — cloze sentence with the selected word hidden
- `translation` — English translation of the sentence
- `word` — the hidden word
- `meaning` — English translation of the word

```
#separator:tab
sentence	translation	word	meaning
Je suis allé à l'{{c1::école}} hier	I went to school yesterday	école	school
```

## Adding Features

- New backend logic goes in `flashcard/` package
- New routes in `app.py`
- Frontend changes in `static/app.js` and `static/style.css`
