"use client"

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2, MessageSquare, Loader2 } from "lucide-react";

// Replace with your actual backend URL
const socket = io("http://localhost:5000");

const MESSAGES_PER_LOAD = 20;

// Simulate fetching older messages (replace with your API)
const fetchOlderMessages = async (oldestId) => {
  if (oldestId <= 1) return [];
  const start = Math.max(1, oldestId - MESSAGES_PER_LOAD);
  const messages = [];
  for (let i = oldestId - 1; i >= start; i--) {
    messages.unshift({
      id: i,
      text: `Older message #${i}`,
      isUser: i % 2 === 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }
  return messages;
};

// Simulate chat history (replace with your API if needed)
const initialChatHistory = [
  {
    id: 1,
    title: "Welcome Chat",
    lastMessage: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    messages: [
      {
        id: 1,
        text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  }
];

const Chat = () => {
  const [messages, setMessages] = useState(initialChatHistory[0].messages);
  const [inputMessage, setInputMessage] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [activeChatId, setActiveChatId] = useState(initialChatHistory[0].id);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Scroll to bottom when new message arrives (except on initial mount)
  useEffect(() => {
    if (!isInitialMount.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    isInitialMount.current = false;
  }, [messages, isAIResponding]);

  // Listen for AI responses
  useEffect(() => {
    socket.on("aiResponse", (response) => {
      setIsAIResponding(false);
      setMessages(prev => {
        const newMsg = {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          text: response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        updateChatHistory(activeChatId, [...prev, newMsg]);
        return [...prev, newMsg];
      });
    });

    return () => {
      socket.off("aiResponse");
    };
    // eslint-disable-next-line
  }, [activeChatId]);

  // Infinite scroll up handler
  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && hasMore && !loadingOlder) {
      setLoadingOlder(true);
      const oldestId = messages[0]?.id || 1;
      const olderMessages = await fetchOlderMessages(oldestId);
      if (olderMessages.length === 0) {
        setHasMore(false);
      } else {
        setMessages(prev => [...olderMessages, ...prev]);
        updateChatHistory(activeChatId, [...olderMessages, ...messages]);
      }
      setLoadingOlder(false);
      // Maintain scroll position after loading more
      if (container) {
        container.scrollTop = 1;
      }
    }
  };

  // Update chat history with new messages
  const updateChatHistory = (chatId, newMessages) => {
    setChatHistory(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
            ...chat,
            messages: newMessages,
            lastMessage: newMessages[newMessages.length - 1]?.text || "",
            timestamp: newMessages[newMessages.length - 1]?.timestamp || ""
          }
          : chat
      )
    );
  };

  // Send message
  const sendMessage = () => {
    if (inputMessage.trim()) {
      setMessages(prev => {
        const newMsg = {
          id: prev.length ? prev[prev.length - 1].id + 1 : 1,
          text: inputMessage,
          isUser: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        updateChatHistory(activeChatId, [...prev, newMsg]);
        return [...prev, newMsg];
      });
      socket.emit("userMessage", inputMessage);
      setInputMessage("");
      setIsAIResponding(true);
    }
  };

  // Clear chat (resets current chat)
  const clearChat = () => {
    setMessages([
      {
        id: 1,
        text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setHasMore(true);
    updateChatHistory(activeChatId, [
      {
        id: 1,
        text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Start a new chat
  const startNewChat = () => {
    const newId = chatHistory.length ? chatHistory[chatHistory.length - 1].id + 1 : 1;
    const welcomeMsg = {
      id: 1,
      text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const newChat = {
      id: newId,
      title: `Chat #${newId}`,
      lastMessage: welcomeMsg.text,
      timestamp: welcomeMsg.timestamp,
      messages: [welcomeMsg]
    };
    setChatHistory(prev => [...prev, newChat]);
    setActiveChatId(newId);
    setMessages([welcomeMsg]);
    setHasMore(true);
  };

  // Switch chat
  const switchChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages);
      setHasMore(true);
    }
  };

  return (
    <div className="h-full max-h-[calc(100vh-200px)] flex">
      {/* Sidebar for chat history */}
      <aside className="w-64 bg-slate-100 border-r flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={startNewChat} className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chatHistory.map((chat) => (
            <div
              key={chat.id}
              onClick={() => switchChat(chat.id)}
              className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${activeChatId === chat.id
                  ? "bg-blue-100 border border-blue-200"
                  : "hover:bg-slate-200"
                }`}
            >
              <div className="font-medium text-sm truncate">{chat.title}</div>
              <div className="text-xs text-slate-600 truncate">{chat.lastMessage}</div>
              <div className="text-xs text-slate-500">{chat.timestamp}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {chatHistory.find(c => c.id === activeChatId)?.title || "Chat"}
          </h2>
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ height: "500px", maxHeight: "60vh" }} // Fixed height, scrollable
          onScroll={handleScroll}
        >
          {loadingOlder && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              <span className="ml-2 text-slate-500">Loading more...</span>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isUser
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-900"
                  }`}
              >
                <div className="text-sm">{message.text}</div>
                <div className={`text-xs mt-1 ${message.isUser ? "text-blue-100" : "text-slate-500"
                  }`}>
                  {message.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isAIResponding && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  <span className="text-sm text-slate-600">AI is thinking...</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              disabled={isAIResponding}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isAIResponding}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
