from flask import Flask, render_template, request, jsonify

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
