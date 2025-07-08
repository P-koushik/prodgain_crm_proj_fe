"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Trash2,
  MessageSquare,
  Loader2,
  Database,
} from "lucide-react";
import { auth } from "@/firebase";
import { getIdToken } from "firebase/auth";
import { v4 as uuidv4 } from "uuid";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isClearingChat, setIsClearingChat] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Get auth token
  const getAuthToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");
    return await getIdToken(currentUser);
  };

  // Generate a better chat title based on first message
  const generateChatTitle = (firstMessage) => {
    if (!firstMessage) return "New Chat";

    // Take first 30 characters and add ellipsis if longer
    const title =
      firstMessage.length > 30
        ? firstMessage.substring(0, 30) + "..."
        : firstMessage;

    return title;
  };

  // Fetch chat history from backend
  const fetchChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/history`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          createInitialChat();
          return;
        }
        throw new Error("Failed to fetch chat history");
      }

      const data = (await response.json()) || [];
      console.log("Fetched chat data:", data);

      if (data.length === 0) {
        createInitialChat();
        return;
      }

      // Transform the data to match frontend format
      const chatHistoryArray = data.map((conversation) => ({
        id: conversation.conversationId,
        title:
          conversation.title ||
          generateChatTitle(conversation.messages[0]?.message),
        lastMessage:
          conversation.messages[conversation.messages.length - 1]?.message ||
          "",
        timestamp:
          conversation.messages[conversation.messages.length - 1]?.timestamp ||
          conversation.updatedAt,
        hasCRMContext: conversation.hasCRMContext || false,
        messages: conversation.messages.map((msg) => ({
          id: msg._id || uuidv4(),
          text: msg.message,
          isUser: msg.sender === "user",
          timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
      }));

      setChatHistory(chatHistoryArray);

      // Set the first chat as active if no active chat
      if (chatHistoryArray.length > 0 && !activeChatId) {
        const firstChat = chatHistoryArray[0];
        setActiveChatId(firstChat.id);
        setMessages(firstChat.messages);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      createInitialChat();
    } finally {
      setLoadingHistory(false);
      setIsInitialLoad(false);
    }
  };

  // Create initial welcome chat
  const createInitialChat = () => {
    const welcomeMsg = {
      id: uuidv4(),
      text: "Hello! I'm your AI assistant with access to your CRM data. I can help you with:\n\n• Finding specific contacts or companies\n• Analyzing your contact data\n• Suggesting follow-up actions\n• Managing tags and organization\n• Tracking activities and interactions\n\nWhat would you like to know about your CRM?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      lastMessage: welcomeMsg.text,
      timestamp: new Date().toISOString(),
      hasCRMContext: true,
      messages: [welcomeMsg],
    };

    setChatHistory([newChat]);
    setActiveChatId(newChatId);
    setMessages([welcomeMsg]);
  };

  // Send message to API
  const sendMessageToAPI = async (messageText, conversationId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversationId: conversationId,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();
      return {
        response: data.response,
        crmDataIncluded: data.crmDataIncluded,
      };
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Clear chat - delete conversation from backend
  const clearChat = async () => {
    if (!activeChatId) return;
    
    try {
      setIsClearingChat(true);
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversation/${activeChatId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Remove the chat from chat history
        setChatHistory(prev => prev.filter(chat => chat.id !== activeChatId));
        
        // If there are other chats, switch to the first one
        const remainingChats = chatHistory.filter(chat => chat.id !== activeChatId);
        if (remainingChats.length > 0) {
          const firstChat = remainingChats[0];
          setActiveChatId(firstChat.id);
          setMessages(firstChat.messages);
        } else {
          // No chats left, create a new one
          createInitialChat();
        }
      } else {
        throw new Error("Failed to delete conversation");
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
      // Fallback: just clear the current chat locally
      const welcomeMsg = {
        id: uuidv4(),
        text: "Hello! I'm your AI assistant with access to your CRM data. How can I help you today?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages([welcomeMsg]);
      updateChatHistory(activeChatId, [welcomeMsg]);
    } finally {
      setIsClearingChat(false);
    }
  };

  // Load initial chat history
  useEffect(() => {
    if (auth.currentUser) {
      fetchChatHistory();
    }
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (!isInitialMount.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    isInitialMount.current = false;
  }, [messages, isAIResponding]);

  // Update chat history with new messages
  const updateChatHistory = (chatId, newMessages) => {
    setChatHistory((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: newMessages,
              lastMessage: newMessages[newMessages.length - 1]?.text || "",
              timestamp: new Date().toISOString(),
              title:
                chat.title === "New Chat" && newMessages.length > 1
                  ? generateChatTitle(
                      newMessages.find((msg) => msg.isUser)?.text
                    )
                  : chat.title,
            }
          : chat
      )
    );
  };

  // Send message
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: uuidv4(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Add user message to UI
    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      updateChatHistory(activeChatId, newMessages);
      return newMessages;
    });

    const currentMessage = inputMessage;
    setInputMessage("");
    setIsAIResponding(true);

    try {
      // Send to API and get response
      const result = await sendMessageToAPI(currentMessage, activeChatId);

      // Add AI response to UI
      const aiMessage = {
        id: uuidv4(),
        text: result.response,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => {
        const newMessages = [...prev, aiMessage];
        updateChatHistory(activeChatId, newMessages);
        return newMessages;
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage = {
        id: uuidv4(),
        text: "Sorry, I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => {
        const newMessages = [...prev, errorMessage];
        updateChatHistory(activeChatId, newMessages);
        return newMessages;
      });
    } finally {
      setIsAIResponding(false);
    }
  };

  // Start a new chat
  const startNewChat = () => {
    const welcomeMsg = {
      id: uuidv4(),
      text: "Hello! I'm your AI assistant with access to your CRM data. How can I help you today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      lastMessage: welcomeMsg.text,
      timestamp: new Date().toISOString(),
      hasCRMContext: true,
      messages: [welcomeMsg],
    };

    setChatHistory((prev) => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setMessages([welcomeMsg]);
  };

  // Switch to different chat
  const switchChat = (chatId) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      setActiveChatId(chatId);
      setMessages(chat.messages);
    }
  };

  if (isInitialLoad) {
    return (
      <div className="h-full max-h-[calc(100vh-200px)] flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading chat history...</span>
        </div>
      </div>
    );
  }

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
          {loadingHistory ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                  activeChatId === chat.id
                    ? "bg-blue-100 border border-blue-200"
                    : "hover:bg-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm truncate">
                    {chat.title}
                  </div>
                  {chat.hasCRMContext && (
                    <Database
                      className="h-3 w-3 text-green-600"
                      title="CRM Context Enabled"
                    />
                  )}
                </div>
                <div className="text-xs text-slate-600 truncate">
                  {chat.lastMessage}
                </div>
                <div className="text-xs text-slate-500">
                  {chat.timestamp && new Date(chat.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold">
              {chatHistory.find((c) => c.id === activeChatId)?.title || "Chat"}
            </h2>
            {chatHistory.find((c) => c.id === activeChatId)?.hasCRMContext && (
              <div className="flex items-center space-x-1 text-green-600">
                <Database className="h-4 w-4" />
                <span className="text-xs">CRM Connected</span>
              </div>
            )}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearChat}
              disabled={isClearingChat}
            >
              {isClearingChat ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Chat
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ height: "500px", maxHeight: "60vh" }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.text}
                </div>
                <div
                  className={`text-xs mt-1 ${
                    message.isUser ? "text-blue-100" : "text-slate-500"
                  }`}
                >
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
                  <span className="text-sm text-slate-600">
                    AI is analyzing your CRM data...
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
              placeholder="Ask me about your contacts, activities, or CRM data..."
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