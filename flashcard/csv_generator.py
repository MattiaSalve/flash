import csv
import io


def build_cloze(sentence: str, word: str) -> str:
    """Replace the first occurrence of *word* in *sentence* with Anki cloze syntax."""
    return sentence.replace(word, f"{{{{c1::{word}}}}}", 1)


def generate_anki_csv(cards: list[dict]) -> str:
    """
    Generate an Anki-compatible tab-separated string.

    Tabs are used as the field separator because they (unlike commas) don't
    appear in normal sentences, so no quoting/escaping is needed and Anki
    imports the rows cleanly. The leading ``#separator:tab`` directive tells
    Anki to split on tabs automatically.

    Parameters
    ----------
    cards : list of dicts, each with keys "sentence", "word", "translation"
        (sentence translation) and "meaning" (word translation)

    Returns
    -------
    str – Tab-separated content with an Anki directive, header row, and one
    row per card.

    Columns
    -------
    sentence    : cloze sentence with the selected word hidden
    translation : English translation of the sentence
    word        : the hidden word
    meaning     : English translation of the word
    """
    buf = io.StringIO()
    buf.write("#separator:tab\n")
    writer = csv.writer(buf, delimiter="\t")
    writer.writerow(["sentence", "translation", "word", "meaning"])

    for card in cards:
        cloze = build_cloze(card["sentence"], card["word"])
        writer.writerow([cloze, card["translation"], card["word"], card["meaning"]])

    return buf.getvalue()
