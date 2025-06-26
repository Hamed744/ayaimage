// A Vercel Serverless Function to act as a proxy for Hugging Face Spaces.
const TARGET_HOST = 'https://coherelabs-aya-expanse.hf.space';

export default async function handler(request, response) {
  const targetPath = request.url.replace('/api/proxy', '');
  const targetUrl = `${TARGET_HOST}${targetPath}`;

  try {
    const hfResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': request.headers['content-type'],
        'User-Agent': request.headers['user-agent'],
      },
      body: request.method === 'POST' ? request.body : undefined,
      // @ts-ignore
      duplex: 'half' 
    });

    response.setHeader('Access-Control-Allow-Origin', '*');
    hfResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        response.setHeader(key, value);
      }
    });
    
    response.status(hfResponse.status);

    if (hfResponse.body) {
      const { Readable } = await import('node:stream');
      Readable.fromWeb(hfResponse.body).pipe(response);
    } else {
      response.end();
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    response.status(502).json({ error: 'Proxy failed', details: error.message });
  }
}
