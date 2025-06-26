"use client"

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Trash2, MessageSquare } from "lucide-react";

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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Scroll to bottom when new message arrives (except on initial mount)
  useEffect(() => {
    if (!isInitialMount.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    isInitialMount.current = false;
  }, [messages]);

  // Listen for AI responses
  useEffect(() => {
    socket.on("aiResponse", (response) => {
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

  // Infinite scroll handler
  const handleScroll = async () => {
    const container = messagesContainerRef.current;
    if (container && container.scrollTop === 0 && hasMore) {
      const oldestId = messages[0]?.id || 1;
      const olderMessages = await fetchOlderMessages(oldestId);
      if (olderMessages.length === 0) {
        setHasMore(false);
        return;
      }
      setMessages(prev => [...olderMessages, ...prev]);
      updateChatHistory(activeChatId, [...olderMessages, ...messages]);
      setTimeout(() => {
        if (container) {
          container.scrollTop = container.scrollHeight / 3;
        }
      }, 0);
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
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Chat History
          </span>
          <Button size="sm" variant="outline" onClick={startNewChat}>
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              className={`p-4 border-b cursor-pointer hover:bg-slate-200 ${chat.id === activeChatId ? "bg-slate-300" : ""
                }`}
              onClick={() => switchChat(chat.id)}
            >
              <div className="font-medium truncate">{chat.title}</div>
              <div className="text-xs text-slate-500 truncate">{chat.lastMessage}</div>
              <div className="text-xs text-slate-400">{chat.timestamp}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 pl-0 sm:pl-6">
        <div className="flex justify-between items-center mb-6 mt-4 sm:mt-0">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              AI Assistant
            </h1>
            <p className="text-slate-600 mt-2">Get help with your CRM tasks</p>
          </div>
          <Button variant="outline" onClick={clearChat}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        </div>

        <Card className="h-[calc(100vh-300px)] flex flex-col">
          <CardHeader>
            <CardTitle>Chat with AI Assistant</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {/* Messages Area with Infinite Scroll */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto space-y-4 mb-4"
              style={{ minHeight: 0 }}
              onScroll={handleScroll}
            >
              {hasMore && (
                <div className="text-center text-xs text-slate-400 py-2">
                  Loading more...
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[70%] ${message.isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={message.isUser ? "bg-blue-500 text-white" : "bg-purple-500 text-white"}>
                        {message.isUser ? "U" : "AI"}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`p-3 rounded-lg ${message.isUser
                        ? "bg-blue-500 text-white ml-2"
                        : "bg-slate-100 text-slate-900 mr-2"
                      }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.isUser ? "text-blue-100" : "text-slate-500"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex space-x-2">
              <Input
                placeholder="Ask me anything about your CRM..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
