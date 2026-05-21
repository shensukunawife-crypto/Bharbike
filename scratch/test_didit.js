async function testDidit() {
  const apiKey = 'm8c9swISCz8KddMoe0AweImRiOGcmnIfOxadzi8epvk';
  const url = 'https://verification.didit.me/v3/aml/';
  
  const payload = {
    full_name: 'John Doe',
    entity_type: 'person',
    date_of_birth: '1990-01-15',
    nationality: 'US'
  };

  console.log('Sending request to Didit AML endpoint using global fetch...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testDidit();
