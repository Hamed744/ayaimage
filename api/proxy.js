// A Vercel Serverless Function to act as a proxy for Hugging Face Spaces.
// This allows bypassing CORS and filtering issues.

// The target Hugging Face Space URL.
const TARGET_HOST = 'https://coherelabs-aya-expanse.hf.space';

export default async function handler(request, response) {
  // Set CORS headers for all responses first
  response.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow these methods
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent'); // Allow specific headers from client

  // Handle OPTIONS (preflight) request
  if (request.method === 'OPTIONS') {
    response.status(200).end(); // Respond successfully to preflight
    return;
  }

  // Construct the target URL
  // The client will request something like: /api/proxy/gradio_api/queue/join
  // We need to extract the path: /gradio_api/queue/join
  const targetPath = request.url.replace('/api/proxy', '');
  const targetUrl = `${TARGET_HOST}${targetPath}`;

  try {
    let requestBody = null;
    const contentType = request.headers.get('content-type');

    // Read the request body only for POST requests, and attempt to parse as JSON
    if (request.method === 'POST') {
      if (contentType && contentType.includes('application/json')) {
        // We expect JSON, so parse it
        requestBody = JSON.stringify(await request.json());
      } else {
        // Fallback for other text-based bodies
        requestBody = await request.text();
      }
    }

    // Make the actual request to Hugging Face
    const hfResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // Forward necessary headers from the client
        'Content-Type': contentType, // Use the extracted content type
        'User-Agent': request.headers.get('user-agent'),
        // Add other headers as needed, e.g., Authorization if applicable
      },
      body: requestBody // Pass the read and (if applicable) stringified body
    });

    // Forward headers from Hugging Face back to our client
    // Exclude 'content-encoding' and 'transfer-encoding' to avoid conflicts
    hfResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        response.setHeader(key, value);
      }
    });
    
    // Set the status code from the target response
    response.status(hfResponse.status);

    // Pipe the response body from Hugging Face directly to the client
    // This supports streaming for Server-Sent Events (SSE) from Gradio.
    if (hfResponse.body) {
      const { Readable } = await import('node:stream'); // Import Node.js Readable stream
      Readable.fromWeb(hfResponse.body).pipe(response); // Pipe web stream to Node.js response stream
    } else {
      response.end();
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    // Send a 502 Bad Gateway error if the proxy itself fails
    response.status(502).json({ error: 'Proxy failed', details: error.message });
  }
}
