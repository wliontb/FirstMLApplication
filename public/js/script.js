async function analyzeReview() {
    const review = document.getElementById('review').value;
    const response = await fetch('/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ review: review })
    });
    const data = await response.json();
    document.getElementById('sentiment').textContent = data.sentiment;
}

async function trainModel() {
    document.getElementById('training-status').textContent = 'Training...';
    const response = await fetch('/train', { method: 'POST' });
    const data = await response.json();
    document.getElementById('training-status').textContent = data.message;
}

async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('csvFile', file);

        document.getElementById('convert-status').textContent = 'Uploading and converting...';

        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('convert-status').textContent = 'Conversion successful! The model is ready to train with new data';
        } else {
            document.getElementById('convert-status').textContent = 'Conversion failed: ' + data.error;
        }
    } else {
        document.getElementById('convert-status').textContent = 'Please select a CSV file.';
    }
}