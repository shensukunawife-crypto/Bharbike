async function testSessionCreation() {
  const apiKey = 'm8c9swISCz8KddMoe0AweImRiOGcmnIfOxadzi8epvk';
  const url = 'https://verification.didit.me/v3/session/';
  
  const payload = {
    workflow_id: '45c50b06-8873-4def-badb-de0ae91ead97', // Custom KYC
    vendor_data: 'test_user_123'
  };

  console.log('Attempting to create a verification session...');
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
    console.error('Error creating session:', error);
  }
}

testSessionCreation();
