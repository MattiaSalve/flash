import csv
import io


def build_cloze(sentence: str, words: list[str]) -> str:
    """Replace the first occurrence of each word in *words* with Anki cloze syntax (c1, c2, ...)."""
    result = sentence
    for i, word in enumerate(words, start=1):
        result = result.replace(word, f"{{{{c{i}::{word}}}}}", 1)
    return result


def generate_anki_csv(cards: list[dict]) -> str:
    """
    Generate an Anki-compatible tab-separated string.

    Tabs are used as the field separator because they (unlike commas) don't
    appear in normal sentences, so no quoting/escaping is needed and Anki
    imports the rows cleanly. The leading ``#separator:tab`` directive tells
    Anki to split on tabs automatically.

    Parameters
    ----------
    cards : list of dicts, each with keys "sentence", "words", "translations",
        "meanings" where:
        - "sentence" is the original sentence
        - "words" is a list of selected words to hide
        - "translations" is the sentence translation
        - "meanings" is a list of word translations (same order as "words")

    Returns
    -------
    str – Tab-separated content with an Anki directive, header row, and one
    row per card.

    Columns
    -------
    sentence    : cloze sentence with selected words hidden
    translation : English translation of the sentence
    words       : comma-separated list of hidden words (or single)
    meanings    : comma-separated list of word translations (same order as "words")
    """
    buf = io.StringIO()
    buf.write("#separator:tab\n")
    writer = csv.writer(buf, delimiter="\t")
    writer.writerow(["sentence", "translation", "words", "meanings"])

    for card in cards:
        cloze = build_cloze(card["sentence"], card["words"])
        writer.writerow([
            cloze,
            card["translations"],
            ", ".join(card["words"]),
            ", ".join(card["meanings"])
        ])

    return buf.getvalue()
