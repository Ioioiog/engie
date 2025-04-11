export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { sitekey, pageurl } = req.body;
  const API_KEY = process.env.CAPTCHA_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Missing CAPTCHA_API_KEY in environment" });
  }

  try {
    const solveRes = await fetch("http://2captcha.com/in.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        key: API_KEY,
        method: "userrecaptcha",
        googlekey: sitekey,
        pageurl: pageurl,
        json: 1
      })
    });

    const { request: captchaId, status } = await solveRes.json();
    if (status !== 1) {
      return res.status(500).json({ error: "Failed to send CAPTCHA request" });
    }

    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const resultRes = await fetch(`http://2captcha.com/res.php?key=${API_KEY}&action=get&id=${captchaId}&json=1`);
      const result = await resultRes.json();
      if (result.status === 1) {
        return res.status(200).json({ token: result.request });
      }
    }

    return res.status(504).json({ error: "Timeout waiting for CAPTCHA result" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unexpected error", details: err.message });
  }
}
