# AI 语音 Agent 前端预览版（能量轨道语音态）

打开 index.html 可预览静态界面；需要真实语音对话时，请用本目录里的 Node 服务打开页面。

本版本重点改了中间语音视觉：
- 静态时显示透明镂空的交错能量轨道
- 用户语音 / listening 时顺时针旋转
- AI 说话 / speaking 时线条产生波动变形
- 整体 UI 已调整为更轻的马卡龙色系
- 支持“待机监听”：研究员先点一次开启待机，被试说“小柠檬”或“你好 Lemon”唤醒
- 保留本地前端 Mock 对话，方便无后端预览

## 实验需求映射

根据《AI语音硬件交互研究_实验材料附录》，本预览需要支撑：
- Study 1：回复长度 L1/L2/L3
- Study 2：回复风格 S1/S2/S3
- Study 3：等待时间 T1/T2/T3
- 三类任务场景：学习理解、办公处理、生活休闲
- 记录用户提问次数、AI 回复字数/时长、正式回答延迟、任务答案与客观评分
- 后续可继续补任务后 1-7 分主观量表与完整实验记录导出

## 连接 OpenAI Realtime 语音

前端已经接入 WebRTC 连接逻辑。不要把 OpenAI API key 放到浏览器里，请用本目录里的 `oai-realtime-server.mjs` 在本机创建 `/session` 接口；浏览器把 SDP 发给 `/session`，由本机后端带着 `OPENAI_API_KEY` 去连接 OpenAI Realtime。

```bash
export OPENAI_API_KEY="sk-..."
node oai-realtime-server.mjs
```

也可以在同目录放一个 `.env`：

```bash
OPENAI_API_KEY="sk-..."
OPENAI_REALTIME_MODEL="gpt-realtime-2"
OPENAI_REALTIME_VOICE="marin"
```

然后打开 `http://localhost:3000`，在模型选择里切到 `OpenAI Realtime（后端接入）`，点击“开启待机”，允许麦克风权限后，说“小柠檬”或“你好 Lemon”即可唤醒真实语音对话。模型和声音可以通过环境变量调整：

```bash
OPENAI_REALTIME_MODEL="gpt-realtime-2" OPENAI_REALTIME_VOICE="marin" node oai-realtime-server.mjs
```

## 给朋友打开即用的方式

不要把 `OPENAI_API_KEY` 写进 `index.html`。如果 key 放在网页里，别人打开开发者工具就能看到，相当于把你的账号额度交出去了。

本目录已经补好了部署文件：`package.json`、`render.yaml`、`.env.example` 和 `DEPLOY.md`。

正确做法是：

1. 把这个目录部署到一个线上 Node 服务，比如 Render、Railway、Fly.io、Vercel Serverless/Node 或自己的云服务器。
2. 在部署平台的环境变量里填 `OPENAI_API_KEY`。
3. 把部署出来的网址发给朋友。

这样朋友只需要打开网址，点“开启待机”，允许麦克风，然后说“小柠檬”唤醒；他不需要终端，也看不到你的 key。

如果只是小范围线下实验，也可以做成双击启动包，但这仍然是在本机跑服务；最干净的方案还是线上部署。

具体部署步骤看 `DEPLOY.md`。

## 正式实验怎么用

1. 研究员先打开页面并选择实验条件、任务材料和模型。
2. 点击中间按钮“开启待机”，浏览器第一次会请求麦克风权限，点允许。
3. 被试开始任务，需要 AI 时说“小柠檬”或“你好 Lemon”。
4. 系统被唤醒后，被试直接提问；AI 会按右侧 Study/条件提示词回答。
5. 对话结束后点“结束”，记录会留在页面和后台预览里。

浏览器里做唤醒词监听有一个限制：第一次必须由研究员点一下按钮授权麦克风。真正的耳机硬件版本可以把这一步放在设备启动流程里，用户就不需要点屏幕。

## 嘈杂环境参数

后端默认已经按嘈杂实验环境调高了 VAD 门槛：

```bash
OPENAI_REALTIME_VAD_THRESHOLD=0.68
OPENAI_REALTIME_VAD_PREFIX_PADDING_MS=500
OPENAI_REALTIME_VAD_SILENCE_DURATION_MS=850
OPENAI_REALTIME_INTERRUPT_RESPONSE=true
```

大白话理解：
- `threshold` 越高，越不容易被旁边杂音误触发。
- `silence_duration_ms` 越长，越不会因为被试短暂停顿就马上截断。
- `interrupt_response=true` 表示被试说话可以打断 AI，但因为门槛较高，普通环境噪声不应轻易打断。
