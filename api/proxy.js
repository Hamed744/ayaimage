// File: api/proxy.js

export const config = {
  runtime: 'edge', 
};

const TARGET_HOST = "coherelabs-aya-expanse.hf.space";

export default async function handler(request) {
  // 1. ساختن آدرس جدید با استفاده از هاست هدف
  const url = new URL(request.url);
  url.hostname = TARGET_HOST;
  url.protocol = "https:";

  // 2. ساختن یک درخواست جدید که به سمت هاست هدف می‌رود
  const newRequest = new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  // 3. ارسال درخواست به هاست هدف و برگرداندن مستقیم پاسخ
  return await fetch(newRequest);
}
