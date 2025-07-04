"use client"

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, MessageSquare, Loader2 } from "lucide-react";
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

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialMount = useRef(true);

  // Get auth token
  const getAuthToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");
    return await getIdToken(currentUser);
  };

  // Fetch chat history from backend
  const fetchChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}chat/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        credentials: "include"
      });

      if (!response.ok) throw new Error("Failed to fetch chat history");
      
      const data = await response.json() || [];
      
      // Group messages by conversation ID and create chat history
      const conversationsMap = new Map();
      
       data.forEach(conversation => {
        conversationsMap.set(conversation?.conversationId, {
          id: conversation?.conversationId,
          title: `Chat - ${new Date(conversation?.messages[0]?.timestamp).toLocaleDateString()}`,
          lastMessage: conversation.messages[conversation?.messages.length - 1]?.message || "",
          timestamp: conversation.messages[conversation.messages.length - 1]?.timestamp || "",
          messages: conversation.messages.map(msg => ({
            id: msg._id || uuidv4(),
            text: msg.message,
            isUser: msg.sender === "user",
            timestamp: new Date(msg.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          }))
        });
      });

      const chatHistoryArray = Array.from(conversationsMap.values());
      setChatHistory(chatHistoryArray);
      
      // If no active chat and we have chats, set the first one as active
      if (chatHistoryArray.length > 0 && !activeChatId) {
        const firstChat = chatHistoryArray[0];
        setActiveChatId(firstChat.id);
        setMessages(firstChat.messages);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      // If no history exists, create initial welcome chat
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
      text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      lastMessage: welcomeMsg.text,
      timestamp: welcomeMsg.timestamp,
      messages: [welcomeMsg]
    };
    
    setChatHistory([newChat]);
    setActiveChatId(newChatId);
    setMessages([welcomeMsg]);
  };
  

  // Send message to API
  const sendMessageToAPI = async (messageText, conversationId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: messageText,
          conversationId: conversationId 
        })
      });

      if (!response.ok) throw new Error("Failed to send message");
      
      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
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
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: uuidv4(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message to UI
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      updateChatHistory(activeChatId, newMessages);
      return newMessages;
    });

    const currentMessage = inputMessage;
    setInputMessage("");
    setIsAIResponding(true);

    try {
      // Send to API and get response
      const aiResponse = await sendMessageToAPI(currentMessage, activeChatId);
      
      // Add AI response to UI
      const aiMessage = {
        id: uuidv4(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => {
        const newMessages = [...prev, aiMessage];
        updateChatHistory(activeChatId, newMessages);
        return newMessages;
      });
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Add error message to UI
      const errorMessage = {
        id: uuidv4(),
        text: "Sorry, I'm having trouble responding right now. Please try again.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        updateChatHistory(activeChatId, newMessages);
        return newMessages;
      });
    } finally {
      setIsAIResponding(false);
    }
  };

  // Clear current chat
  const clearChat = () => {
    const welcomeMsg = {
      id: uuidv4(),
      text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([welcomeMsg]);
    updateChatHistory(activeChatId, [welcomeMsg]);
  };

  // Start a new chat
  const startNewChat = () => {
    const welcomeMsg = {
      id: uuidv4(),
      text: "Hello! I'm your AI assistant. How can I help you with your CRM today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      title: "New Chat",
      lastMessage: welcomeMsg.text,
      timestamp: welcomeMsg.timestamp,
      messages: [welcomeMsg]
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setMessages([welcomeMsg]);
  };

  // Switch to different chat
  const switchChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
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
                <div className="font-medium text-sm truncate">{chat.title}</div>
                <div className="text-xs text-slate-600 truncate">{chat.lastMessage}</div>
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
          style={{ height: "500px", maxHeight: "60vh" }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isUser
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <div className="text-sm">{message.text}</div>
                <div className={`text-xs mt-1 ${
                  message.isUser ? "text-blue-100" : "text-slate-500"
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