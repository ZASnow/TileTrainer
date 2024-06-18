document.getElementById('word-check-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var word = document.getElementById('word').value;

    fetch('/check_word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ word: word })
    })
    .then(response => response.json())
    .then(data => {
        var resultDiv = document.getElementById('result');
        resultDiv.textContent = `"${word}" is ${data.validity}.`;
    });
});
