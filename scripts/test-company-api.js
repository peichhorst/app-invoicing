import fetch from 'node-fetch';

async function testUpdateCompany() {
  const payload = {
    name: 'Test Company',
    primaryColor: '#ff0000',
  };
  try {
    const res = await fetch('http://localhost:3000/api/company', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const bodyText = await res.text();
    let responsePayload;
    try {
      responsePayload = JSON.parse(bodyText);
    } catch {
      responsePayload = bodyText;
    }
    console.log('Status:', res.status);
    console.log('Response:', responsePayload);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testUpdateCompany();
