const express = require('express');
const cors = require('cors');
const path = require('path');
const { Readable } = require('stream');

const app = express();
const PORT = process.env.PORT || 10000; // Render این متغیر را تنظیم می‌کند

// آدرس سرویس اصلی در Hugging Face
const TARGET_HOST = 'https://coherelabs-aya-expanse.hf.space';

// ۱. فعال‌سازی CORS برای تمام درخواست‌ها
app.use(cors());

// ۲. ساخت پراکسی برای مسیر /api/proxy
// این بخش دقیقا کار فایل api/proxy.js شما را انجام می‌دهد
app.use('/api/proxy', async (req, res) => {
  const targetPath = req.originalUrl.substring('/api/proxy'.length);
  const targetUrl = `${TARGET_HOST}${targetPath}`;

  console.log(`Forwarding request to: ${targetUrl}`);

  try {
    const hfResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'],
        'User-Agent': req.headers['user-agent'],
      },
      // برای درخواست‌های POST، بدنه‌ی درخواست را مستقیما ارسال می‌کنیم
      body: req.method === 'POST' ? req : undefined,
      duplex: 'half' // این آپشن برای ارسال body از نوع stream ضروری است
    });

    // ارسال Status و Headers از پاسخ Hugging Face به کلاینت
    res.status(hfResponse.status);
    hfResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    // استریم کردن پاسخ به کلاینت (برای SSE و فایل‌های بزرگ حیاتی است)
    if (hfResponse.body) {
      Readable.fromWeb(hfResponse.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(502).json({ error: 'Proxy failed', details: error.message });
  }
});

// ۳. سرو کردن فایل‌های استاتیک از پوشه public
// هر درخواستی که با /api/proxy شروع نشود، به اینجا می‌آید
app.use(express.static(path.join(__dirname, 'public')));

// ۴. برای تمام مسیرهای دیگر، فایل index.html را نمایش بده
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ۵. اجرای سرور
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
