document.getElementById('predictionForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Elements
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const welcomeState = document.getElementById('welcomeState');
    const resultsGrid = document.getElementById('resultsGrid');

    // UI Feedback: Start Loading
    submitBtn.disabled = true;
    btnText.textContent = "Processing...";
    btnSpinner.classList.remove('d-none');

    // Gather Form Data
    const formData = new FormData(this);
    const data = {};
    
    formData.forEach((value, key) => {
        data[key] = parseFloat(value);
    });

    if (!data.hasOwnProperty('smoking')) {
        data['smoking'] = 0;
    }

    try {
        const response = await fetch('http://localhost:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const result = await response.json();

        updateResultCard('knn', result.knn);
        updateResultCard('naive_bayes', result.naive_bayes);
        updateResultCard('decision_tree', result.decision_tree);
        updateResultCard('random_forest', result.random_forest);

        welcomeState.classList.add('d-none');
        resultsGrid.classList.remove('d-none');
        resultsGrid.classList.add('fade-in');

    } catch (error) {
        console.error('Error:', error);
        alert('Could not connect to the Prediction Server. Please ensure the API is running at localhost:8000.');
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = "Predict Results";
        btnSpinner.classList.add('d-none');
    }
});

function updateResultCard(modelId, value) {
    const card = document.getElementById(`card_${modelId}`);
    const statusText = card.querySelector('.status-text');
    
    card.classList.remove('status-healthy', 'status-risk');

    if (value === 0) {
        card.classList.add('status-healthy');
        statusText.textContent = "Healthy";
    } else {
        card.classList.add('status-risk');
        statusText.textContent = "Risk of Failure";
    }
}