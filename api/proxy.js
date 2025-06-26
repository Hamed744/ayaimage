// api/proxy.js - Pure CommonJS Vercel Serverless Function

// The target Hugging Face Space URL.
const TARGET_HOST = 'https://coherelabs-aya-expanse.hf.space';

// Using CommonJS require for built-in Node.js modules
const { Readable } = require('stream');

// Exporting the handler function using CommonJS module.exports
module.exports = async function handler(request, response) {
  console.log("Proxy function received a request (Final setup)!");
  console.log("Request URL:", request.url);
  console.log("Request Method:", request.method);
  // console.log("Request Headers:", request.headers); // Temporarily comment out for brevity in logs

  // Set CORS headers for all responses first
  response.setHeader('Access-Control-Allow-Origin', '*'); // Allow requests from any origin
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow these methods
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent'); // Allow specific headers from client

  // Handle OPTIONS (preflight) request immediately
  if (request.method === 'OPTIONS') {
    console.log("Handling OPTIONS (Preflight) request.");
    response.status(200).end(); // Respond successfully to preflight
    return;
  }

  // Construct the target URL
  let targetPath = request.url;
  if (targetPath.startsWith('/api/proxy')) {
    targetPath = targetPath.substring('/api/proxy'.length);
  } else if (targetPath.startsWith('/api/')) { // Fallback if routing changes slightly
    targetPath = targetPath.substring('/api'.length);
  }
  
  const targetUrl = `${TARGET_HOST}${targetPath}`;
  console.log("Forwarding request to:", targetUrl);

  try {
    let requestBody = null;
    // --- تغییر اینجا: استفاده از request.headers['content-type'] به جای .get() ---
    const contentType = request.headers['content-type'];
    // --- تغییر اینجا: استفاده از request.headers['user-agent'] به جای .get() ---
    const userAgent = request.headers['user-agent'];
    

    // Read the request body only for POST requests
    if (request.method === 'POST') {
      if (contentType && contentType.includes('application/json')) {
        try {
          // Vercel's `request.json()` might not be available on raw Node.js req object
          // For Vercel, `req.body` is usually already parsed if content-type is json
          // However, using a helper to read stream for robustness:
          requestBody = await rawBody(request, { encoding: 'utf-8' });
          console.log("Read raw request body for JSON parsing.");
        } catch (jsonError) {
          console.error("Error reading JSON body, trying as text (fallback):", jsonError);
          requestBody = await rawBody(request, { encoding: 'utf-8' }); // Fallback to raw text
        }
      } else {
        requestBody = await rawBody(request, { encoding: 'utf-8' }); // For other content types
        console.log("Read raw text request body.");
      }
    }

    // --- افزودن یک ابزار برای خواندن Raw Body ---
    // این تابع را در همین فایل api/proxy.js اضافه کنید (خارج از تابع handler)
    async function rawBody(readable, { encoding } = {}) {
      const chunks = [];
      for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk);
      }
      return Buffer.concat(chunks).toString(encoding);
    }

    // Make the actual request to Hugging Face
    const hfResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Content-Type': contentType, // Use the client's Content-Type
        'User-Agent': userAgent, // Forward User-Agent
        // Add other headers from the client if needed (e.g., Authorization)
      },
      body: requestBody // Pass the processed body
    });

    // Forward status and headers from Hugging Face back to the client
    response.status(hfResponse.status);
    hfResponse.headers.forEach((value, key) => {
      // Exclude problematic headers for proxying
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding' && key.toLowerCase() !== 'connection') {
        response.setHeader(key, value);
      }
    });
    
    // Pipe the response body (crucial for SSE and large files)
    if (hfResponse.body) {
      console.log("Streaming response body from Hugging Face.");
      Readable.fromWeb(hfResponse.body).pipe(response);
    } else {
      console.log("No response body from Hugging Face.");
      response.end();
    }

  } catch (error) {
    console.error('Proxy execution error:', error); // This log *will* appear in Vercel logs
    response.status(502).json({ error: 'Proxy failed to process request', details: error.message });
  }
};
