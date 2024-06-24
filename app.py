from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

# Load word lists
def load_word_list(filename):
    with open(filename, 'r') as file:
        return set(line.strip().upper() for line in file)

csw21_words = load_word_list('static/data/CSW21.txt')
nwl2023_words = load_word_list('static/data/NWL2023.txt')

# Tile distribution and initialization
tile_distribution = {
    'A': 9, 'B': 2, 'C': 2, 'D': 4, 'E': 12, 'F': 2, 'G': 3, 'H': 2,
    'I': 9, 'J': 1, 'K': 1, 'L': 4, 'M': 2, 'N': 6, 'O': 8, 'P': 2,
    'Q': 1, 'R': 6, 'S': 4, 'T': 6, 'U': 4, 'V': 2, 'W': 2, 'X': 1,
    'Y': 2, 'Z': 1, '': 2  # Blanks
}

def create_tile_bag(tile_distribution):
    tile_bag = []
    for letter, count in tile_distribution.items():
        tile_bag.extend([letter] * count)
    return tile_bag

tile_bag = create_tile_bag(tile_distribution)

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/word_checker')
def word_checker():
    return render_template('word_checker.html')

@app.route('/board')
def board():
    return render_template('board.html')

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

    return jsonify({'validity': validity})

if __name__ == '__main__':
    app.run(debug=True, port=5200)
