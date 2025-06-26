// api/proxy.js - Pure CommonJS Vercel Serverless Function

// The target Hugging Face Space URL.
const TARGET_HOST = 'https://coherelabs-aya-expanse.hf.space';

// Using CommonJS require for built-in Node.js modules
const { Readable } = require('stream');

// Exporting the handler function using CommonJS module.exports
module.exports = async function handler(request, response) {
  console.log("Proxy function received a request (Pure CommonJS setup)!");
  console.log("Request URL:", request.url);
  console.log("Request Method:", request.method);
  console.log("Request Headers:", request.headers);

  // Set CORS headers for all responses first
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  // Handle OPTIONS (preflight) request immediately
  if (request.method === 'OPTIONS') {
    console.log("Handling OPTIONS (Preflight) request.");
    response.status(200).end();
    return;
  }

  // Construct the target URL
  let targetPath = request.url;
  if (targetPath.startsWith('/api/proxy')) {
    targetPath = targetPath.substring('/api/proxy'.length);
  } else if (targetPath.startsWith('/api/')) {
    targetPath = targetPath.substring('/api'.length);
  }
  
  const targetUrl = `${TARGET_HOST}${targetPath}`;
  console.log("Forwarding request to:", targetUrl);

  try {
    let requestBody = null;
    const contentType = request.headers.get('content-type');

    if (request.method === 'POST') {
      if (contentType && contentType.includes('application/json')) {
        try {
          requestBody = JSON.stringify(await request.json());
          console.log("Parsed JSON request body.");
        } catch (jsonError) {
          console.error("Error parsing JSON body, trying as text:", jsonError);
          requestBody = await request.text();
        }
      } else {
        requestBody = await request.text();
        console.log("Parsed text request body.");
      }
    }

    const hfResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': contentType,
        'User-Agent': request.headers.get('user-agent'),
      },
      body: requestBody
    });

    response.status(hfResponse.status);
    hfResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'connection') {
        response.setHeader(key, value);
      }
    });
    
    if (hfResponse.body) {
      console.log("Streaming response body from Hugging Face.");
      Readable.fromWeb(hfResponse.body).pipe(response);
    } else {
      console.log("No response body from Hugging Face.");
      response.end();
    }

  } catch (error) {
    console.error('Proxy execution error:', error);
    response.status(502).json({ error: 'Proxy failed to process request', details: error.message });
  }
};
