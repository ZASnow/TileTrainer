import sys

def process_file(input_filename):
    try:
        with open(input_filename, 'r') as file:
            lines = file.readlines()

        # Initialize lists to store words and definitions
        words_list = []
        words_dict = {}

        # Process each line
        for line in lines:
            parts = line.split(' ', 1)
            word = parts[0]
            definition = parts[1].strip() if len(parts) > 1 else ''
            words_list.append(word)
            words_dict[word] = definition

        # Write words list to a file
        with open('NWL2023.txt', 'w') as words_file:
            for word in words_list:
                words_file.write(word + '\n')

        # Write words dictionary to a file
        with open('NWL2023_def.txt', 'w') as dict_file:
            for word, definition in words_dict.items():
                dict_file.write(f'{word}: {definition}\n')

        print("Processing complete. Check NWL2023.txt and NWL2023_def.txt for output.")

    except FileNotFoundError:
        print(f"Error: The file '{input_filename}' was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python process_words.py <input_filename>")
    else:
        input_filename = sys.argv[1]
        process_file(input_filename)
