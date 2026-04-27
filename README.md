# learn-claude-code-ts

> TypeScript 版 learn-claude-code，用你熟悉的语言理解 Agent Harness 工程

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-f9f1e5.svg)](https://bun.sh/)

## 项目简介

这是一个 **TypeScript 版本的 learn-claude-code** 学习项目。

[原项目 learn-claude-code](https://github.com/shareAI-lab/learn-claude-code) 是用 Python 编写的，深入剖析了 Claude Code 的架构设计，教授 **Harness Engineering（工具链工程）** 的核心原理。

但我不会写 Python，我熟悉 TypeScript。所以我用 TypeScript + Bun 重写了学习过程中的所有示例代码，确保同样的知识可以通过我熟悉的语言来理解和实践。

## 背景

```
Agent = Model + Harness
```

- **Agent 的智能来自模型训练**，不是外部代码 orchestration
- **但一个可用的 Agent 产品需要 Model 和 Harness 两者结合**
- 模型是司机，Harness 是车辆

原项目用 Python 构建了这个 harness 的教学实现。本项目将其翻译为 TypeScript 版本，降低语言门槛，让更多熟悉 TS 的开发者能够理解 agent 工程的精髓。

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# API 配置
ANTHROPIC_API_KEY=your_api_key_here     # api key
ANTHROPIC_BASE_URL=your_base_url_here   # url
MODEL_ID=your_model                     # model
```

### 3. 运行示例

```bash
# 基础 SDK 使用（s00）
bun ./src/s00_sdk_basic_use.ts
```

### 4. 学习路径

按 session 顺序学习，从最基础的 agent loop 开始，逐步进阶：

| Session | 主题 | 座右铭 | 状态 |
|---------|------|--------|------|
| [s00](#s00-sdk-基础) | SDK 基础 | 理解 SDK 的基本用法 | ✅ 已完成 |
| s01 | Agent Loop | *One loop & Bash is all you need* | 🔜 待完成 |
| s02 | 工具使用 | *Adding a tool means adding one handler* | ⬜ 待完成 |
| s03 | Todo 规划 | *An agent without a plan drifts* | ⬜ 待完成 |
| s04 | 子 Agent | *Break big tasks down* | ⬜ 待完成 |
| s05 | 技能加载 | *Load knowledge when you need it* | ⬜ 待完成 |
| s06 | 上下文压缩 | *Context will fill up* | ⬜ 待完成 |
| s07 | 任务系统 | *Break big goals into small tasks* | ⬜ 待完成 |
| s08 | 后台任务 | *Run slow operations in the background* | ⬜ 待完成 |
| s09 | Agent 团队 | *Delegate to teammates* | ⬜ 待完成 |
| s10 | 团队协议 | *Shared communication rules* | ⬜ 待完成 |
| s11 | 自主 Agent | *Scan the board and claim tasks* | ⬜ 待完成 |
| s12 | 工作树隔离 | *Each works in its own directory* | ⬜ 待完成 |

> ✅ 已完成 | 🔜 进行中 | ⬜ 待开始

## 核心模式

Agent 的本质是一个循环：

```
User --> messages[] --> LLM --> response
                                 |
                       stop_reason == "tool_use"?
                      /                          \
                    yes                           no
                     |                             |
               execute tools                    return text
               append results
               loop back -----------------> messages[]
```

**关键点**：

- **模型决定**何时调用工具、何时停止
- **代码只负责执行**模型请求的操作
- Harness 是围绕这个循环的基建：工具、知识、上下文、权限

## Session 详解

### s00: SDK 基础

理解 `@anthropic-ai/sdk` 的基本用法：

- 客户端初始化与环境变量配置
- `messages.create()` 的参数结构
- 响应处理与类型守卫（Type Guard）
- 错误处理

```typescript
const res = await client.messages.create({
    model: env.MODEL_ID ?? "deepseek-v4-pro",
    max_tokens: 10000,
    messages: [{ role: "user", content: [{ type: "text", text: "你是谁？" }] }]
});

for (const block of res.content) {
    if (block.type === "text") {
        console.log(block.text);
    }
}
```

## 目录结构

```
learn-claude-code-ts/
|
|-- src/                          # TypeScript 源代码
|   |-- s00_sdk_basic_use.ts      # s00: SDK 基础
|   |-- s01_agent_loop.ts          # s01: Agent Loop
|   ...
|
|-- .env                          # 环境变量（不提交）
|-- .env.example                  # 环境变量示例
|-- .gitignore                    # Git 忽略配置
|-- package.json                  # 依赖配置
|-- tsconfig.json                 # TypeScript 配置
|-- bun.lock                      # Bun 锁文件（不提交）
|-- README.md                     # 本文件
```

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API 密钥 |
| `ANTHROPIC_BASE_URL` | ❌ | API 基础地址（使用第三方兼容接口时填写） |
| `MODEL_ID` | ❌ | 模型名称，默认 `deepseek-v4-pro` |

## 延伸阅读

- [Anthropic SDK 官方文档](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [原项目 learn-claude-code](https://github.com/shareAI-lab/learn-claude-code)
- [Kode Agent CLI](https://github.com/shareAI-lab/Kode-cli) - 开源 Coding Agent CLI
- [Kode Agent SDK](https://github.com/shareAI-lab/Kode-agent-sdk) - 嵌入式 Agent SDK

## 贡献指南

欢迎提交 PR！

- 发现问题？欢迎提 Issue
- 有更好的实现方式？欢迎 PR
- 希望增加新的学习笔记？欢迎贡献

## License

MIT
