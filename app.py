from flask import Flask, render_template, request, jsonify
from game_logic import (load_word_list, make_bot_move)
import random
import json
import os

app = Flask(__name__)

# Load word lists
def load_word_list(filename):
    with open(filename, 'r') as file:
        return set(line.strip().upper() for line in file)

csw21_words = load_word_list('static/data/CSW21.txt')
nwl2023_words = load_word_list('static/data/NWL2023.txt')

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/about')
def about():
    """Render the about page for the Scrabble Training Hub website."""
    return render_template('about.html', title='About Scrabble Training Hub')

@app.route('/word_checker')
def word_checker():
    return render_template('word_checker.html')

@app.route('/board')
def board():
    return render_template('board.html')

@app.route('/hook_trainer')
def hook_trainer():
    """Render the Hook Trainer page."""
    return render_template('hook_trainer.html')

@app.route('/hook_trainer/get_hooks')
def get_hooks():
    """Fetch hook data based on query parameters."""
    try:
        # Get query parameters
        dictionary = request.args.get('dictionary', 'nwl2023')
        word_length = int(request.args.get('word_length', 3))
        hook_type = request.args.get('hook_type', 'both')
        min_hooks = int(request.args.get('min_hooks', 1))
        include_no_hooks = request.args.get('include_no_hooks', 'false').lower() == 'true'
        
        # Load the appropriate hook data file
        filename = f"static/data/{dictionary.upper()}_hooks.json"
        with open(filename, 'r') as file:
            hooks_data = json.load(file)
        
        # Filter words based on criteria
        filtered_words = []
        for word, hooks in hooks_data.items():
            # Skip words that don't match the requested length
            if len(word) != word_length:
                continue
                
            front_hooks = hooks.get('front', [])
            back_hooks = hooks.get('back', [])
            total_hooks = len(front_hooks) + len(back_hooks)
            
            # Handle words with no hooks if include_no_hooks is enabled
            if total_hooks == 0 and include_no_hooks and min_hooks == 0:
                filtered_words.append({
                    'word': word,
                    'front_hooks': [],
                    'back_hooks': []
                })
                continue
                
            # Skip words with fewer total hooks than required
            if total_hooks < min_hooks:
                continue
            
            # Apply hook type filter
            if hook_type == 'both':
                filtered_words.append({
                    'word': word,
                    'front_hooks': front_hooks,
                    'back_hooks': back_hooks
                })
            elif hook_type == 'front' and len(front_hooks) >= min_hooks:
                filtered_words.append({
                    'word': word,
                    'front_hooks': front_hooks,
                    'back_hooks': back_hooks
                })
            elif hook_type == 'back' and len(back_hooks) >= min_hooks:
                filtered_words.append({
                    'word': word,
                    'front_hooks': front_hooks,
                    'back_hooks': back_hooks
                })
        
        # If no words found, try various fallback options
        if not filtered_words:
            print(f"No words found with initial criteria. Using fallbacks.")
            
            # Try with looser criteria 
            for word, hooks in hooks_data.items():
                if len(word) == word_length:
                    front_hooks = hooks.get('front', [])
                    back_hooks = hooks.get('back', [])
                    
                    # Add words with any hooks (or no hooks if that option is enabled)
                    if front_hooks or back_hooks or include_no_hooks:
                        filtered_words.append({
                            'word': word,
                            'front_hooks': front_hooks,
                            'back_hooks': back_hooks
                        })
                    
                    # Limit to 100 words to avoid overwhelming the UI
                    if len(filtered_words) >= 100:
                        break
            
            # If still no words, just grab any words of the right length
            if not filtered_words:
                word_counter = 0
                for word, hooks in hooks_data.items():
                    if len(word) == word_length:
                        filtered_words.append({
                            'word': word,
                            'front_hooks': hooks.get('front', []),
                            'back_hooks': hooks.get('back', [])
                        })
                        
                        word_counter += 1
                        if word_counter >= 50:
                            break
        
        # Sort words alphabetically
        filtered_words.sort(key=lambda x: x['word'])
        
        print(f"Returning {len(filtered_words)} words for Hook Trainer")
        
        return jsonify({
            'words': filtered_words,
            'count': len(filtered_words)
        })
        
    except Exception as e:
        print(f"Error fetching hook data: {e}")
        return jsonify({
            'error': str(e),
            'words': [],
            'count': 0
        }), 500
        
@app.route('/wordsmith')
def wordsmith():
    return render_template('wordsmith.html')

@app.route('/wordsmith/words', methods=['POST'])
def get_words():
    try:
        data = request.get_json()
        dictionary = data.get('dictionary')
        word_length = int(data.get('wordLength'))
        include_blanks = data.get('includeBlanks', False)
        time_limit = int(data.get('timeLimit', 5))  # Provide a default value if not set

        word_list = nwl2023_words if dictionary == 'nwl2023' else csw21_words
        filtered_words = [word for word in word_list if len(word) == word_length]

        num_test_words = time_limit * 120 if time_limit > 0 else 120  # Example calculation
        test_words = random.sample(filtered_words, min(num_test_words, len(filtered_words)))
        
        return jsonify({'testWords': test_words, 'allWords': filtered_words})
    except Exception as e:
        # Log the error to the console or a file
        print(f"Error processing request: {e}")
        # Return a JSON error message
        return jsonify({'error': str(e)}), 500

def alter_word(word, all_words):
    vowels = 'AEIOU'
    consonants = ''.join(set('ABCDEFGHIJKLMNOPQRSTUVWXYZ') - set(vowels))
    char_list = vowels if random.choice([True, False]) else consonants

    attempts = list(word)
    random.shuffle(attempts)  # Shuffle to randomize the alteration attempts
    for char in attempts:
        if char.upper() in char_list:
            original_char = char
            new_chars = char_list.replace(original_char, '')
            for new_char in new_chars:
                altered_word = word.replace(original_char, new_char, 1)
                if altered_word not in all_words:
                    return (altered_word, True)  # Successfully created a fake word
    return (word, False)  # Failed to alter the word to be fake

@app.route('/wordsmith/judge_words', methods=['POST'])
def get_judge_words():
    try:
        data = request.get_json()
        dictionary = data['dictionary']
        word_length = int(data['wordLength'])
        include_blanks = data.get('includeBlanks', False)
        time_limit = int(data.get('timeLimit', 5))

        word_list = nwl2023_words if dictionary == 'nwl2023' else csw21_words
        filtered_words = [word for word in word_list if len(word) == word_length]

        num_words = min(len(filtered_words), time_limit * 120)
        selected_words = random.sample(filtered_words, num_words)

        judge_words = []
        for word in selected_words:
            is_real = random.choice([True, False])
            if not is_real:
                altered_word, was_altered = alter_word(word, filtered_words)
                is_real = not was_altered  # Update is_real based on whether the word was successfully altered
                word = altered_word
            judge_words.append({'word': word, 'isReal': is_real})

        return jsonify({'testWords': judge_words})
    except Exception as e:
        print(f"Error processing request: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/check_word', methods=['POST'])
def check_word():
    data = request.get_json()
    word = data.get('word', '').upper()
    
    in_csw21 = word in csw21_words
    in_nwl2023 = word in nwl2023_words
    
    if in_csw21 and in_nwl2023:
        validity = "valid in both NWL and Collins"
    elif in_csw21:
        validity = "valid in Collins but not NWL"
    elif in_nwl2023:
        validity = "valid in NWL but not Collins"
    else:
        validity = "not valid in NWL or Collins"

    return jsonify({'in_nwl': in_nwl2023,
                    'in_collins': in_csw21,
                    'validity': validity})
    
@app.route('/anagram_solver')
def anagram_solver():
    return render_template('anagram_solver.html')

@app.route('/solve_anagram', methods=['POST'])
def solve_anagram():
    data = request.get_json()
    letters = data.get('letters', '').upper()
    dictionary_choice = data.get('dictionary', 'both')
    
    # Process blank tiles (represented by '?')
    letter_counter = {}
    blank_count = 0
    
    for letter in letters:
        if letter == '?':
            blank_count += 1
        elif letter.isalpha():
            letter_counter[letter] = letter_counter.get(letter, 0) + 1
    
    # Determine which dictionary to use
    if dictionary_choice == 'nwl':
        word_list = nwl2023_words
    elif dictionary_choice == 'collins':
        word_list = csw21_words
    else:  # 'both'
        word_list = nwl2023_words.union(csw21_words)
    
    # Find anagrams
    possible_words = []
    
    for word in word_list:
        # Check if the word can be formed with the given letters
        word_counter = {}
        for letter in word:
            word_counter[letter] = word_counter.get(letter, 0) + 1
        
        # Check if we can form this word
        can_form = True
        blanks_needed = 0
        
        for letter, count in word_counter.items():
            available = letter_counter.get(letter, 0)
            if available < count:
                blanks_needed += (count - available)
                if blanks_needed > blank_count:
                    can_form = False
                    break
        
        if can_form:
            # Determine which dictionary the word is in
            in_nwl = word in nwl2023_words
            in_collins = word in csw21_words
            
            possible_words.append({
                'word': word,
                'in_nwl': in_nwl,
                'in_collins': in_collins,
                'length': len(word)
            })
    
    # Sort results - first by length (descending), then alphabetically
    possible_words.sort(key=lambda x: (-x['length'], x['word']))
    
    return jsonify({'words': possible_words})

@app.route('/bingo_practice')
def bingo_practice():
    return render_template('bingo_practice.html')

@app.route('/bingo_practice/check_bingos', methods=['POST'])
def check_bingos():
    data = request.get_json()
    rack = data.get('rack', '').upper()
    dictionary_choice = data.get('dictionary', 'nwl')
    
    # Convert rack to a list of letters
    rack_letters = list(rack)
    
    # Determine which dictionary to use
    if dictionary_choice == 'nwl':
        word_list = nwl2023_words
    elif dictionary_choice == 'collins':
        word_list = csw21_words
    else:  # 'both'
        word_list = nwl2023_words.union(csw21_words)
    
    # Find all possible 7-letter words that can be formed with the rack
    bingos = find_possible_bingos(rack_letters, word_list)
    
    return jsonify({'bingos': bingos})

@app.route('/bingo_practice/check_extension_bingos', methods=['POST'])
def check_extension_bingos():
    data = request.get_json()
    rack = data.get('rack', '').upper()
    target_length = int(data.get('targetLength', 8))
    dictionary_choice = data.get('dictionary', 'nwl')
    
    # Convert rack to a list of letters
    rack_letters = list(rack)
    
    # Determine which dictionary to use
    if dictionary_choice == 'nwl':
        word_list = nwl2023_words
    elif dictionary_choice == 'collins':
        word_list = csw21_words
    else:  # 'both'
        word_list = nwl2023_words.union(csw21_words)
    
    # Filter the word list to only include words of the target length
    target_words = [word for word in word_list if len(word) == target_length]
    
    # Find words that can be formed by adding one letter to the rack
    bingos = find_extension_bingos(rack_letters, target_words)
    
    return jsonify({'bingos': bingos})

def find_possible_bingos(rack, word_list):
    """
    Find all 7-letter words that can be formed with the given rack.
    
    Args:
        rack: List of letters in the rack
        word_list: Set of valid words
    
    Returns:
        List of valid 7-letter words that can be formed
    """
    # Handle blank tiles (represented by '?')
    has_blank = False
    rack_without_blanks = []
    
    for letter in rack:
        if letter == '?':
            has_blank = True
        else:
            rack_without_blanks.append(letter)
    
    # Convert rack to a Counter for letter counting
    from collections import Counter
    rack_counter = Counter(rack_without_blanks)
    
    # Find all possible 7-letter words
    bingos = []
    
    for word in word_list:
        if len(word) == 7:
            word_counter = Counter(word)
            
            # Check if word can be formed with the rack
            can_form = True
            blanks_needed = 0
            
            for letter, count in word_counter.items():
                available = rack_counter.get(letter, 0)
                if available < count:
                    blanks_needed += (count - available)
                    if (has_blank and blanks_needed > 1) or (not has_blank and blanks_needed > 0):
                        can_form = False
                        break
            
            if can_form:
                bingos.append(word)
    
    return bingos

def find_extension_bingos(rack, target_words):
    """
    Find all words of the target length that can be formed by adding one letter to the rack.
    
    Args:
        rack: List of letters in the rack
        target_words: List of words of the target length
    
    Returns:
        List of valid words that can be formed by adding one letter
    """
    from collections import Counter
    rack_counter = Counter(rack)
    
    # Find words that can be formed by adding one letter
    bingos = []
    
    for word in target_words:
        word_counter = Counter(word)
        
        # Calculate how many extra letters are needed
        extra_letters_needed = 0
        for letter, count in word_counter.items():
            if count > rack_counter.get(letter, 0):
                extra_letters_needed += count - rack_counter.get(letter, 0)
        
        # If we only need to add one letter, this is a valid extension bingo
        if extra_letters_needed == 1:
            bingos.append(word)
    
    return bingos

@app.route('/get_move', methods=['POST'])
def get_move():
    data = request.get_json()
    board_state = data['board']
    player_rack = data['playerRack']
    bot_rack = data['botRack']
    tile_bag = data['tileBag']

    print("Received request for bot move:")
    print(f"Board state: \n{board_state[:]}...")  # Print just the beginning for brevity
    print(f"Bot rack: {bot_rack}")
    print(f"Tile bag length: {len(tile_bag)}")

    try:
        # Process the move using game logic
        bot_move_result = make_bot_move(board_state, player_rack, bot_rack, tile_bag)
        
        # Check the type of move
        if bot_move_result.get('move') == 'play':
            return jsonify({
                "message": f"Bot played {bot_move_result['word']} for {bot_move_result['score']} points",
                "moveType": "play",
                "word": bot_move_result['word'],
                "row": bot_move_result['row'],
                "col": bot_move_result['col'],
                "direction": bot_move_result['direction'],
                "score": bot_move_result['score'],
                "newBotRack": bot_move_result['newBotRack'],
                "newTileBag": bot_move_result['newTileBag']
            })
        elif bot_move_result.get('move') == 'exchange':
            return jsonify({
                "message": "Bot exchanged tiles",
                "moveType": "exchange",
                "exchanged": bot_move_result['exchanged'],
                "newBotRack": bot_move_result['newBotRack'],
                "newTileBag": bot_move_result['newTileBag']
            })
        else:  # Pass
            return jsonify({
                "message": "Bot passed their turn",
                "moveType": "pass",
                "newBotRack": bot_move_result['newBotRack'],
                "newTileBag": bot_move_result['newTileBag']
            })
            
    except Exception as e:
        print(f"Error processing bot move: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "message": f"Error: {str(e)}",
            "error": True
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5200)
