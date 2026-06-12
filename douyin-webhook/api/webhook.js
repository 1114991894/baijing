export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const data = req.body;

  // 抖音 Webhook 验证（必须写）
  if (data.event === 'verify_webhook') {
    const challenge = data.content.challenge;
    return res.json({ challenge });
  }

  // 其他事件你以后可以自己加
  res.json({ status: 'ok' });
};
