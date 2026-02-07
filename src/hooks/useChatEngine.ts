import { useState, useCallback } from "react";
import type { UploadedFile } from "../components/FileUploadPanel";
import type { ChatMessage } from "../components/ChatArea";

interface ChatSession {
  id: string;
  name: string;
  fileName?: string;
  timestamp: Date;
  messages: ChatMessage[];
  file: UploadedFile | null;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const generateMockResponse = (question: string, file: UploadedFile | null): { content: string; table?: ChatMessage["table"] } => {
  if (!file) {
    return {
      content: "Please upload an Excel file first so I can analyze your data. Click the upload button in the sidebar or the attachment icon below to get started!",
    };
  }

  const q = question.toLowerCase();

  if (q.includes("summary") || q.includes("overview") || q.includes("describe")) {
    return {
      content: `Here's a summary of your data from **${file.name}** (Sheet: ${file.selectedSheet}):\n\n📊 **Dataset Overview**\n• Total Rows: ${file.rowCount}\n• Total Columns: ${file.headers.length}\n• Columns: ${file.headers.join(", ")}\n\nThe data appears to be well-structured. You can ask me specific questions about any column or request calculations!`,
    };
  }

  if (q.includes("column") || q.includes("header") || q.includes("field")) {
    return {
      content: `Your dataset contains **${file.headers.length} columns**:\n\n${file.headers.map((h, i) => `${i + 1}. **${h}**`).join("\n")}\n\nWould you like me to analyze any specific column?`,
    };
  }

  if (q.includes("row") || q.includes("count") || q.includes("how many")) {
    return {
      content: `Your dataset contains **${file.rowCount} rows** of data across **${file.headers.length} columns** in the "${file.selectedSheet}" sheet.`,
    };
  }

  if (q.includes("show") || q.includes("preview") || q.includes("sample") || q.includes("first")) {
    const previewRows = file.data.slice(0, 5);
    return {
      content: `Here's a preview of the first ${Math.min(5, file.data.length)} rows from your data:`,
      table: {
        headers: file.headers,
        rows: previewRows,
      },
    };
  }

  if (q.includes("last")) {
    const lastRows = file.data.slice(-5);
    return {
      content: `Here are the last ${Math.min(5, file.data.length)} rows from your data:`,
      table: {
        headers: file.headers,
        rows: lastRows,
      },
    };
  }

  // Default
  return {
    content: `Great question about your data! Based on the "${file.selectedSheet}" sheet in **${file.name}**, here's what I found:\n\n📋 Your dataset has **${file.rowCount} records** with columns: ${file.headers.slice(0, 5).join(", ")}${file.headers.length > 5 ? ` and ${file.headers.length - 5} more` : ""}.\n\nTry asking me to:\n• "Show me a summary"\n• "Preview the first rows"\n• "What columns are available?"\n• "How many rows are there?"`,
  };
};

export const useChatEngine = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: "default",
      name: "Welcome Chat",
      timestamp: new Date(),
      messages: [],
      file: null,
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState("default");
  const [isTyping, setIsTyping] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const updateSession = useCallback(
    (id: string, updater: (s: ChatSession) => ChatSession) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
    },
    []
  );

  const createNewChat = useCallback(() => {
    const newId = generateId();
    const newSession: ChatSession = {
      id: newId,
      name: "New Chat",
      timestamp: new Date(),
      messages: [],
      file: null,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
  }, []);

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        if (filtered.length === 0) {
          const fallback: ChatSession = {
            id: generateId(),
            name: "New Chat",
            timestamp: new Date(),
            messages: [],
            file: null,
          };
          setActiveSessionId(fallback.id);
          return [fallback];
        }
        if (activeSessionId === id) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeSessionId]
  );

  const setFile = useCallback(
    (file: UploadedFile) => {
      const sysMsg: ChatMessage = {
        id: generateId(),
        role: "ai",
        content: `📁 **${file.name}** loaded successfully!\n\n• Sheet: **${file.selectedSheet}**\n• Rows: **${file.rowCount}**\n• Columns: **${file.headers.length}** (${file.headers.slice(0, 4).join(", ")}${file.headers.length > 4 ? "..." : ""})\n\nI'm ready to analyze your data. What would you like to know?`,
        timestamp: new Date(),
      };

      updateSession(activeSessionId, (s) => ({
        ...s,
        messages: [...s.messages, sysMsg],
        file,
        fileName: file.name,
        name: file.name.replace(/\.(xlsx|xls|csv)$/i, ""),
      }));
    },
    [activeSessionId, updateSession]
  );

  const sendMessage = useCallback(
    (content: string) => {
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      updateSession(activeSessionId, (s) => ({
        ...s,
        messages: [...s.messages, userMsg],
      }));

      setIsTyping(true);

      // Use functional update to get current file from session state
      setTimeout(() => {
        setSessions((prev) => {
          const session = prev.find((s) => s.id === activeSessionId);
          const response = generateMockResponse(content, session?.file || null);
          const aiMsg: ChatMessage = {
            id: generateId(),
            role: "ai",
            content: response.content,
            timestamp: new Date(),
            table: response.table,
          };

          return prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, messages: [...s.messages, aiMsg] }
              : s
          );
        });

        setIsTyping(false);
      }, 1200 + Math.random() * 800);
    },
    [activeSessionId, updateSession]
  );

  return {
    sessions: sessions.map(({ id, name, fileName, timestamp }) => ({ id, name, fileName, timestamp })),
    activeSessionId,
    activeMessages: activeSession.messages,
    currentFile: activeSession.file,
    isTyping,
    createNewChat,
    setActiveSessionId,
    deleteSession,
    setFile,
    sendMessage,
  };
};
