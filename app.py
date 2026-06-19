from flask import Flask, render_template, request, send_file, jsonify
from flashcard.translator import translate_sentence
from flashcard.csv_generator import generate_anki_csv
import io
import os
import argparse

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
        if not card.get("meanings"):
            # Translate each word individually
            card["meanings"] = [translate_sentence(w) for w in card["words"]]

    csv_content = generate_anki_csv(cards)

    buf = io.BytesIO(csv_content.encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        mimetype="text/tab-separated-values",
        as_attachment=True,
        download_name="flashcards.txt",
    )


def parse_args():
    """Parse command line arguments for host and port."""
    parser = argparse.ArgumentParser(
        description="Run the Flashcard app",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host interface to bind to (0.0.0.0 for network access)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5000,
        help="Port to listen on"
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        default=True,
        help="Enable debug mode"
    )
    return parser.parse_args()


if __name__ == "__main__":
    # Parse command line arguments
    args = parse_args()

    print(f"Starting Flask app on {args.host}:{args.port}")
    print(f"Debug mode: {args.debug}")
    print(f"Access from other devices: http://{args.host if args.host != '0.0.0.0' else '<your-raspberry-pi-ip>'}:{args.port}")
    app.run(host=args.host, port=args.port, debug=args.debug)
