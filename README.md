<p align="center">
  <a href="https://github.com/openvideodev/openvideo">
    <img width="150px" height="150px" src="https://cdn.scenify.io/openvideo-logo.png"/>
  </a>
</p>
<h1 align="center">OpenVideo Editor — 增强版</h1>

<div align="center">

基于 [openvideodev/react-video-editor](https://github.com/openvideodev/react-video-editor) 的衍生版本，增加了中文界面、AIFilm 素材库集成、离线 Docker 部署等功能。
<h2>官方原版中存在的大量问题影响正常使用的bug已经修复,界面已经汉化，可以直接进入编排工作</h2>

</div>

<p align="center">
  <img src="docs/screenshots/screenshot-1.png" alt="编辑器主界面" width="100%"/>
</p>
<p align="center">
  <img src="docs/screenshots/screenshot-2.png" alt="属性面板与预览" width="100%"/>
</p>

> **Fork 声明**：本项目 fork 自 [openvideodev/react-video-editor](https://github.com/openvideodev/react-video-editor)，版权归 OpenVideoDev 所有，遵循 [AGPL-3.0](LICENSE) 协议。本版本的修改部分版权归本项目贡献者所有，同样遵循 AGPL-3.0。

---

## 与原版的主要差异

| 功能 | 说明 |
|------|------|
| 中文 UI | 媒体面板、工具栏、操作提示汉化 |
| AIFilm 素材库 | 通过同源代理接入 AIFilm 媒体库，与本地上传合并展示 |
| 视频插入优化 | 插入时自动顺延后续片段（ripple insert） |
| 转场修复 | 支持选中 1 段或 2 段两种方式；增加容差；跨轨保护 |
| 音乐轨道修复 | 修复上传按钮无响应、音频导出失败问题 |
| 关闭/恢复原声 | 轨道工具栏批量静音/取消静音视频轨道 |
| WebCodecs 检测 | 区分 secure context 缺失与 API 缺失，阻止无效渲染 |
| 本地优先存储 | 未登录时自动降级至 IndexedDB，无缝使用 |
| 素材打包下载 | 一键将所有素材（本地 + 远端）打包为 ZIP 下载 |
| 离线 Docker 部署 | 支持内网隔离环境完整部署 |

---

## 核心功能（继承自原版）

### AI 能力

- **AI 助手**：对话式编辑，通过自然语言控制时间轴
- **文字转语音**：ElevenLabs 高质量配音
- **自动字幕**：Deepgram 语音转文字

### 视频编辑

- **多轨时间轴**：视频、音频、图片、文字多轨管理
- **客户端渲染**：基于 WebCodecs API，无需上传到服务器
- **丰富编辑操作**：裁剪、分割、缩放、旋转、位置调整
- **转场与特效**：内置转场库与视觉特效

### 素材与导出

- **素材库**：Pexels 免版权图片/视频
- **本地上传**：拖拽上传视频、图片、音频
- **云存储**：S3/R2 兼容对象存储
- **高质量导出**：MP4 格式，最高 4K

---

## 快速开始

### 环境要求

- **Node.js** v18+
- **pnpm**

### 安装

```bash
git clone <本仓库地址>
cd react-video-editor
pnpm install
```

### 配置环境变量

```bash
cp .env.sample .env.local
```

**最小启动**（无需数据库，使用本地 IndexedDB 存储）：

无需填写任何变量，直接启动即可在本地模式下使用。

**完整配置**参考 `.env.sample` 和下方[环境变量说明](#环境变量说明)。

### 数据库初始化（账号功能）

```bash
pnpm prisma migrate dev
```

### 启动开发服务器

```bash
pnpm dev
# 访问 http://localhost:5000
```

> **注意**：编辑器依赖 WebCodecs，需要在 HTTPS 或 `localhost` 下运行。局域网 `http://IP` 访问会导致编辑器不可用。

---

## Docker 部署

复制并填写 Docker 配置：

```bash
cp .env.docker.example .env.docker
# 编辑 .env.docker，至少填写 BETTER_AUTH_SECRET
```

启动：

```bash
docker compose -f docker-compose.offline.yml --env-file .env.docker up -d
```

### 离线部署（内网环境）

```powershell
# 1. 在联网机器上打包
pnpm offline:pack

# 2. 将 offline-bundle/ 目录拷贝到目标机器
# 3. 在目标机器上部署
pnpm offline:deploy

# 4. 验证
pnpm offline:verify
```

---

## 环境变量说明

### 核心（账号与数据库）

| 变量 | 说明 | 必填 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 账号功能必填 |
| `DIRECT_URL` | PostgreSQL 直连字符串（Prisma 用） | 同上 |
| `BETTER_AUTH_URL` | 应用访问地址，如 `http://localhost:5000` | 同上 |
| `BETTER_AUTH_SECRET` | 随机长字符串，用于签名 session | 同上 |

### AI 功能

| 变量 | 说明 |
|------|------|
| `GOOGLE_GENAI_API_KEY` | Gemini AI 助手 |
| `DEEPGRAM_API_KEY` | 字幕/语音转文字 |
| `DEEPGRAM_URL` | Deepgram 接口地址（默认 `https://api.deepgram.com/v1`） |
| `ELEVENLABS_API_KEY` | AI 配音 |
| `ELEVENLABS_URL` | ElevenLabs 接口地址（默认 `https://api.elevenlabs.io`） |

### 素材库

| 变量 | 说明 |
|------|------|
| `PEXELS_API_KEY` | Pexels 图片/视频素材 |
| `AIFILM_API_BASE_URL` | AIFilm 素材库后端地址（可选） |
| `AIFILM_DEV_USER_ID` | 开发调试用，AIFilm 模拟用户 ID |

### 对象存储

| 变量 | 说明 |
|------|------|
| `R2_BUCKET_NAME` | Cloudflare R2 存储桶名称 |
| `R2_ACCESS_KEY_ID` | R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key |
| `R2_ACCOUNT_ID` | Cloudflare 账号 ID |
| `R2_PUBLIC_DOMAIN` | R2 公共访问域名 |

### OAuth 认证（可选）

| 变量 | 说明 |
|------|------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google 登录 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub 登录 |
| `RESEND_API_KEY` | 邮件发送（邮箱验证码） |

### 其他

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `BATCH_EXPORT_DIR` | 批量导出文件写入目录 | `./exports` |

---

## AIFilm 素材库集成

本项目通过 Next.js 同源代理访问 AIFilm，**不在前端直接跨域请求**：

```
Browser → /api/aifilm/* → AIFilm 后端
```

这样可以保证 cookie 鉴权、Range 请求和 Docker 交付的一致性。配置 `AIFILM_API_BASE_URL` 即可启用。

---

## 与原项目保持同步

```bash
git remote add upstream https://github.com/openvideodev/react-video-editor
git fetch upstream
git merge upstream/main
```

---

## License

本项目遵循 **[GNU AGPL-3.0](LICENSE)** 协议开源。

- 原项目版权：Copyright (c) 2026 OpenVideoDev
- 本版本修改部分：Copyright (c) 2026 本项目贡献者

商业授权（绕过 AGPL 要求）请联系原项目：hello@openvideo.dev

---

## Contributing

欢迎提交 Pull Request 和 Issue！
