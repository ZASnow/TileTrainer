document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const popupContainer = document.getElementById('popup-container');
    const trainerContainer = document.getElementById('trainer-container');
    const modeDisplay = document.getElementById('mode-display');
    const wordDisplay = document.getElementById('word-display');
    const frontHooksContent = document.getElementById('front-hooks-content');
    const backHooksContent = document.getElementById('back-hooks-content');
    const quizInputContainer = document.getElementById('quiz-input-container');
    const hookInput = document.getElementById('hook-input');
    const submitHookButton = document.getElementById('submit-hook');
    const prevButton = document.getElementById('prev-button');
    const flipButton = document.getElementById('flip-button');
    const nextButton = document.getElementById('next-button');
    const studyListContainer = document.getElementById('study-list-container');
    const studyList = document.getElementById('study-list');
    const menuButton = document.getElementById('menu-button');
    const timerElement = document.getElementById('timer');
    const timeValueElement = document.getElementById('time-value');
    const scoreElement = document.getElementById('score');
    const scoreValueElement = document.getElementById('score-value');
    const navigationControls = document.getElementById('navigation-controls');
    const resultMessage = document.getElementById('result-message');
    const hookPositionRadios = document.querySelectorAll('input[name="hook-position"]');

    // Carousel Navigation
    const prevButton_carousel = document.querySelector('.prev');
    const nextButton_carousel = document.querySelector('.next');
    const slides = document.querySelectorAll('.settings-slide');
    const dots = document.querySelectorAll('.dot');

    // State Variables
    let currentSlide = 0;
    let currentMode = '';
    let hookWords = [];
    let currentWordIndex = 0;
    let hooksRevealed = false;
    let timer = null;
    let timeRemaining = 0;
    let score = 0;
    let foundHooks = { front: new Set(), back: new Set() };

    // Initialize slider value displays
    document.getElementById('flashcard-word-length').addEventListener('input', (event) => {
        document.getElementById('flashcard-word-length-value').textContent = event.target.value;
    });
    document.getElementById('flashcard-min-hooks').addEventListener('input', (event) => {
        document.getElementById('flashcard-min-hooks-value').textContent = event.target.value;
    });
    document.getElementById('quiz-word-length').addEventListener('input', (event) => {
        document.getElementById('quiz-word-length-value').textContent = event.target.value;
    });
    document.getElementById('quiz-min-hooks').addEventListener('input', (event) => {
        document.getElementById('quiz-min-hooks-value').textContent = event.target.value;
    });
    document.getElementById('study-word-length').addEventListener('input', (event) => {
        document.getElementById('study-word-length-value').textContent = event.target.value;
    });
    document.getElementById('study-min-hooks').addEventListener('input', (event) => {
        document.getElementById('study-min-hooks-value').textContent = event.target.value;
    });

    // Carousel Functions
    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.style.display = 'none'; // Hide all slides
            dots[i].classList.remove('active');
        });
        slides[index].style.display = 'block'; // Show the current slide
        dots[index].classList.add('active');
    }

    prevButton_carousel.addEventListener('click', () => {
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : slides.length - 1;
        showSlide(currentSlide);
    });

    nextButton_carousel.addEventListener('click', () => {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    });

    // Initialize the first slide
    showSlide(currentSlide);

    // Make dots clickable
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            currentSlide = index;
            showSlide(currentSlide);
        });
    });

    // Form Submission Handlers
    document.getElementById('flashcard-settings-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            mode: 'flashcard',
            dictionary: document.getElementById('flashcard-dictionary').value,
            wordLength: parseInt(document.getElementById('flashcard-word-length').value),
            hookType: document.getElementById('flashcard-hook-type').value,
            minHooks: parseInt(document.getElementById('flashcard-min-hooks').value),
            includeNoHooks: document.getElementById('flashcard-include-no-hooks').checked
        };
        startTrainer(settings);
    });

    document.getElementById('quiz-settings-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            mode: 'quiz',
            dictionary: document.getElementById('quiz-dictionary').value,
            wordLength: parseInt(document.getElementById('quiz-word-length').value),
            hookType: document.getElementById('quiz-hook-type').value,
            minHooks: parseInt(document.getElementById('quiz-min-hooks').value),
            includeNoHooks: document.getElementById('quiz-include-no-hooks').checked,
            timeLimit: parseInt(document.getElementById('quiz-time-limit').value)
        };
        startTrainer(settings);
    });

    document.getElementById('study-settings-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const settings = {
            mode: 'study',
            dictionary: document.getElementById('study-dictionary').value,
            wordLength: parseInt(document.getElementById('study-word-length').value),
            minHooks: parseInt(document.getElementById('study-min-hooks').value),
            includeNoHooks: document.getElementById('study-include-no-hooks').checked
        };
        startTrainer(settings);
    });

    // Return to Menu Button
    menuButton.addEventListener('click', () => {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        
        // Reset the UI to initial state
        popupContainer.style.display = 'flex';
        trainerContainer.style.display = 'none';
        
        // Reset state variables
        hookWords = [];
        currentWordIndex = 0;
        hooksRevealed = false;
        score = 0;
        foundHooks = { front: new Set(), back: new Set() };
        
        // Reset UI elements
        scoreValueElement.textContent = '0';
        hookInput.value = '';
        resultMessage.innerHTML = '&#160;';
        
        // Hide all mode-specific containers
        quizInputContainer.style.display = 'none';
        studyListContainer.style.display = 'none';
        timerElement.style.display = 'none';
        scoreElement.style.display = 'none';
        navigationControls.style.display = 'flex';
        
        // Reset radio button selection
        if (hookPositionRadios.length > 0) {
            hookPositionRadios[0].checked = true;
        }
    });

    // Start Trainer with given settings
    function startTrainer(settings) {
        currentMode = settings.mode;
        
        // Hide popup and show trainer
        popupContainer.style.display = 'none';
        trainerContainer.style.display = 'block';
        
        // Set mode display
        modeDisplay.textContent = `${capitalize(settings.mode)} Mode - ${settings.dictionary.toUpperCase()}`;
        
        // Clear any previous content
        frontHooksContent.innerHTML = '';
        backHooksContent.innerHTML = '';
        studyList.innerHTML = '';
        resultMessage.innerHTML = '&#160;';
        hookInput.value = '';
        
        // Reset foundHooks
        foundHooks = { front: new Set(), back: new Set() };
        
        // Set up UI based on mode
        if (settings.mode === 'quiz') {
            quizInputContainer.style.display = 'flex';
            studyListContainer.style.display = 'none';
            timerElement.style.display = 'block';
            scoreElement.style.display = 'block';
            navigationControls.style.display = 'flex';
            timeRemaining = settings.timeLimit;
            timeValueElement.textContent = timeRemaining;
            score = 0;
            scoreValueElement.textContent = score;
            flipButton.textContent = 'Check Hooks';
            
            // Reset hook position radio
            if (hookPositionRadios.length > 0) {
                hookPositionRadios[0].checked = true;
            }
        } else if (settings.mode === 'flashcard') {
            quizInputContainer.style.display = 'none';
            studyListContainer.style.display = 'none';
            timerElement.style.display = 'none';
            scoreElement.style.display = 'none';
            navigationControls.style.display = 'flex';
            flipButton.textContent = 'Reveal Hooks';
        } else if (settings.mode === 'study') {
            quizInputContainer.style.display = 'none';
            studyListContainer.style.display = 'block';
            timerElement.style.display = 'none';
            scoreElement.style.display = 'none';
            navigationControls.style.display = 'none';
        }
        
        // Fetch hook data and start the mode
        fetchHookData(settings);
    }

    // Fetch hook data from server
    function fetchHookData(settings) {
        const queryParams = new URLSearchParams({
            dictionary: settings.dictionary,
            word_length: settings.wordLength,
            hook_type: settings.hookType || 'both',
            min_hooks: settings.minHooks,
            include_no_hooks: settings.includeNoHooks ? 'true' : 'false'
        });

        // Show loading indicator
        if (settings.mode === 'study') {
            studyList.innerHTML = '<div class="loading">Loading words...</div>';
        } else {
            wordDisplay.textContent = 'Loading...';
            frontHooksContent.innerHTML = '';
            backHooksContent.innerHTML = '';
        }

        fetch(`/hook_trainer/get_hooks?${queryParams}`)
            .then(response => response.json())
            .then(data => {
                hookWords = data.words;
                console.log(`Loaded ${hookWords.length} words for Hook Trainer`);
                
                if (hookWords.length === 0) {
                    alert('No words found with the current settings. Please try different settings.');
                    menuButton.click();
                    return;
                }
                
                // Make sure hooks arrays exist for each word
                hookWords.forEach(word => {
                    if (!Array.isArray(word.front_hooks)) {
                        word.front_hooks = [];
                    }
                    if (!Array.isArray(word.back_hooks)) {
                        word.back_hooks = [];
                    }
                });
                
                if (settings.mode === 'study') {
                    displayStudyMode();
                } else {
                    shuffleArray(hookWords);
                    currentWordIndex = 0;
                    displayCurrentWord();
                    
                    if (settings.mode === 'quiz') {
                        startQuizTimer(settings.timeLimit);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching hook data:', error);
                alert('Error fetching hook data. Please try again.');
                menuButton.click();
            });
    }

    // Display the current word and its hooks
    function displayCurrentWord() {
        if (currentWordIndex >= hookWords.length) {
            currentWordIndex = 0;
        }
        
        const wordData = hookWords[currentWordIndex];
        wordDisplay.textContent = wordData.word;
        
        // Clear hooks display
        frontHooksContent.innerHTML = '';
        backHooksContent.innerHTML = '';
        
        if (currentMode === 'quiz') {
            // Reset found hooks for the new word
            foundHooks = { front: new Set(), back: new Set() };
            hooksRevealed = false;
            flipButton.textContent = 'Check Hooks';
            
            // Display count of hooks to find
            const frontHooksCount = wordData.front_hooks ? wordData.front_hooks.length : 0;
            const backHooksCount = wordData.back_hooks ? wordData.back_hooks.length : 0;
            
            if (frontHooksCount === 0) {
                frontHooksContent.innerHTML = '<div style="color:#6c757d;font-style:italic;">No front hooks</div>';
            } else {
                frontHooksContent.innerHTML = `<div class="hook-count">${frontHooksCount} hook${frontHooksCount > 1 ? 's' : ''} to find</div>`;
            }
            
            if (backHooksCount === 0) {
                backHooksContent.innerHTML = '<div style="color:#6c757d;font-style:italic;">No back hooks</div>';
            } else {
                backHooksContent.innerHTML = `<div class="hook-count">${backHooksCount} hook${backHooksCount > 1 ? 's' : ''} to find</div>`;
            }
            
            // Disable quiz input if no hooks available
            if (frontHooksCount === 0 && backHooksCount === 0) {
                hookInput.disabled = true;
                submitHookButton.disabled = true;
                displayResultMessage(true, "This word has no hooks");
            } else {
                hookInput.disabled = false;
                submitHookButton.disabled = false;
            }
            
            // Make sure the appropriate radio is enabled/disabled
            hookPositionRadios.forEach(radio => {
                if (radio.value === 'front') {
                    radio.disabled = frontHooksCount === 0;
                    if (frontHooksCount === 0 && radio.checked) {
                        // If front is selected but there are no front hooks, switch to back
                        if (backHooksCount > 0) {
                            hookPositionRadios[1].checked = true;
                        }
                    }
                } else if (radio.value === 'back') {
                    radio.disabled = backHooksCount === 0;
                    if (backHooksCount === 0 && radio.checked) {
                        // If back is selected but there are no back hooks, switch to front
                        if (frontHooksCount > 0) {
                            hookPositionRadios[0].checked = true;
                        }
                    }
                }
            });
            
        } else {
            // For flashcard mode, prepare hooks but keep them hidden
            createHookTiles(wordData.front_hooks, frontHooksContent, !hooksRevealed);
            createHookTiles(wordData.back_hooks, backHooksContent, !hooksRevealed);
            hooksRevealed = false;
            flipButton.textContent = 'Reveal Hooks';
        }
        
        // Clear input field
        hookInput.value = '';
    }

    // Create hook tiles in the specified container
    function createHookTiles(hooks, container, hidden = false) {
        if (!hooks || hooks.length === 0) {
            const noHooksText = document.createElement('div');
            noHooksText.textContent = 'No hooks';
            noHooksText.style.color = '#6c757d';
            noHooksText.style.fontStyle = 'italic';
            container.appendChild(noHooksText);
            return;
        }

        hooks.forEach(hook => {
            const tile = document.createElement('div');
            tile.classList.add('hook-tile');
            
            if (hidden) {
                tile.style.backgroundColor = '#e9ecef';
                tile.style.color = '#e9ecef';
                tile.textContent = '?';
            } else {
                tile.textContent = hook;
            }
            
            container.appendChild(tile);
        });
    }

    // Display Study Mode with all words and hooks
    function displayStudyMode() {
        studyList.innerHTML = '';

        hookWords.forEach(wordData => {
            const studyItem = document.createElement('div');
            studyItem.classList.add('study-item');

            const wordElement = document.createElement('div');
            wordElement.classList.add('study-word');
            wordElement.textContent = wordData.word;
            studyItem.appendChild(wordElement);

            const hooksContainer = document.createElement('div');
            hooksContainer.classList.add('study-hooks');
            
            // Front Hooks Section
            const frontSection = document.createElement('div');
            frontSection.classList.add('study-hook-section');
            
            const frontTitle = document.createElement('div');
            frontTitle.classList.add('study-hook-title');
            frontTitle.textContent = 'Front Hooks';
            frontSection.appendChild(frontTitle);
            
            const frontLetters = document.createElement('div');
            frontLetters.classList.add('study-hook-letters');
            
            if (wordData.front_hooks && wordData.front_hooks.length > 0) {
                wordData.front_hooks.forEach(hook => {
                    const hookSpan = document.createElement('span');
                    hookSpan.classList.add('hook-letter');
                    hookSpan.textContent = hook;
                    frontLetters.appendChild(hookSpan);
                });
            } else {
                const noneSpan = document.createElement('span');
                noneSpan.textContent = 'none';
                noneSpan.style.fontStyle = 'italic';
                noneSpan.style.color = '#6c757d';
                frontLetters.appendChild(noneSpan);
            }
            
            frontSection.appendChild(frontLetters);
            hooksContainer.appendChild(frontSection);
            
            // Back Hooks Section
            const backSection = document.createElement('div');
            backSection.classList.add('study-hook-section');
            
            const backTitle = document.createElement('div');
            backTitle.classList.add('study-hook-title');
            backTitle.textContent = 'Back Hooks';
            backSection.appendChild(backTitle);
            
            const backLetters = document.createElement('div');
            backLetters.classList.add('study-hook-letters');
            
            if (wordData.back_hooks && wordData.back_hooks.length > 0) {
                wordData.back_hooks.forEach(hook => {
                    const hookSpan = document.createElement('span');
                    hookSpan.classList.add('hook-letter');
                    hookSpan.textContent = hook;
                    backLetters.appendChild(hookSpan);
                });
            } else {
                const noneSpan = document.createElement('span');
                noneSpan.textContent = 'none';
                noneSpan.style.fontStyle = 'italic';
                noneSpan.style.color = '#6c757d';
                backLetters.appendChild(noneSpan);
            }
            
            backSection.appendChild(backLetters);
            hooksContainer.appendChild(backSection);
            
            studyItem.appendChild(hooksContainer);
            studyList.appendChild(studyItem);
        });
    }

    // Start the quiz timer
    function startQuizTimer(timeLimit) {
        if (timer) {
            clearInterval(timer);
        }
        
        timeRemaining = timeLimit;
        timeValueElement.textContent = timeRemaining;
        
        timer = setInterval(() => {
            timeRemaining--;
            timeValueElement.textContent = timeRemaining;
            
            if (timeRemaining <= 0) {
                clearInterval(timer);
                timer = null;
                
                // Reveal remaining hooks and move to next word
                revealRemainingHooks();
                setTimeout(() => {
                    currentWordIndex++;
                    displayCurrentWord();
                    startQuizTimer(timeLimit);
                }, 2000);
            }
        }, 1000);
    }

    // Reveal remaining hooks that weren't found
    function revealRemainingHooks() {
        const wordData = hookWords[currentWordIndex];
        
        // Reveal front hooks
        frontHooksContent.innerHTML = '';
        if (wordData.front_hooks && wordData.front_hooks.length > 0) {
            wordData.front_hooks.forEach(hook => {
                const tile = document.createElement('div');
                tile.classList.add('hook-tile');
                tile.textContent = hook;
                
                if (foundHooks.front.has(hook)) {
                    tile.style.boxShadow = '0 0 5px #28a745';
                } else {
                    tile.style.boxShadow = '0 0 5px #dc3545';
                }
                
                frontHooksContent.appendChild(tile);
            });
        } else {
            const noHooksText = document.createElement('div');
            noHooksText.textContent = 'No hooks';
            noHooksText.style.color = '#6c757d';
            noHooksText.style.fontStyle = 'italic';
            frontHooksContent.appendChild(noHooksText);
        }
        
        // Reveal back hooks
        backHooksContent.innerHTML = '';
        if (wordData.back_hooks && wordData.back_hooks.length > 0) {
            wordData.back_hooks.forEach(hook => {
                const tile = document.createElement('div');
                tile.classList.add('hook-tile');
                tile.textContent = hook;
                
                if (foundHooks.back.has(hook)) {
                    tile.style.boxShadow = '0 0 5px #28a745';
                } else {
                    tile.style.boxShadow = '0 0 5px #dc3545';
                }
                
                backHooksContent.appendChild(tile);
            });
        } else {
            const noHooksText = document.createElement('div');
            noHooksText.textContent = 'No hooks';
            noHooksText.style.color = '#6c757d';
            noHooksText.style.fontStyle = 'italic';
            backHooksContent.appendChild(noHooksText);
        }
        
        hooksRevealed = true;
    }

    // Toggle hook visibility in flashcard mode
    function toggleHooks() {
        if (currentMode === 'flashcard') {
            hooksRevealed = !hooksRevealed;
            
            frontHooksContent.innerHTML = '';
            backHooksContent.innerHTML = '';
            
            const wordData = hookWords[currentWordIndex];
            createHookTiles(wordData.front_hooks, frontHooksContent, !hooksRevealed);
            createHookTiles(wordData.back_hooks, backHooksContent, !hooksRevealed);
            
            flipButton.textContent = hooksRevealed ? 'Hide Hooks' : 'Reveal Hooks';
        } else if (currentMode === 'quiz') {
            if (!hooksRevealed) {
                revealRemainingHooks();
                hooksRevealed = true;
                flipButton.textContent = 'Next Word';
            } else {
                // Move to next word if already revealed
                currentWordIndex++;
                displayCurrentWord();
                if (timer) {
                    clearInterval(timer);
                }
                startQuizTimer(parseInt(document.getElementById('quiz-time-limit').value));
            }
        }
    }

    // Submit a hook answer in quiz mode
    function submitHook() {
        if (currentMode !== 'quiz') return;
        
        const input = hookInput.value.trim().toUpperCase();
        if (!input) return;
        
        // Get selected hook position (front or back)
        let hookPosition = 'front';
        hookPositionRadios.forEach(radio => {
            if (radio.checked) {
                hookPosition = radio.value;
            }
        });
        
        const wordData = hookWords[currentWordIndex];
        let isCorrect = false;
        
        // Check if the input is a valid hook for the selected position
        if (hookPosition === 'front' && 
            wordData.front_hooks && 
            wordData.front_hooks.includes(input) && 
            !foundHooks.front.has(input)) {
            
            foundHooks.front.add(input);
            isCorrect = true;
            
            // Add to front hooks display
            const tile = document.createElement('div');
            tile.classList.add('hook-tile');
            tile.textContent = input;
            tile.style.boxShadow = '0 0 5px #28a745';
            frontHooksContent.appendChild(tile);
            
            // Update count display
            const remainingCount = wordData.front_hooks.length - foundHooks.front.size;
            if (remainingCount > 0) {
                const countElem = frontHooksContent.querySelector('.hook-count');
                if (countElem) {
                    countElem.textContent = `${remainingCount} hook${remainingCount > 1 ? 's' : ''} to find`;
                }
            } else {
                const countElem = frontHooksContent.querySelector('.hook-count');
                if (countElem) {
                    countElem.textContent = 'All front hooks found!';
                    countElem.style.color = '#28a745';
                }
            }
        } else if (hookPosition === 'back' && 
                 wordData.back_hooks && 
                 wordData.back_hooks.includes(input) && 
                 !foundHooks.back.has(input)) {
            
            foundHooks.back.add(input);
            isCorrect = true;
            
            // Add to back hooks display
            const tile = document.createElement('div');
            tile.classList.add('hook-tile');
            tile.textContent = input;
            tile.style.boxShadow = '0 0 5px #28a745';
            backHooksContent.appendChild(tile);
            
            // Update count display
            const remainingCount = wordData.back_hooks.length - foundHooks.back.size;
            if (remainingCount > 0) {
                const countElem = backHooksContent.querySelector('.hook-count');
                if (countElem) {
                    countElem.textContent = `${remainingCount} hook${remainingCount > 1 ? 's' : ''} to find`;
                }
            } else {
                const countElem = backHooksContent.querySelector('.hook-count');
                if (countElem) {
                    countElem.textContent = 'All back hooks found!';
                    countElem.style.color = '#28a745';
                }
            }
        }
        
        // Update score and provide feedback
        if (isCorrect) {
            score += 10;
            scoreValueElement.textContent = score;
            
            // Flash a success message
            displayResultMessage(true, `Correct! +10 points`);
            
            // Check if all hooks found
            const totalFrontHooks = wordData.front_hooks ? wordData.front_hooks.length : 0;
            const totalBackHooks = wordData.back_hooks ? wordData.back_hooks.length : 0;
            
            if (foundHooks.front.size === totalFrontHooks && 
                foundHooks.back.size === totalBackHooks) {
                // Bonus for finding all hooks
                score += 20;
                scoreValueElement.textContent = score;
                
                displayResultMessage(true, "All hooks found! +20 bonus");
                
                setTimeout(() => {
                    // Move to next word
                    currentWordIndex++;
                    displayCurrentWord();
                    if (timer) {
                        clearInterval(timer);
                    }
                    startQuizTimer(parseInt(document.getElementById('quiz-time-limit').value));
                }, 1500);
            }
        } else {
            // Incorrect guess
            displayResultMessage(false, "Incorrect!");
            
            // Shake input
            hookInput.classList.add('shake');
            setTimeout(() => {
                hookInput.classList.remove('shake');
            }, 500);
        }
        
        // Clear input
        hookInput.value = '';
    }
    
    // Display result message (like in Wordsmith)
    function displayResultMessage(isCorrect, message) {
        resultMessage.textContent = message;
        resultMessage.style.color = isCorrect ? '#28a745' : '#dc3545';
        
        // Clear the message after 1.5 seconds
        setTimeout(() => {
            resultMessage.innerHTML = '&#160;';
        }, 1500);
    }

    // Previous word button handler
    prevButton.addEventListener('click', () => {
        if (currentWordIndex > 0) {
            currentWordIndex--;
            displayCurrentWord();
            
            if (currentMode === 'quiz' && timer) {
                clearInterval(timer);
                startQuizTimer(parseInt(document.getElementById('quiz-time-limit').value));
            }
        }
    });

    // Next word button handler
    nextButton.addEventListener('click', () => {
        currentWordIndex++;
        if (currentWordIndex >= hookWords.length) {
            currentWordIndex = 0;
        }
        displayCurrentWord();
        
        if (currentMode === 'quiz' && timer) {
            clearInterval(timer);
            startQuizTimer(parseInt(document.getElementById('quiz-time-limit').value));
        }
    });

    // Flip/reveal button handler
    flipButton.addEventListener('click', toggleHooks);

    // Submit hook button and Enter key handler
    submitHookButton.addEventListener('click', submitHook);
    hookInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            submitHook();
        }
    });

    // Filter input to only allow letters and limit to one character
    hookInput.addEventListener('input', () => {
        hookInput.value = hookInput.value.replace(/[^A-Za-z]/g, '').toUpperCase();
        if (hookInput.value.length > 1) {
            hookInput.value = hookInput.value.charAt(0);
        }
    });

    // Helper function to capitalize first letter
    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // Shuffle array function (Fisher-Yates algorithm)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});