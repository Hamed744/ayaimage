// نامم فایل جدید: api/[...slug].js

export const config = {
  runtime: 'edge',
};

const TARGET_HOST = "coherelabs-aya-expanse.hf.space";

export default async function handler(request) {
  const url = new URL(request.url);

  // مسیر بعد از /api/ را جدا می‌کنیم
  const targetPath = url.pathname.replace(/^\/api/, '');

  // آدرس کامل هاگینگ فیس را می‌سازیم
  const targetUrl = `https://${TARGET_HOST}${targetPath}${url.search}`;

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  // درخواست را به هاگینگ فیس فرستاده و جواب را برمی‌گردانیم
  return await fetch(newRequest);
}
