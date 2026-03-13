/**
 * PrimeChat Global State Provider
 * 
 * Manages all application-wide state including authentication,
 * user profile, conversation list, active chat, messages,
 * and WebSocket connectivity. Wraps the entire app via React Context.
 * 
 * @module PrimeChatProvider
 */

import primeChatContext from "./chatContext";
import { useState, useEffect } from "react";
import io from "socket.io-client";

/** Base URL for all API requests — falls back to localhost for development */
const apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:5500";

/** Persistent WebSocket connection to the PrimeChat server */
var socketConnection = io(apiBaseUrl);

/**
 * PrimeChatProvider - Root state management component.
 * Provides authentication state, conversation data, and socket
 * connection to all child components via React Context.
 */
const PrimeChatProvider = (props) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("token") ? true : false
  );
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("user") || {});
  const [activeRecipient, setActiveRecipient] = useState({});
  const [messageList, setMessageList] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [conversationList, setConversationList] = useState([]);
  const [originalConversationList, setOriginalConversationList] = useState([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  /**
   * Fetches the user's conversation list from the server.
   * Called on initial load and after creating new conversations.
   */
  const loadConversationList = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/conversation/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations: " + (await response.text()));
      }

      const conversationData = await response.json();
      setConversationList(conversationData);
      setOriginalConversationList(conversationData);
    } catch (fetchError) {
      console.log("Conversation list error:", fetchError);
    } finally {
      setIsAppLoading(false);
    }
  };

  // Listen for real-time online/offline presence updates
  useEffect(() => {
    socketConnection.on("receiver-online", () => {
      setActiveRecipient((prev) => ({ ...prev, isOnline: true }));
    });
  }, []);

  useEffect(() => {
    socketConnection.on("receiver-offline", () => {
      setActiveRecipient((prev) => ({
        ...prev,
        isOnline: false,
        lastSeen: new Date().toISOString(),
      }));
    });
  }, []);

  // Restore user session from stored token on app startup
  useEffect(() => {
    const restoreUserSession = async () => {
      try {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
          const sessionResponse = await fetch(`${apiBaseUrl}/auth/me`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "auth-token": storedToken,
            },
          });

          if (!sessionResponse.ok) {
            throw new Error("Session expired or invalid token");
          }

          const userData = await sessionResponse.json();
          setCurrentUser(userData);
          console.log("User session restored");
          setIsAuthenticated(true);
          socketConnection.emit("setup", await userData._id);
        } else {
          setIsAppLoading(false);
        }
      } catch (sessionError) {
        console.log("Session restore error:", sessionError);
        setIsAuthenticated(false);
        setCurrentUser({});
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    };

    restoreUserSession();
    loadConversationList();
  }, []);

  return (
    <primeChatContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        user: currentUser,
        setUser: setCurrentUser,
        receiver: activeRecipient,
        setReceiver: setActiveRecipient,
        messageList,
        setMessageList,
        activeChatId,
        setActiveChatId,
        myChatList: conversationList,
        setMyChatList: setConversationList,
        originalChatList: originalConversationList,
        fetchData: loadConversationList,
        hostName: apiBaseUrl,
        socket: socketConnection,
        isOtherUserTyping,
        setIsOtherUserTyping,
        isChatLoading,
        setIsChatLoading,
        isLoading: isAppLoading,
        setIsLoading: setIsAppLoading,
      }}
    >
      {props.children}
    </primeChatContext.Provider>
  );
};

export default PrimeChatProvider;
