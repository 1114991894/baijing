import express from 'express';
const app = express();

// 关键：必须先解析 JSON 请求体，否则 req.body 是空对象
app.use(express.json());

// 抖音 Webhook 校验接口
app.post('/api/webhook', (req, res) => {
  console.log('收到请求:', req.body); // 方便在 Vercel 日志里排查
  const challenge = req.body.challenge;

  if (challenge) {
    // 严格按抖音要求：返回 text/plain 格式的 JSON 字符串
    res.setHeader('Content-Type', 'text/plain');
    return res.send(JSON.stringify({ challenge }));
  }

  // 缺少 challenge 时返回标准 JSON 错误
  res.status(400).send(JSON.stringify({ error: 'missing challenge' }));
});

// 健康检查（测试服务是否存活）
app.get('/api/health', (req, res) => {
  res.send('ok');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`服务运行在端口 ${port}`));
export default app;
