
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Please provide a conversation." },
        { status: 400 }
      );
    }

    const validMessages = messages.filter(
      (item: ChatMessage) =>
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0
    );

    if (validMessages.length !== messages.length) {
      return Response.json(
        { error: "Invalid conversation messages." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "http://127.0.0.1:11434/api/chat",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen2.5:7b",
          stream: false,
          messages: [
            {
              role: "system",
              content:
                "You are NEXUS, an intelligent AI assistant for individuals and businesses. You specialize in business analysis, technology, research, productivity, financial analysis, and problem solving. Always identify yourself as NEXUS. Use previous conversation messages to understand follow-up questions. Give clear, accurate and practical answers. Never invent facts or claim to have performed actions you have not performed.",
            },
            ...validMessages.map((item: ChatMessage) => ({
              role: item.role,
              content: item.content.trim(),
            })),
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Ollama returned status ${response.status}`);
    }

    const data = await response.json();

    return Response.json({
      reply: data.message.content,
    });
  } catch (error) {
    console.error("NEXUS local AI error:", error);

    return Response.json(
      {
        error:
          "NEXUS could not connect to the local AI model. Make sure Ollama is running.",
      },
      { status: 500 }
    );
  }
}
Get-Content "C:\Users\pilla\OneDrive\Desktop\NEXUS-AI-OS\web\app\api\nexus-chat\route.ts"