document.addEventListener('DOMContentLoaded', () => {
    const popupContainer = document.getElementById('popup-container');
    const settingsForm = document.getElementById('settings-form');
    const wordLengthSlider = document.getElementById('word-length');
    const wordLengthValue = document.getElementById('word-length-value');
    const judgeWordLengthSlider = document.getElementById('judge-word-length');
    const judgeWordLengthValue = document.getElementById('judge-word-length-value');
    const gameContainer = document.getElementById('game-container');
    const tilesContainer = document.getElementById('tiles-container');
    const anagramCounter = document.getElementById('anagram-counter');
    const wordInput = document.getElementById('word-input');
    const submitWordButton = document.getElementById('submit-word');
    const guessedWordsContainer = document.getElementById('guessed-words-container');

    let testWords = [];
    let allWords = [];
    let currentTestWordIndex = 0;
    let currentAnagrams = [];

    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');
    const slides = document.querySelectorAll('.settings-slide');
    const dots = document.querySelectorAll('.dot');

    const popupContent = document.querySelector('.popup-content');

    function setMaxHeight() {
        let maxHeight = 0;
        slides.forEach(slide => {
            slide.style.display = 'block'; // Temporarily display slide to measure it
            if (slide.offsetHeight > maxHeight) {
                maxHeight = slide.offsetHeight;
            }
            slide.style.display = ''; // Reset display property
        });
        height = maxHeight + 30;
        popupContent.style.height = `${height}px`; // Set max height to the popup content
    }

    setMaxHeight(); // Set the maximum height once at the beginning
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.style.display = 'none'; // Hide all slides
            dots[i].classList.remove('active');
        });
        slides[index].style.display = 'block'; // Show the current slide
        dots[index].classList.add('active');
    }

    prevButton.addEventListener('click', () => {
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : slides.length - 1;
        showSlide(currentSlide);
    });

    nextButton.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    // Initialize the first slide
    showSlide(currentSlide);

    // Show the popup when the page loads
    popupContainer.style.display = 'flex';

    // Update the displayed word length value when the slider is moved
    wordLengthSlider.addEventListener('input', (event) => {
        wordLengthValue.textContent = event.target.value;
    });
    judgeWordLengthSlider.addEventListener('input', (event) => {
        judgeWordLengthValue.textContent = event.target.value;
    });

    // Handle form submission
    settingsForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const messageDiv = document.getElementById('result-message')
        messageDiv.style.display = 'none'

        const settings = {
            dictionary: document.getElementById('dictionary').value,
            wordLength: wordLengthSlider.value,
            includeBlanks: document.getElementById('blanks').checked,
            timeLimit: document.getElementById('time-limit').value ? parseInt(document.getElementById('time-limit').value) : 5
        };

        // Send the settings to the server via AJAX
        fetch('/wordsmith/words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            testWords = data.testWords;
            allWords = data.allWords;
            currentTestWordIndex = 0;
            displayNextTestWord();
        })
        .catch(error => console.error('Error:', error));

        popupContainer.style.display = 'none';
        gameContainer.style.display = 'block';
    });

    const hintButton = document.getElementById('hint-button');
    const passButton = document.getElementById('pass-button');
    
    let hintIndex = 0;

    // Handle hint button click
    hintButton.addEventListener('click', () => {
        if (currentAnagrams.length > 0) {
            const nextAnagram = currentAnagrams[0]; // Get the first valid anagram
            if (hintIndex < nextAnagram.length) {
                wordInput.value = nextAnagram.substring(0, hintIndex + 1);
                hintIndex++;
                updateTypedTiles();
            }
        }
    });

    passButton.addEventListener('click', () => {
        hintIndex = 0; // Reset hint index
        currentTestWordIndex++;
        wordInput.value = '';
        updateTypedTiles();
        displayNextTestWord();
    });

    // Update anagram counter text in the displayNextTestWord function
    function displayNextTestWord() {
        if (currentTestWordIndex >= testWords.length) {
            alert('No more test words.');
            return;
        }

        hintIndex = 0;

        const word = testWords[currentTestWordIndex];
        const sortedLetters = word.split('').sort();
        tilesContainer.innerHTML = '';
        sortedLetters.forEach(letter => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.textContent = letter;
            tilesContainer.appendChild(tile);
        });

        currentAnagrams = allWords.filter(w => w.split('').sort().join('') === sortedLetters.join(''));
        anagramCounter.textContent = `Valid Words: ${currentAnagrams.length}`; // Change text here
        wordInput.value = '';
        guessedWordsContainer.innerHTML = '';

        submitWordButton.disabled = false;
    }

    // Function to handle word submission
    function submitWord() {
        hintIndex = 0;
        const userWord = wordInput.value.trim().toUpperCase();
        const typedTilesContainer = document.getElementById('typed-tiles-container');

        if (currentAnagrams.includes(userWord)) {
            const guessedWordDiv = document.createElement('div');
            guessedWordDiv.classList.add('guessed-word');
            guessedWordDiv.style.display = 'flex'; // Ensure horizontal alignment
            guessedWordDiv.style.justifyContent = 'center'; // Center align the tiles

            userWord.split('').forEach(letter => {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.textContent = letter;
                tile.style.boxShadow = '0 0 10px green';
                guessedWordDiv.appendChild(tile);
            });

            guessedWordsContainer.insertBefore(guessedWordDiv, guessedWordsContainer.firstChild); // Insert at the top

            currentAnagrams = currentAnagrams.filter(w => w !== userWord);
            anagramCounter.textContent = `Valid Words: ${currentAnagrams.length}`;

            wordInput.value = '';
            updateTypedTiles();

            if (currentAnagrams.length === 0) {
                setTimeout(() => {
                    currentTestWordIndex++;
                    displayNextTestWord();
                }, 250);
            }
        } else {
            typedTilesContainer.querySelectorAll('.tile').forEach(tile => {
                tile.style.boxShadow = '0 0 10px red';
            });
            wordInput.value = '';
            setTimeout(() => {
                typedTilesContainer.innerHTML = '';
                updateTypedTiles();
            }, 500);
        }
    }

    // Function to update typed tiles
    function updateTypedTiles() {
        const typedWord = wordInput.value.trim().toUpperCase();
        let typedTilesContainer = document.getElementById('typed-tiles-container');
        if (!typedTilesContainer) {
            typedTilesContainer = document.createElement('div');
            typedTilesContainer.id = 'typed-tiles-container';
            gameContainer.insertBefore(typedTilesContainer, wordInput.nextSibling);
        } else {
            typedTilesContainer.innerHTML = '';
        }
    
        typedWord.split('').forEach(letter => {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.textContent = letter;
            typedTilesContainer.appendChild(tile);
        });
    }    

    submitWordButton.addEventListener('click', submitWord);
    wordInput.addEventListener('input', updateTypedTiles);
    wordInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            submitWord();
        }
    });

    // Function to display words for judgment with Real and Fake buttons below each word
    function displayNextWord(words, index) {
        if (index >= words.length) {
            alert('No more words.');
            return;
        }
        
        const wordData = words[index];
        const wordContainer = document.createElement('div');
        wordContainer.className = 'word-container';
    
        const tilesDiv = document.createElement('div'); // Container for tiles, keeping it horizontal
        tilesDiv.className = 'tiles';
        wordData.word.split('').forEach(char => {
            const charTile = document.createElement('div');
            charTile.className = 'tile';
            charTile.textContent = char;
            tilesDiv.appendChild(charTile);
        });
        wordContainer.appendChild(tilesDiv);
    
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'judge-buttons';
        const realButton = document.createElement('button');
        realButton.className = 'real-button';
        realButton.textContent = 'Real';
        realButton.onclick = () => handleWordVerification(wordData.word, wordData.isReal, true, words, index + 1, displayNextWord);
    
        const fakeButton = document.createElement('button');
        fakeButton.className = 'fake-button';
        fakeButton.textContent = 'Fake';
        fakeButton.onclick = () => handleWordVerification(wordData.word, wordData.isReal, false, words, index + 1, displayNextWord);
    
        buttonsDiv.appendChild(fakeButton);
        buttonsDiv.appendChild(realButton);
        wordContainer.appendChild(buttonsDiv);
    
        tilesContainer.innerHTML = ''; // Clear previous content
        tilesContainer.appendChild(wordContainer);
    }
    
    function handleWordVerification(word, actualIsReal, userSaidReal, words, index, displayNextWordFunc) {
        const result = actualIsReal === userSaidReal;
        const color = result ? '#28a745' : '#dc3545'; // Green for correct, red for incorrect
        displayResultMessage(result);
        highlightWord(color);
    
        setTimeout(() => {
            displayNextWordFunc(words, index);
        }, 500); // Delay to allow the user to see the feedback
    }
    
    function displayResultMessage(isCorrect) {
        const message = isCorrect ? "Correct!" : "Incorrect!";
        const messageDiv = document.getElementById('result-message');
        messageDiv.textContent = message;
        messageDiv.style.color = isCorrect ? '#28a745' : '#dc3545';
        // Clear the message after 1.5 seconds
        setTimeout(() => {
            messageDiv.textContent = '\u00A0\u00A0\u00A0\u00A0\u00A0';
        }, 500);
    }
    
    function highlightWord(color) {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.style.borderColor = color;
            tile.style.boxShadow = `0 0 5px ${color}`;
        });
    }    

    document.getElementById('judge-settings-form').addEventListener('submit', function(event) {
        event.preventDefault();
        document.addEventListener('keydown', handleJudgeKeyPress);

        // Hide elements not used in Judge mode
        document.getElementById('interaction-bar').style.display = 'none';
        document.getElementById('typed-tiles-container').style.display = 'none';
        document.getElementById('guessed-words-container').style.display = 'none';
        
        const settings = {
            dictionary: document.getElementById('judge-dictionary').value,
            wordLength: document.getElementById('judge-word-length').value,
            timeLimit: document.getElementById('judge-time-limit').value ? parseInt(document.getElementById('judge-time-limit').value) : 5
        };

        fetch('/wordsmith/judge_words', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(settings)
        })
        .then(response => response.json())
        .then(data => {
            
            let index = 0; // Initialize the current word index
            displayNextWord(data.testWords, index); // Start displaying words
        })
        .catch(error => console.error('Error:', error));
    
        // Close the settings popup and show the game container
        document.getElementById('popup-container').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
    });    

    function handleJudgeKeyPress(event) {
        // Dynamically select the "Fake" and "Real" buttons every time the key is pressed
        const fakeButton = document.querySelector('.fake-button');
        const realButton = document.querySelector('.real-button');

        if (event.key === 'ArrowLeft' && fakeButton) {
            fakeButton.click(); // Simulate click
            fakeButton.classList.add('active'); // Add 'active' class for visual feedback
            setTimeout(() => fakeButton.classList.remove('active'), 500); // Remove class after 500ms
        } else if (event.key === 'ArrowRight' && realButton) {
            realButton.click(); // Simulate click
            realButton.classList.add('active'); // Add 'active' class for visual feedback
            setTimeout(() => realButton.classList.remove('active'), 500); // Remove class after 500ms
        }
    }
});
