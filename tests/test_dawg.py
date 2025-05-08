# tests/test_dawg.py
from game_logic.dawg import Dawg

DICT = "static/data/NWL2023.txt"


def test_basic_lookup():
    d = Dawg.from_wordlist_file(DICT)

    # Known good words
    for w in ("CAT", "QUIZ", "BARNACLE", "BEANS"):
        assert d.is_word(w)

    # Random non-words
    for w in ("ZZZZ", "CATZ", "HELLOO", "DAT"):
        assert not d.is_word(w)

    # Prefix checks
    assert d.is_prefix("CAT")
    assert d.is_prefix("QU")
    assert not d.is_prefix("ZX")

