// نام فایل: api/[...slug].js
// نسخه: جعل هویت مرورگر

export const config = {
  runtime: 'edge',
};

// آدرس اسپیس هدف
const TARGET_HOST = "coherelabs-aya-expanse.hf.space";

export default async function handler(request) {
  const url = new URL(request.url);

  // مسیر درخواست را از URL ورودی جدا می‌کنیم
  const targetPath = url.pathname.replace(/^\/api/, '');

  // آدرس کامل هاگینگ فیس را می‌سازیم
  const targetUrl = `https://${TARGET_HOST}${targetPath}${url.search}`;

  // یک کپی از هدرهای اصلی درخواست کاربر می‌سازیم تا بتوانیم آن‌ها را تغییر دهیم
  const headers = new Headers(request.headers);

  // --- شروع بخش جعل هویت ---

  // ۱. کارت شناسایی: خودمان را به عنوان یک مرورگر کروم واقعی معرفی می‌کنیم
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  // ۲. آدرس مبدأ: به هاگینگ فیس می‌گوییم که این درخواست از داخل خود اسپیس آمده است
  // این هدر برای عبور از بسیاری از چک‌های امنیتی ضروری است
  headers.set('Referer', `https://${TARGET_HOST}/`);
  headers.set('Origin', `https://${TARGET_HOST}`);
  
  // ۳. هدرهای اضافی برای اینکه طبیعی‌تر به نظر برسیم
  headers.set('sec-fetch-dest', 'empty');
  headers.set('sec-fetch-mode', 'cors');
  headers.set('sec-fetch-site', 'same-origin');

  // --- پایان بخش جعل هویت ---

  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: headers, // از هدرهای دستکاری شده جدید استفاده می‌کنیم
    body: request.body,
    redirect: 'follow'
  });

  // درخواست را به هاگینگ فیس فرستاده و جواب را برمی‌گردانیم
  return await fetch(newRequest);
}
