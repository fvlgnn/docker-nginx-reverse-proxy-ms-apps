const button = document.getElementById('fetch-data-btn');
const outputDiv = document.getElementById('json-output');

button.addEventListener('click', async () => {
    button.disabled = true;
    outputDiv.textContent = 'Caricamento…';

    try {
        const response = await fetch('/app-be/v1/users/1', {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const user = await response.json();
        outputDiv.replaceChildren();
        const fields = [
            ['ID', user.id],
            ['Nome', user.name],
            ['Località', user.location]
        ];
        for (const [label, value] of fields) {
            const paragraph = document.createElement('p');
            const strong = document.createElement('strong');
            strong.textContent = `${label}: `;
            paragraph.append(strong, document.createTextNode(String(value)));
            outputDiv.append(paragraph);
        }
    } catch (error) {
        outputDiv.textContent = `Richiesta non riuscita: ${error.message}`;
    } finally {
        button.disabled = false;
    }
});
