"""High‑level make_bot_move exposed to Flask."""
from __future__ import annotations

from collections import Counter
from typing import List, Dict, Any
import random

from .dawg import Dawg
from .board import Board
from .generator import find_all_moves
from .validation import find_all_moves_with_validation

# Load dictionary at module import
DICT_PATH = "static/data/NWL2023.txt"
DAWG = Dawg.from_wordlist_file(DICT_PATH)

TILE_POINTS = {
    **{ch: 1 for ch in "EAIONRTLSU"},
    **{ch: 2 for ch in "DG"},
    **{ch: 3 for ch in "BCMP"},
    **{ch: 4 for ch in "FHVWY"},
    "K": 5,
    **{ch: 8 for ch in "JX"},
    **{ch: 10 for ch in "QZ"},
}


def make_bot_move(
    board_state: str,
    player_rack,
    bot_rack,
    tile_bag,
):
    """
    Returns a dict for /get_move:
        • plays use lower-case letters to mark blanks (matches your JS)
        • rack & bag are updated; blanks scored as 0
        • score still 0 for now (full scoring comes later)
    """
    print("Making bot move...")
    board = Board.from_string(board_state)
    print(f"Board parsed, finding anchors...")
    
    # Print anchors for debugging
    anchors = board.anchors()
    print(f"Found {len(anchors)} anchors: {anchors}")

    # build Counter with '' for blanks
    rack_counter = Counter(
        "" if not t.get("letter") else t["letter"].upper()
        for t in bot_rack
    )
    print(f"Bot rack: {rack_counter}")

    # Generate potential moves
    moves = find_all_moves_with_validation(board, rack_counter.copy(), DAWG)
    
    # Debug: check the moves
    print(f"Found {len(moves)} possible moves")
    for i, move in enumerate(sorted(moves, key=lambda m: m.score, reverse=True)[:5]):
        print(f"Move {i+1}: {move.word} at ({move.row},{move.col}) {move.direction} for {move.score} points")
        # Verify move is valid
        if not DAWG.is_word(move.word.upper()):
            print(f"WARNING: Invalid word generated: {move.word}")
    
    if not moves:
        print("No valid moves found. Bot will pass.")
        return {
            "move": "pass",
            "newBotRack": bot_rack,
            "newTileBag": tile_bag,
        }

    # Filter out invalid words (additional validation)
    valid_moves = [move for move in moves if DAWG.is_word(move.word.upper())]
    
    if not valid_moves:
        print("No valid words found after filtering. Bot will exchange or pass.")
        if len(tile_bag) >= 7:  # Only exchange if there are enough tiles in the bag
            # Exchange up to 3 random tiles
            num_to_exchange = min(3, len(bot_rack))
            tiles_to_exchange = random.sample(bot_rack, num_to_exchange)
            exchanged_indices = [bot_rack.index(t) for t in tiles_to_exchange]
            
            # Remove exchanged tiles from rack
            new_bot_rack = [t for i, t in enumerate(bot_rack) if i not in exchanged_indices]
            
            # Add exchanged tiles back to the bag
            new_tile_bag = tile_bag + tiles_to_exchange
            
            # Draw new tiles
            drawn = new_tile_bag[:num_to_exchange]
            new_tile_bag = new_tile_bag[num_to_exchange:]
            new_bot_rack.extend(drawn)
            
            return {
                "move": "exchange",
                "exchanged": [t["letter"] for t in tiles_to_exchange],
                "newBotRack": new_bot_rack,
                "newTileBag": new_tile_bag,
            }
        else:
            return {
                "move": "pass",
                "newBotRack": bot_rack,
                "newTileBag": tile_bag,
            }

    # Sort by score and pick the best
    valid_moves.sort(key=lambda m: m.score, reverse=True)
    best = valid_moves[0]
    
    print(f"Selected best move: {best.word} at ({best.row},{best.col}) {best.direction} for {best.score} points")

    # ----- consume rack tiles used in best.word ------------------------
    used = Counter("" if ch.islower() else ch for ch in best.word)
    rack_counter.subtract(used)
    # clean zeros
    rack_counter += Counter()

    # ----- draw replacements ------------------------------------------
    need = 7 - sum(rack_counter.values())
    print(f"Bot needs {need} new tiles. Tile bag has {len(tile_bag)} tiles.")
    
    # Create a new tile bag for the return value
    new_tile_bag = tile_bag.copy()
    drawn = []
    
    # Randomly draw tiles from the bag
    if need > 0 and new_tile_bag:
        # Draw up to 'need' random tiles or as many as available
        for _ in range(min(need, len(new_tile_bag))):
            if not new_tile_bag:  # Safety check
                break
            random_index = random.randrange(len(new_tile_bag))
            drawn.append(new_tile_bag.pop(random_index))
        
        print(f"Drew {len(drawn)} tiles. New tile bag has {len(new_tile_bag)} tiles.")
    
    # Add drawn tiles to rack counter
    for t in drawn:
        key = "" if not t["letter"] else t["letter"].upper()
        rack_counter[key] += 1

    # ----- rebuild bot rack list (objects with letter/points) ----------
    new_bot_rack = []
    for letter, cnt in rack_counter.items():
        for _ in range(cnt):
            new_bot_rack.append({
                "letter": "" if letter == "" else letter,
                "points": 0 if letter == "" else TILE_POINTS[letter],
            })

    return {
        "move": "play",
        "word": best.word,                     # lower-case chars are blanks
        "row": best.row,
        "col": best.col,
        "direction": "horizontal" if best.direction == "H" else "vertical",
        "score": best.score,
        "newBotRack": new_bot_rack,
        "newTileBag": new_tile_bag,  # Return the updated tile bag
    }