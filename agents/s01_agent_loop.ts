/**
 * s01_agent_loop.ts - The Agent Loop
 *
 * The entire secret of an AI coding agent in one pattern:
 *
 *     while (stopReason === "tool_use") {
 *       response = LLM(messages, tools)
 *       execute tools
 *       append results
 *     }
 *
 *     +----------+      +-------+      +---------+
 *     |   User   | ---> |  LLM  | ---> |  Tool   |
 *     |  prompt  |      |       |      | execute |
 *     +----------+      +---+---+      +----+----+
 *                            ^               |
 *                            |   tool_result |
 *                            +---------------+
 *                            (loop continues)
 *
 * This is the core loop: feed tool results back to the model
 * until the model decides to stop. Production agents layer
 * policy, hooks, and lifecycle controls on top.
 */

import { env, $ } from 'bun';
import { createInterface } from 'node:readline';
import Anthropic from "@anthropic-ai/sdk";

// ==================== 1. 客户端初始化 ====================
// 使用环境变量配置 Anthropic 客户端
// - ANTHROPIC_BASE_URL: API 基础地址（用于接入第三方兼容接口）
// - ANTHROPIC_API_KEY: API 密钥，从环境变量读取避免硬编码
const client = new Anthropic({
    baseURL: env.ANTHROPIC_BASE_URL,
    apiKey: env.ANTHROPIC_API_KEY
});

// ==================== 2. 系统提示词 ====================
// 定义 agent 的角色和工作目录
// 告知模型它在一个 coding 环境中，应该使用 bash 命令来完成任务
const SYSTEM = `You are a coding agent at ${process.cwd()}. Use bash to solve tasks. Act, don't explain.`;

// ==================== 3. 工具定义 ====================
// 告诉模型它可以调用哪些工具，以及工具的参数结构
// 模型会根据这个定义决定何时调用 bash 工具
const Tools: Anthropic.Messages.Tool[] = [
    {
        name: "bash",
        description: "Run a shell command.",
        input_schema: {
            type: 'object',
            properties: {
                command: { type: 'string' }
            },
            required: ["command"]
        }
    }
];

// ==================== 4. 执行命令函数 ====================
// 使用 Bun Shell API 执行 bash 命令，包含安全检查和错误处理
// 参数: cmd - 要执行的命令字符串
// 返回: 命令输出或错误信息
async function runBash(cmd: string): Promise<string> {
    const dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/", "del", "Remove-Item"];
    if (dangerous.some(d => cmd.includes(d))) {
        return "Error: Dangerous command blocked";
    }
    try {
        const result = await $`cmd /c ${cmd}`;
        return result.stdout.toString() || result.stderr.toString() || '';
    } catch (error: any) {
        return `Error: ${error.message}`;
    }
}

// ==================== 5. Agent 循环核心 ====================
// 核心模式：LLM 推理和工具执行的交替循环
// 执行流程：
//   1. 发送消息历史给 LLM
//   2. 若 LLM 调用工具 -> 执行工具，追加结果，goto 1
//   3. 若 LLM 返回文本 -> 完成，退出循环
// 参数: messages - 聊天历史数组，函数内部会直接修改（in-place）
async function agentLoop(messages: Anthropic.MessageParam[]) {
    while (true) {
        // --------- 步骤 1: 调用 LLM ---------
        const response = await client.messages.create({
            model: env.MODEL_ID!,
            system: SYSTEM,
            messages,
            tools: Tools,
            max_tokens: 8000,
        });

        // --------- 步骤 2: 记录响应 ---------
        // 将助手的回复追加到消息历史
        messages.push({ role: "assistant", content: response.content });

        // --------- 步骤 3: 检查停止原因 ---------
        // stop_reason 告诉我们模型为什么停止：
        // - "tool_use": 模型调用了工具，需要继续循环
        // - 其他值（如 "end_turn", "stop_sequence"）: 模型已生成最终回复，退出循环
        if (response.stop_reason !== "tool_use") break;

        // --------- 步骤 4: 执行工具调用 ---------
        // 遍历响应中的所有内容块，只处理 tool_use 类型的块
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
            if (block.type !== "tool_use") continue;

            // 从工具调用块中解析出命令
            const { command } = block.input as { command: string };
            console.log(`⚡ ${command}`);

            // 执行命令并收集输出
            const output = await runBash(command);
            console.log(output);

            // 构建工具结果块，包含 id 以便模型关联请求和响应
            toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: output
            });
        }

        // --------- 步骤 5: 追加结果并继续循环 ---------
        // 将工具结果作为 user 消息追加，模型收到后会继续处理
        messages.push({ role: "user", content: toolResults });
    }
}

// ==================== 6. 交互式输入函数 ====================
// 封装 Node.js readline 的 question 方法为 async 函数
// 解决回调式 API 无法在 async 上下文中直接 await 的问题
// 参数: prompt - 显示给用户的提示符
// 返回: 用户输入的字符串
async function question(prompt: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<string>((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();  // 关闭 readline 防止资源泄漏
            resolve(answer);
        });
    });
}

// ==================== 7. 主入口 - REPL 循环 ====================
// 交互式循环：读取输入 -> 执行 agent -> 打印响应 -> 重复或退出
// 退出条件：输入 q / exit / 空行
async function main() {
    // 消息历史，累积所有对话轮次
    const history: Anthropic.MessageParam[] = [];

    while (true) {
        // 获取用户输入
        const query = await question("s01 >> ");
        const trimmed = query.trim().toLowerCase();

        // 检查退出条件
        if (!trimmed || trimmed === "q" || trimmed === "exit") {
            break;
        }

        // 将用户消息加入历史并执行 agent
        history.push({ role: "user", content: query });
        await agentLoop(history);

        // 打印助手的最终响应（只处理 text 类型的块）
        const last = history[history.length - 1];
        if (last && last.role === "assistant" && Array.isArray(last.content)) {
            for (const block of last.content) {
                if (block.type === "text") {
                    console.log(block.text);
                }
            }
        }
        console.log();
    }
}

// ==================== 8. 启动程序 ====================
main();