from flask import Flask, render_template, request, send_file, jsonify
from flashcard.translator import translate_sentence
from flashcard.csv_generator import generate_anki_csv
import io

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/translate")
def translate():
    data = request.get_json()
    translation = translate_sentence(data["sentence"])
    return jsonify(translation=translation)


@app.post("/api/generate")
def generate():
    data = request.get_json()
    cards = data["cards"]

    # Fill in any translations the client didn't already provide
    for card in cards:
        if not card.get("translation"):
            card["translation"] = translate_sentence(card["sentence"])
        if not card.get("meaning"):
            card["meaning"] = translate_sentence(card["word"])

    csv_content = generate_anki_csv(cards)

    buf = io.BytesIO(csv_content.encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        mimetype="text/tab-separated-values",
        as_attachment=True,
        download_name="flashcards.txt",
    )


if __name__ == "__main__":
    app.run(debug=True)
