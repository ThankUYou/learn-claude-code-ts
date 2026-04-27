import { env } from 'bun';
import Anthropic from "@anthropic-ai/sdk";

// ==================== 1. 客户端初始化 ====================
// 使用环境变量配置 Anthropic 客户端
// - ANTHROPIC_BASE_URL: API 基础地址（用于接入第三方兼容接口如 deepseek）
// - ANTHROPIC_API_KEY: API 密钥，从环境变量读取以避免硬编码
const client = new Anthropic({
    baseURL: env.ANTHROPIC_BASE_URL,
    apiKey: env.ANTHROPIC_API_KEY
});

// ==================== 2. 主函数 ====================
// 程序入口，负责发送 API 请求并处理响应
async function main() {
    try {
        // ================ 2.1 发送消息请求 ================
        // client.messages.create() 是 Anthropic SDK 的核心方法，用于创建对话
        // 返回值是一个 Message 对象，包含模型生成的所有内容块
        const res = await client.messages.create({
            // model: 指定使用的模型名称
            // - 优先读取环境变量 MODEL_ID
            // - 若未设置则默认使用 "deepseek-v4-pro"
            model: env.MODEL_ID ?? "deepseek-v4-pro",

            // max_tokens: 单次响应最大 token 数（包含思考和输出）
            // 10000 足够生成较长的回复
            max_tokens: 10000,

            // messages: 对话历史数组，按顺序发送给模型
            // 每条消息包含 role（角色）和 content（内容）
            messages: [
                {
                    // role: 标识消息发送者的角色
                    // - "user": 用户发送的消息
                    // - "assistant": AI 助手生成的回复
                    // - "system": 系统级指令（通常通过 system 参数传入）
                    role: "user",

                    // content: 消息的实际内容，可以是多种类型的数组
                    // 常见类型：
                    // - text: 文本内容
                    // - image: 图片（需提供 base64 或 URL）
                    // - tool_use: 工具调用结果（由模型发出、用户执行后返回）
                    content: [
                        {
                            type: "text",  // 文本类型块
                            text: "你是谁？"   // 用户输入的文本内容
                        }
                    ]
                }
            ]
        });

        // ================ 2.2 处理响应内容 ================
        // res.content 是响应内容的数组，包含多种类型的块
        // 常见类型：
        // - text: 文本回复块，包含 .text 属性
        // - thinking: 模型的思考过程（部分模型支持）
        // - tool_use: 模型调用工具的请求
        // - tool_result: 工具执行结果（模型收到后继续处理）
        for (const block of res.content) {
            // 使用类型守卫（type guard）过滤出 text 类型的块
            // 只有 block.type === "text" 时，TypeScript 才会将 block 窄化为 TextBlock
            // 从而允许访问 .text 属性，避免其他类型块（如 thinking）导致的类型错误
            if (block.type === "text") {
                console.log(block.text);
            }
        }
    } catch (error) {
        // ================ 2.3 错误处理 ================
        // 捕获 API 请求或响应处理中的所有错误
        // 常见错误类型：
        // - API 连接错误（网络问题、基础 URL 配置错误）
        // - 认证错误（API Key 无效或未设置）
        // - 请求错误（模型名称错误、参数超限等）
        // - 速率限制（请求过于频繁）
        console.error("API 请求失败:", error);
        process.exit(1);  // 以非零状态码退出，标识程序异常终止
    }
}

// ==================== 3. 入口执行 ====================
// 调用主函数启动程序
// 使用 async/await 确保异步请求完成后再退出进程
main();