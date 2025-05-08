"""Recursive move generator (LeftPart + ExtendRight) – *simplified*.

Only the happy‑path first version: no blanks, no scoring, no cross‑word
validation yet.  It yields moves that are *legal wrt anchors & rack*.
Polish and scoring come later.
"""
from __future__ import annotations

from typing import List, Tuple
from collections import Counter
from .board import Board, H, V, TW, DW, TL, DL, TILE_POINTS
from .dawg import Dawg


class Move:
    __slots__ = ("word", "row", "col", "direction", "score", "tiles")

    def __init__(self, word: str, row: int, col: int, direction: str, score: int, tiles: List[str]):
        self.word = word
        self.row = row
        self.col = col
        self.direction = direction
        self.score = score
        self.tiles = tiles  # letters newly placed (no coords yet)

    def __repr__(self):
        return f"<Move {self.word} @({self.row},{self.col}) {self.direction} s={self.score}>"


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------

def find_all_moves(board: Board, rack: Counter, dawg: Dawg) -> List[Move]:
    """Return *all* moves legal with current rack.  Currently: *first cut*"""
    moves: List[Move] = []
    cross_checks = board.cross_checks(dawg)
    
    # Debug
    print(f"Finding moves with rack: {rack}")
    
    for (r, c) in board.anchors():
        # Debug
        print(f"Checking anchor at ({r}, {c})")
        
        # simple: require empty square to left if we want left‑part from rack
        if c > 0 and board.grid[r][c - 1] == ".":
            _gen_left_parts(
                board, rack, dawg, r, c, [], dawg._root, min(c, 7), moves, cross_checks, H
            )
        # vertical symmetric case (row above empty)
        if r > 0 and board.grid[r - 1][c] == ".":
            _gen_left_parts(
                board, rack, dawg, r, c, [], dawg._root, min(r, 7), moves, cross_checks, V
            )
    
    # Filter out invalid words with an additional explicit dictionary check
    valid_moves = []
    invalid_words = []
    
    for move in moves:
        # Convert lowercase (blank) letters to uppercase for dictionary check
        word_to_check = move.word.upper()
        if dawg.is_word(word_to_check):
            valid_moves.append(move)
        else:
            invalid_words.append(move.word)
    
    if invalid_words:
        print(f"Filtered out {len(invalid_words)} invalid words: {invalid_words[:10]}")
    
    valid_moves.sort(key=lambda m: m.score, reverse=True)
    return valid_moves


# ---------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------

def _score_move(board: Board, r0: int, c0: int, direction: str, word: str) -> int:
    """
    Classic Scrabble scoring:
      • lower-case letters in *word* are blanks (0 pts)
      • premiums apply **only** to newly-placed tiles (squares currently ".")
      • bingo = +50 for 7 fresh tiles
    """
    main_pts, main_mult = 0, 1
    new_tile_count = 0
    SIZE = 15

    def letter_points(ch: str) -> int:
        # Safety check - don't try to score empty cells
        if ch == ".":
            return 0
        return 0 if ch.islower() else TILE_POINTS[ch]

    # Track positions where we'll place new tiles
    new_positions = []
    for idx, ch in enumerate(word):
        r = r0 + (idx if direction == V else 0)
        c = c0 + (idx if direction == H else 0)
        if board.grid[r][c] == ".":  # This is a new tile
            new_positions.append((r, c, ch))
            new_tile_count += 1
    
    # Score the main word by checking each position
    for idx, ch in enumerate(word):
        r = r0 + (idx if direction == V else 0)
        c = c0 + (idx if direction == H else 0)
        
        # Get the letter value
        lp = letter_points(ch)
        lmult = 1
        wmult = 1
        
        # Apply bonuses only to new tiles (if the current grid cell is empty)
        if board.grid[r][c] == ".":
            if (r, c) in DL:
                lmult = 2
            elif (r, c) in TL:
                lmult = 3
            if (r, c) in DW:
                wmult = 2
            elif (r, c) in TW:
                wmult = 3
                
        main_pts += lp * lmult
        main_mult *= wmult
    
    # Calculate cross-word scores
    cross_words_pts = 0
    
    # For each new tile, check if it forms a cross-word
    for r, c, ch in new_positions:
        cross_word = None
        
        # Get the cross-word depending on the direction of the main word
        if direction == H:  # Main word is horizontal, check vertical cross-words
            # Look up
            top = ""
            rr = r - 1
            while rr >= 0 and board.grid[rr][c] != ".":
                top = board.grid[rr][c] + top
                rr -= 1
            
            # Look down
            bottom = ""
            rr = r + 1
            while rr < SIZE and board.grid[rr][c] != ".":
                bottom += board.grid[rr][c]
                rr += 1
            
            # Only count as a cross-word if there's something above or below
            if top or bottom:
                cross_word = top + ch.upper() + bottom
        
        else:  # Main word is vertical, check horizontal cross-words
            # Look left
            left = ""
            cc = c - 1
            while cc >= 0 and board.grid[r][cc] != ".":
                left = board.grid[r][cc] + left
                cc -= 1
            
            # Look right
            right = ""
            cc = c + 1
            while cc < SIZE and board.grid[r][cc] != ".":
                right += board.grid[r][cc]
                cc += 1
            
            # Only count as a cross-word if there's something to the left or right
            if left or right:
                cross_word = left + ch.upper() + right
        
        # If we found a cross-word with at least 2 letters, score it
        if cross_word and len(cross_word) > 1:
            # Calculate points for this cross-word
            cross_pts = 0
            cross_mult = 1
            
            # For the newly placed letter, apply premium squares
            letter_value = letter_points(ch)
            letter_mult = 1
            word_mult = 1
            
            if (r, c) in DL:
                letter_mult = 2
            elif (r, c) in TL:
                letter_mult = 3
            
            if (r, c) in DW:
                word_mult = 2
            elif (r, c) in TW:
                word_mult = 3
            
            # Add the value of the played letter with any multipliers
            cross_pts += letter_value * letter_mult
            
            # Now add points for existing tiles in the cross-word
            # For a horizontal cross-word (from vertical main word)
            if direction == V:
                # Score letters to the left
                cc = c - 1
                while cc >= 0 and board.grid[r][cc] != ".":
                    cross_pts += letter_points(board.grid[r][cc])
                    cc -= 1
                
                # Score letters to the right
                cc = c + 1
                while cc < SIZE and board.grid[r][cc] != ".":
                    cross_pts += letter_points(board.grid[r][cc])
                    cc += 1
            
            # For a vertical cross-word (from horizontal main word)
            else:
                # Score letters above
                rr = r - 1
                while rr >= 0 and board.grid[rr][c] != ".":
                    cross_pts += letter_points(board.grid[rr][c])
                    rr -= 1
                
                # Score letters below
                rr = r + 1
                while rr < SIZE and board.grid[rr][c] != ".":
                    cross_pts += letter_points(board.grid[rr][c])
                    rr += 1
            
            # Apply the word multiplier to the entire cross-word
            cross_words_pts += cross_pts * word_mult
    
    # Final score calculation
    total = main_pts * main_mult + cross_words_pts
    
    # Bingo bonus for using all 7 tiles
    if new_tile_count == 7:
        total += 50
    
    return total

def _get_full_word(board, r0, c0, direction, placed_word):
    """Find the full word including existing tiles it connects to."""
    SIZE = 15
    
    # First place the new tiles temporarily on a copy of the board
    from copy import deepcopy
    temp_board = deepcopy(board)
    
    for idx, ch in enumerate(placed_word):
        r = r0 + (idx if direction == V else 0)
        c = c0 + (idx if direction == H else 0)
        if temp_board.grid[r][c] == ".":
            temp_board.grid[r][c] = ch.upper()
    
    # Then get the full word
    if direction == "H":
        # Find the start of the word
        start_c = c0
        while start_c > 0 and temp_board.grid[r0][start_c-1] != ".":
            start_c -= 1
        
        # Build the word from left to right
        word = ""
        cc = start_c
        while cc < SIZE and temp_board.grid[r0][cc] != ".":
            word += temp_board.grid[r0][cc]
            cc += 1
        
        return word, r0, start_c
    
    else:  # direction == "V"
        # Find the start of the word
        start_r = r0
        while start_r > 0 and temp_board.grid[start_r-1][c0] != ".":
            start_r -= 1
        
        # Build the word from top to bottom
        word = ""
        rr = start_r
        while rr < SIZE and temp_board.grid[rr][c0] != ".":
            word += temp_board.grid[rr][c0]
            rr += 1
        
        return word, start_r, c0

def _get_cross_word(board, r, c, main_direction):
    """
    Get the cross-word at a given position.
    Returns (word, start_row, start_col) or None if no cross-word.
    """
    SIZE = 15
    cross_direction = "V" if main_direction == "H" else "H"
    
    if cross_direction == "V":
        # Look up
        top = ""
        rr = r - 1
        while rr >= 0 and board.grid[rr][c] != ".":
            top = board.grid[rr][c] + top
            rr -= 1
        
        # Look down
        bottom = ""
        rr = r + 1
        while rr < SIZE and board.grid[rr][c] != ".":
            bottom += board.grid[rr][c]
            rr += 1
        
        # If there's a vertical cross-word
        if top or bottom:
            start_r = r - len(top)
            return (top + board.grid[r][c] + bottom, start_r, c)
    
    else:  # cross_direction == "H"
        # Look left
        left = ""
        cc = c - 1
        while cc >= 0 and board.grid[r][cc] != ".":
            left = board.grid[r][cc] + left
            cc -= 1
        
        # Look right
        right = ""
        cc = c + 1
        while cc < SIZE and board.grid[r][cc] != ".":
            right += board.grid[r][cc]
            cc += 1
        
        # If there's a horizontal cross-word
        if left or right:
            start_c = c - len(left)
            return (left + board.grid[r][c] + right, r, start_c)
    
    return None

def _gen_left_parts(
    board: Board,
    rack: Counter,
    dawg: Dawg,
    anchor_r: int,
    anchor_c: int,
    left_seq: List[str],
    node,
    limit: int,
    moves: List[Move],
    cross_checks,
    direction: str,
):
    """Recursive generation of left parts of length ≤ limit."""
    from copy import deepcopy

    # Once we have a left part, try to extend rightwards
    _extend_right(
        board,
        deepcopy(rack),
        dawg,
        anchor_r,
        anchor_c,
        "".join(reversed(left_seq)),  # reversed because built right‑to‑left
        node,
        moves,
        cross_checks,
        direction,
    )

    if limit == 0:
        return

    for ch in list(rack.keys()):
        if rack[ch] == 0:
            continue
        next_node = node.children.get(ch)
        if next_node is None:
            continue
        rack[ch] -= 1
        left_seq.append(ch)
        _gen_left_parts(
            board,
            rack,
            dawg,
            anchor_r,
            anchor_c,
            left_seq,
            next_node,
            limit - 1,
            moves,
            cross_checks,
            direction,
        )
        left_seq.pop()
        rack[ch] += 1

def _extend_right(
    board: Board,
    rack: Counter,
    dawg: Dawg,
    row: int,
    col: int,
    prefix: str,
    node,
    moves: List[Move],
    cross_checks,
    direction: str,
):
    """Extend a partial word to the board edge, now supporting blank tiles."""
    SIZE = 15
    r, c = row, col

    # ------------------------------------------------------------------ HORIZONTAL
    if direction == H:
        square = board.grid[r][c]

        # ─── Empty square ──────────────────────────────────────────────
        if square == ".":
            target_set = cross_checks[(r, c)][H]

            # 1) normal letters in rack
            for ch in [k for k in rack if k]:
                if rack[ch] == 0 or ch not in target_set:
                    continue
                nxt = node.children.get(ch)
                if nxt is None:
                    continue
                rack[ch] -= 1
                new_prefix = prefix + ch
                if nxt.terminal:
                    # Additional dictionary check to ensure valid word
                    if dawg.is_word(new_prefix.upper()):
                        score = _score_move(board, row, col - len(prefix), H, new_prefix)
                        moves.append(
                            Move(new_prefix, row, col - len(prefix), H, score, list(new_prefix))
                        )
                if c + 1 < SIZE:
                    _extend_right(
                        board, rack, dawg, r, c + 1, new_prefix,
                        nxt, moves, cross_checks, direction
                    )
                rack[ch] += 1

            # 2) blank tiles ("" key in rack Counter)
            if rack.get("", 0):
                for letter in target_set:
                    nxt = node.children.get(letter)
                    if nxt is None:
                        continue
                    rack[""] -= 1
                    new_prefix = prefix + letter.lower()      # lower-case marks blank
                    if nxt.terminal:
                        # Additional dictionary check to ensure valid word
                        if dawg.is_word(new_prefix.upper()):
                            score = _score_move(board, row, col - len(prefix), H, new_prefix)
                            moves.append(
                                Move(new_prefix, row, col - len(prefix), H, score, list(new_prefix))
                            )
                    if c + 1 < SIZE:
                        _extend_right(
                            board, rack, dawg, r, c + 1, new_prefix,
                            nxt, moves, cross_checks, direction
                        )
                    rack[""] += 1

        # ─── Pre-existing board tile ───────────────────────────────────
        else:
            nxt = node.children.get(square)
            if nxt is None:
                return
            new_prefix = prefix + square
            if nxt.terminal:
                # Additional dictionary check to ensure valid word
                if dawg.is_word(new_prefix.upper()):
                    score = _score_move(board, row, col - len(prefix), H, new_prefix)
                    moves.append(Move(new_prefix, row, col - len(prefix), H, score, []))
            if c + 1 < SIZE:
                _extend_right(
                    board, rack, dawg, r, c + 1, new_prefix,
                    nxt, moves, cross_checks, direction
                )

    # ------------------------------------------------------------------ VERTICAL (mirror of above)
    else:  # direction == V
        square = board.grid[r][c]

        if square == ".":
            target_set = cross_checks[(r, c)][V]

            for ch in [k for k in rack if k]:
                if rack[ch] == 0 or ch not in target_set:
                    continue
                nxt = node.children.get(ch)
                if nxt is None:
                    continue
                rack[ch] -= 1
                new_prefix = prefix + ch
                if nxt.terminal:
                    # Additional dictionary check to ensure valid word
                    if dawg.is_word(new_prefix.upper()):
                        score = _score_move(board, row - len(prefix), col, V, new_prefix)
                        moves.append(
                            Move(new_prefix, row - len(prefix), col, V, score, list(new_prefix))
                        )
                if r + 1 < SIZE:
                    _extend_right(
                        board, rack, dawg, r + 1, c, new_prefix,
                        nxt, moves, cross_checks, direction
                    )
                rack[ch] += 1

            if rack.get("", 0):
                for letter in target_set:
                    nxt = node.children.get(letter)
                    if nxt is None:
                        continue
                    rack[""] -= 1
                    new_prefix = prefix + letter.lower()
                    if nxt.terminal:
                        # Additional dictionary check to ensure valid word
                        if dawg.is_word(new_prefix.upper()):
                            score = _score_move(board, row - len(prefix), col, V, new_prefix)
                            moves.append(
                                Move(new_prefix, row - len(prefix), col, V, score, list(new_prefix))
                            )
                    if r + 1 < SIZE:
                        _extend_right(
                            board, rack, dawg, r + 1, c, new_prefix,
                            nxt, moves, cross_checks, direction
                        )
                    rack[""] += 1
        else:
            nxt = node.children.get(square)
            if nxt is None:
                return
            new_prefix = prefix + square
            if nxt.terminal:
                # Additional dictionary check to ensure valid word
                if dawg.is_word(new_prefix.upper()):
                    score = _score_move(board, row - len(prefix), col, V, new_prefix)
                    moves.append(Move(new_prefix, row - len(prefix), col, V, score, []))
            if r + 1 < SIZE:
                _extend_right(
                    board, rack, dawg, r + 1, c, new_prefix,
                    nxt, moves, cross_checks, direction
                )