
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const activeChat = chats.find(
  (chat) => chat.id === activeChatId
);

const messages = activeChat?.messages ?? [];

  // Protect the workspace
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  // Load saved chats
  useEffect(() => {
    if (isPending || !session) return;

    try {
      const storageKey = `nexus-chats-${session.user.id}`;
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setChats(parsed);

          if (parsed.length > 0) {
            setActiveChatId(parsed[0].id);
          }
        }
      } else {
        // Migrate previous conversation
        const oldSaved = localStorage.getItem("nexus-chats");

        if (oldSaved) {
          const oldChats = JSON.parse(oldSaved);

          if (Array.isArray(oldChats)) {
            setChats(oldChats);

            if (oldChats.length > 0) {
              setActiveChatId(oldChats[0].id);
            }

            localStorage.setItem(
              storageKey,
              JSON.stringify(oldChats)
            );
          }
        } else {
          const oldHistory = localStorage.getItem(
            "nexus-chat-history"
          );

          if (oldHistory) {
            const oldMessages = JSON.parse(oldHistory);

            if (
              Array.isArray(oldMessages) &&
              oldMessages.length > 0
            ) {
              const oldChat: Chat = {
                id: crypto.randomUUID(),
                title: "Previous Conversation",
                messages: oldMessages,
              };

              setChats([oldChat]);
              setActiveChatId(oldChat.id);
            }
          }
        }
      }
    } catch {
      console.error("Could not load NEXUS chats.");
    }

    setHydrated(true);
  }, [isPending, session]);

  // Save chats separately for each signed-in user
  useEffect(() => {
    if (hydrated && session) {
      localStorage.setItem(
        `nexus-chats-${session.user.id}`,
        JSON.stringify(chats)
      );
    }
  }, [chats, hydrated, session]);

  // Create new conversation
  function handleNewChat() {
    if (loading) return;

    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
    };

    setChats((previous) => [newChat, ...previous]);
    setActiveChatId(newChat.id);
    setMessage("");
    setError("");
  }

  // Rename conversation
  function handleRename(chat: Chat) {
    const newTitle = window.prompt(
      "Enter a new conversation name:",
      chat.title
    );

    if (!newTitle?.trim()) return;

    setChats((previous) =>
      previous.map((item) =>
        item.id === chat.id
          ? { ...item, title: newTitle.trim() }
          : item
      )
    );
  }

  // Delete conversation
  function handleDelete(chatId: string) {
    if (loading) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    const remaining = chats.filter(
      (chat) => chat.id !== chatId
    );

    setChats(remaining);

    if (activeChatId === chatId) {
      setActiveChatId(remaining[0]?.id ?? "");
    }

    setError("");
  }

  // Send message to NEXUS AI
  async function handleSend() {
    if (!message.trim() || loading) return;

    let chatId = activeChatId;

    if (!chatId) {
      const newChat: Chat = {
        id: crypto.randomUUID(),
        title: "New Chat",
        messages: [],
      };

      chatId = newChat.id;
      setChats((previous) => [newChat, ...previous]);
      setActiveChatId(chatId);
    }

    const userMessage = message.trim();

    const currentChat = chats.find(
      (chat) => chat.id === chatId
    );

    const conversation: ChatMessage[] = [
      ...(currentChat?.messages ?? []),
      { role: "user", content: userMessage },
    ];

    setChats((previous) =>
      previous.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title:
                chat.messages.length === 0
                  ? userMessage.slice(0, 35)
                  : chat.title,
              messages: conversation,
            }
          : chat
      )
    );

    setMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/nexus-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong."
        );
      }

      setChats((previous) =>
        previous.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: "assistant",
                    content: data.reply,
                  },
                ],
              }
            : chat
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed."
      );
    } finally {
      setLoading(false);
    }
  }

  // Loading screen and login protection
  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d18] text-cyan-400">
        Checking NEXUS login...
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d18] text-cyan-400">
        Loading your NEXUS workspace...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#090d18] text-white flex">

      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-gray-800 p-5 flex flex-col">

        <h1 className="text-2xl font-bold text-cyan-400">
          NEXUS
        </h1>

        <p className="text-xs text-gray-500 mt-1">
          AI OPERATING SYSTEM
        </p>

        <button
          onClick={handleNewChat}
          disabled={loading}
          className="w-full mt-8 rounded-xl bg-cyan-500 p-3 text-black font-semibold hover:bg-cyan-400 disabled:opacity-50"
        >
          + New Chat
        </button>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
            Chat History
          </p>

          <div className="space-y-2 max-h-[55vh] overflow-y-auto">

            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`rounded-lg p-2 flex items-center gap-2 ${
                  activeChatId === chat.id
                    ? "bg-[#1c2b40] border border-cyan-800"
                    : "hover:bg-[#172033]"
                }`}
              >
                <button
                  onClick={() => {
                    if (loading) return;
                    setActiveChatId(chat.id);
                    setError("");
                    setMessage("");
                  }}
                  className="flex-1 text-left text-sm truncate"
                >
                  {chat.title}
                </button>

                <button
                  onClick={() => handleRename(chat)}
                  disabled={loading}
                  title="Rename chat"
                  className="text-gray-400 hover:text-cyan-400"
                >
                  ✎
                </button>

                <button
                  onClick={() => handleDelete(chat.id)}
                  disabled={loading}
                  title="Delete chat"
                  className="text-gray-400 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}

            {chats.length === 0 && (
              <p className="text-sm text-gray-600">
                No conversations yet.
              </p>
            )}

          </div>
        </div>

        <div className="mt-auto border-t border-gray-800 pt-5 text-sm text-gray-500">
          Your intelligent workspace
        </div>

        <button
          onClick={async () => {
            await authClient.signOut();
            router.replace("/login");
          }}
          className="mt-4 w-full rounded-lg border border-gray-700 p-3 text-gray-300 hover:bg-gray-800"
        >
          Sign Out
        </button>

      </aside>

      {/* Main Chat Area */}
      <section className="flex-1 flex flex-col items-center p-8 overflow-y-auto">

        <div className="w-full max-w-3xl">

          <p className="text-center text-cyan-400 text-sm mb-5">
            YOUR PERSONAL AI PLATFORM
          </p>

          <h2 className="text-4xl font-bold text-center">
            {messages.length > 0
              ? activeChat?.title
              : "Welcome to NEXUS"}
          </h2>

          <p className="text-gray-400 text-center mt-5 text-lg">
            One intelligent platform. Unlimited possibilities.
          </p>

          {/* Messages */}
          <div className="mt-12 space-y-5">

            {messages.map((item, index) => (
              <div
                key={index}
                className={`rounded-2xl border p-5 ${
                  item.role === "user"
                    ? "border-gray-700 bg-[#172033] ml-12"
                    : "border-cyan-800 bg-[#111827] mr-12"
                }`}
              >
                <p className="font-semibold text-cyan-400">
                  {item.role === "user" ? "YOU" : "NEXUS AI"}
                </p>

                <p className="mt-2 text-gray-300 whitespace-pre-wrap">
                  {item.content}
                </p>
              </div>
            ))}

            {messages.length === 0 && (
              <p className="text-center text-gray-500 mt-16">
                Start a new conversation with NEXUS.
              </p>
            )}

            {loading && (
              <p className="text-cyan-400 animate-pulse">
                NEXUS is thinking...
              </p>
            )}

          </div>

          {/* Message Input */}
          <div className="mt-10 rounded-2xl border border-gray-700 bg-[#111827] p-4">

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask NEXUS anything..."
              className="w-full h-28 bg-transparent outline-none resize-none text-white placeholder-gray-500"
            />

            {error && (
              <div className="mb-4 rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setMessage("")}
                className="rounded-lg border border-gray-600 px-6 py-2 text-white"
              >
                Clear
              </button>

              <button
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className="rounded-lg bg-cyan-500 px-6 py-2 text-black font-semibold disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Send"}
              </button>

            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            NEXUS AI OS — Built for the future.
          </p>

        </div>
      </section>
    </main>
  );
}
