async function testIdVerification() {
  const apiKey = 'm8c9swISCz8KddMoe0AweImRiOGcmnIfOxadzi8epvk';
  const url = 'https://verification.didit.me/v3/id-verification/';

  // 1x1 transparent PNG as a Blob/File
  const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const buffer = Buffer.from(dummyPngBase64, 'base64');
  const blob = new Blob([buffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('front_image', blob, 'id_front.png');

  console.log('Sending request to Didit ID Verification endpoint...');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey
      },
      body: formData
    });

    console.log('Response Status:', response.status);
    const data = await response.json();
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testIdVerification();
