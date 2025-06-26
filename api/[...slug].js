// نام فایل: api/[...slug].js
// نسخه تست با توکن مستقیم (بسیار ناامن)

export const config = {
  runtime: 'edge',
};

const TARGET_HOST = "coherelabs-aya-expanse.hf.space";

// توکن شما مستقیماً اینجا قرار گرفته است (بسیار ناامن)
const HF_TOKEN = "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";

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `https://${TARGET_HOST}${targetPath}${url.search}`;

  const headers = new Headers(request.headers);
  
  // توکن را مستقیماً به هدر اضافه می‌کنیم
  headers.set('Authorization', `Bearer ${HF_TOKEN}`);
  
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.body,
    redirect: 'follow'
  });

  const response = await fetch(newRequest);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
