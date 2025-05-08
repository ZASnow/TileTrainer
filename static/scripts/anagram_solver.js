document.addEventListener('DOMContentLoaded', function() {
    const letterInput = document.getElementById('letter-input');
    const solveButton = document.getElementById('solve-button');
    const clearButton = document.getElementById('clear-button');
    const resultsList = document.getElementById('results-list');
    const resultCount = document.getElementById('result-count');
    const loadingSpinner = document.getElementById('loading-spinner');
    const dictionaryOptions = document.getElementsByName('dictionary');
    
    // Focus on input field when page loads
    letterInput.focus();
    
    // Add event listeners
    solveButton.addEventListener('click', solveAnagram);
    clearButton.addEventListener('click', clearResults);
    letterInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            solveAnagram();
        }
    });
    
    // Validate input to only allow letters and question marks
    letterInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^a-zA-Z?]/g, '').toUpperCase();
    });
    
    function solveAnagram() {
        const letters = letterInput.value.trim();
        
        if (!letters) {
            alert('Please enter some letters');
            return;
        }
        
        // Get selected dictionary
        let selectedDictionary = 'both';
        for (const option of dictionaryOptions) {
            if (option.checked) {
                selectedDictionary = option.value;
                break;
            }
        }
        
        // Show loading spinner
        loadingSpinner.classList.remove('hidden');
        resultsList.innerHTML = '';
        resultCount.textContent = '(0)';
        
        // Send request to server
        fetch('/solve_anagram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                letters: letters,
                dictionary: selectedDictionary
            })
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading spinner
            loadingSpinner.classList.add('hidden');
            
            // Display results
            displayResults(data.words, selectedDictionary);
        })
        .catch(error => {
            console.error('Error:', error);
            loadingSpinner.classList.add('hidden');
            alert('An error occurred. Please try again.');
        });
    }
    
    function displayResults(words, dictionaryChoice) {
        resultsList.innerHTML = '';
        resultCount.textContent = `(${words.length})`;
        
        if (words.length === 0) {
            resultsList.innerHTML = '<p>No anagrams found for these letters.</p>';
            return;
        }
        
        // Group words by length
        const wordsByLength = {};
        words.forEach(word => {
            const length = word.length;
            if (!wordsByLength[length]) {
                wordsByLength[length] = [];
            }
            wordsByLength[length].push(word);
        });
        
        // Create sections for each word length
        const lengths = Object.keys(wordsByLength).sort((a, b) => b - a); // Sort descending
        
        lengths.forEach(length => {
            const sectionWords = wordsByLength[length];
            
            // Create section header
            const sectionHeader = document.createElement('h3');
            sectionHeader.textContent = `${length}-letter words (${sectionWords.length})`;
            resultsList.appendChild(sectionHeader);
            
            // Create section container
            const sectionContainer = document.createElement('div');
            sectionContainer.className = 'word-section';
            sectionContainer.style.display = 'flex';
            sectionContainer.style.flexWrap = 'wrap';
            sectionContainer.style.gap = '10px';
            sectionContainer.style.marginBottom = '5px';
            
            // Add words to section
            sectionWords.forEach(word => {
                const wordItem = document.createElement('div');
                wordItem.textContent = word.word;
                wordItem.className = 'word-item';
                
                // Add appropriate class based on dictionary status
                if (word.in_nwl && word.in_collins) {
                    wordItem.classList.add('both');
                } else if (word.in_nwl) {
                    wordItem.classList.add('nwl-only');
                } else if (word.in_collins) {
                    wordItem.classList.add('collins-only');
                }
                
                // If dictionary choice is 'nwl' or 'collins', filter out words not in that dictionary
                if ((dictionaryChoice === 'nwl' && !word.in_nwl) || 
                    (dictionaryChoice === 'collins' && !word.in_collins)) {
                    wordItem.style.display = 'none';
                }
                
                // Add click handler to copy word to clipboard
                wordItem.addEventListener('click', function() {
                    navigator.clipboard.writeText(word.word)
                        .then(() => {
                            // Show a temporary tooltip
                            const tooltip = document.createElement('div');
                            tooltip.textContent = 'Copied!';
                            tooltip.style.position = 'absolute';
                            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            tooltip.style.color = 'white';
                            tooltip.style.padding = '5px 10px';
                            tooltip.style.borderRadius = '3px';
                            tooltip.style.zIndex = '1000';
                            tooltip.style.top = (this.offsetTop - 30) + 'px';
                            tooltip.style.left = (this.offsetLeft + this.offsetWidth / 2 - 30) + 'px';
                            
                            document.body.appendChild(tooltip);
                            
                            setTimeout(() => {
                                document.body.removeChild(tooltip);
                            }, 1500);
                        })
                        .catch(err => {
                            console.error('Could not copy text: ', err);
                        });
                });
                
                sectionContainer.appendChild(wordItem);
            });
            
            resultsList.appendChild(sectionContainer);
        });
    }
    
    function clearResults() {
        letterInput.value = '';
        resultsList.innerHTML = '';
        resultCount.textContent = '(0)';
        letterInput.focus();
    }
});