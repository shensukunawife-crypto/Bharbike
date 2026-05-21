async function getWorkflows() {
  const apiKey = 'm8c9swISCz8KddMoe0AweImRiOGcmnIfOxadzi8epvk';
  const url = 'https://verification.didit.me/v3/workflows/';

  console.log('Fetching Didit workflows...');
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching workflows:', error);
  }
}

getWorkflows();
