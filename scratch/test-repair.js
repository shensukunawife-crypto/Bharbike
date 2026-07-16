const rawJson = `{"type":"service_account","project_id":"mindfitindia-7e5c2","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDogi/G6uTJyU9X\\nBM2Wxqaf4DB0exW2SWzjFCZWvtugVa/08EmJvDrE2pxkDfBEliKIGuhhOB5LWmaT\\n6Wmtts2gaY+nuDzmdrktbuSd6K0jCJJDeyq8DXrPbMabtBpPUth+0RJbmZGVuJwM\\nJ24AYLbR4MtTVzSGgRa5zgrKG7rANsGP7kl/Q6IWMr3/saIBnEIP1+v6KN4l5cs+\\nJJvUk7lnW/RMQylV8tTLyrLM+VTD7bEJPkWz0XfGemIVeYOHzQO3SfIiAXZ82Nx5\\neBJ5uREuS8GrXHoUw6h4ePiEJoCso92ToGCRMqtnP3KEvFSGrppGvxmu/jovTiwz\\nuSQ/f0y7AgMBAAECggEAHdU+fh57lqye4oJ6QqNgk9j3PqrgYVBQiV53gN/iXFNC\\nTYJbXTHqtIF8WZY0Qwiki6QwNvE1aePCj63+Yky3W6LPzOxl3AhVwE+fQ+er93fN\\nFJ2EITb1kBHb9fSI/66YmsUGvvwYYwaZ9zFD+wZtzsYyMJJa6fs8SED4v3AJaUoe\\nth3b8F1yPfWysP6nvs0IKdWxtfU2ZyDGCRYiFVqxqeTnx6+NEGSW5vK/Jiuo+W0Q\\nXKf1/4gs7n60wOC29+SGmmbEdKMcrSPAVlXLV/BnAfa2e6S4rDYgTUuVPIu3ka01\\ny5QSKpHUybyXqqaiz36EiLjMUkpzTjfsTbqfhd/GAQKBgQD0dn6HaEs1o18n2q+z\\noZum2b2VVqJnipsy9a1KddfAdSsgDI7kudEMhoZejihzYcfPLBlaUT/CDrh9rElX\\nfIcXvnB/3nf5eWBt6dqXu1VsYiQRlB/AdZOJ6pg+H0hA3emHlz+Xekr1c9Tx+BCi\\nuRRe7GgEkw8n/aCQ0B9VCC/XAQKBgQDze0PLw5LgNozQ2WAKRyMCNLy9ACrY/WfY\\nnVZvAduShBbmrf28aDStxK8Xe4a3J9EiQrGzecMLdPmoRF4dt5GW4m6AnvEb1Huk\\n9gX4ujIdGW3oVvMKwYjQ+J3Tz3ujlu54quJ7nxwX3trjNa8mrAstOEOBhBaZX6QX\\nuzBvwqQ/uwKBgQCDq6sc/cS8oEEpczV9uEbhCJh/bklNIa/UM9VhrLVHmRRgT8NL\\nWPZLG84V8dXBx+HaKXOCXQ7NVCZ0si5Sq+ULmex4Qvg16/VPXkz5utIY7Ydl3HV5\\nsRqFh1D27Nx668vT11hOG3VyXTBOIAG905gwRH8GL7tTG923AhJON3mlAQKBgAZW\\njRs+yhIAGYZOQkvCMk0aZlddK8BeSFfBMMDPAZI80gPLP7Gp3MUxO4WW95jI9o63\\nwbx0TPl9YApbTT/kyWtuFYZPnOMmktlmdh1Va3yKbuv/Z3A+PXuDHUioPAW0Jh0K\\nBb9GEwskB/qmKRsOm3Pf5RH4CEaR0Mm1W7ttC62FAoGBAISaKuKnc3jrUsv0laQU\\nMaggNJoOR/Wn7UmpnDJgFMR2f3NKtN4GUk2UFoqoqqhOSrIsXTREZ0Xf/mTuax+B\\nlSZaHKUQcVfKfV7IF9LTmSpHL+2ieI4gKhUSv1nkbSUjLd+HppsGjLRA4f2/pATC\\nlnKeCcuiBwmcqo5IrFchsUlL\\n-----END PRIVATE KEY-----\\n\"}`;

// Intentionally break the string at position 1286 by changing \\n to \\
const brokenJson = rawJson.replace("6QX\\\\nuz", "6QX\\\\uz");

console.log("Broken JSON contains \\\\uz:", brokenJson.includes("6QX\\\\uz"));

try {
  JSON.parse(brokenJson);
} catch (e) {
  console.log("Expected parsing failure on broken JSON:", e.message);
}

// Apply our self-healing repair logic
let repairedJson = brokenJson;
try {
  repairedJson = brokenJson.replace(/\\u/g, '\\nu');
  console.log("Repaired JSON contains \\\\nuz:", repairedJson.includes("6QX\\\\nuz"));
  const parsed = JSON.parse(repairedJson);
  console.log("SUCCESS! Repaired JSON parsed cleanly. Project ID:", parsed.project_id);
} catch (err) {
  console.error("FAILED to parse repaired JSON:", err.message);
}
