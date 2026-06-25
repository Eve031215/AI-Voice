# 部署说明

这版项目已经可以部署成一个线上网页。朋友不用打开终端，只需要打开你发给他的 HTTPS 链接。

## 推荐方案：Render

1. 新建一个 GitHub 仓库，把这个目录里的文件上传进去。
2. 打开 Render Dashboard，点 `New` -> `Web Service`。
3. 连接刚才的 GitHub 仓库。
4. Render 设置：
   - Runtime / Language: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/healthz`
5. 在 Environment Variables 里添加：
   - `OPENAI_API_KEY`: 你的 OpenAI API key
   - `OPENAI_REALTIME_MODEL`: `gpt-realtime-2`
   - `OPENAI_REALTIME_VOICE`: `marin`
6. 点 Deploy。
7. 部署完成后，把 Render 给你的 `https://...onrender.com` 链接发给朋友。

朋友打开链接后：

1. 左侧模型选择 `OpenAI Realtime（后端接入）`。
2. 右侧选择 `女声 Marin` 或 `男声 Cedar`。
3. 点 `开启待机`，允许麦克风。
4. 说“小柠檬”或“你好 Lemon”唤醒。

## 为什么不能把 key 放网页里

`OPENAI_API_KEY` 只能放在服务器环境变量里。不要写进 `index.html`，也不要发给朋友。网页里的内容可以被浏览器开发者工具看到，写进去就等于公开了 key。

## 本地测试

```bash
cd /Users/evewu/Downloads/ai_voice_agent_frontend_preview_water_source
cp .env.example .env
```

把 `.env` 里的 `OPENAI_API_KEY` 换成你的真实 key，然后运行：

```bash
npm start
```

打开：

```text
http://127.0.0.1:3000
```
