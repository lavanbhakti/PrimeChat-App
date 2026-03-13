/**
 * PrimeChat Chat Area Component
 * 
 * Displays the active conversation's message history, input field,
 * typing indicators, and image upload functionality.
 * Supports markdown rendering, message scrolling, and real-time updates.
 * 
 * @module ChatArea
 */

import React, { useContext, useEffect, useState, useRef } from "react";
import {
  Box,
  Flex,
  Input,
  Button,
  Text,
  Spinner,
  Image,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, AttachmentIcon, ArrowUpIcon } from "@chakra-ui/icons";
import primeChatContext from "../../context/chatContext";
import ChatAreaTop from "./ChatAreaTop";
import SingleMessage from "./SingleMessage";
import { marked } from "marked";
import DOMPurify from "dompurify";

/** Custom scrollbar styling for the message container */
const customScrollStyles = {
  "&::-webkit-scrollbar": {
    width: "5px",
    height: "5px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "gray.300",
    borderRadius: "5px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "gray.400",
  },
  "&::-webkit-scrollbar-track": {
    display: "none",
  },
};

/**
 * Converts markdown text to sanitized HTML for safe rendering.
 * Used to display code blocks, bold text, links, etc. in chat messages.
 * 
 * @param {string} markdownText - Raw markdown string
 * @returns {{ __html: string }} React-compatible dangerouslySetInnerHTML object
 */
function renderMarkdownContent(markdownText) {
  const rawHtml = marked(markdownText);
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  return { __html: cleanHtml };
}

const ChatArea = () => {
  const appContext = useContext(primeChatContext);
  const {
    hostName,
    user,
    socket,
    activeChatId,
    setActiveChatId,
    messageList,
    setMessageList,
    receiver,
    setReceiver,
    isChatLoading,
    isOtherUserTyping,
    setIsOtherUserTyping,
    myChatList,
    setMyChatList,
  } = appContext;

  const toast = useToast();
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Listen for incoming messages and typing events
  useEffect(() => {
    socket.on("receive-message", (incomingMessage) => {
      setMessageList((currentMessages) => [...currentMessages, incomingMessage]);

      setTimeout(() => {
        document.getElementById("chat-box")?.scrollTo({
          top: document.getElementById("chat-box").scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    });

    socket.on("typing", (typingPayload) => {
      if (typingPayload.typer !== user._id) {
        setIsOtherUserTyping(true);
      }
    });

    socket.on("stop-typing", (typingPayload) => {
      if (typingPayload.typer !== user._id) {
        setIsOtherUserTyping(false);
      }
    });

    socket.on("message-deleted", (deletionData) => {
      setMessageList((currentMessages) =>
        currentMessages.filter((msg) => msg._id !== deletionData.messageId)
      );
    });

    return () => {
      socket.off("receive-message");
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("message-deleted");
    };
  }, [socket, setMessageList, setIsOtherUserTyping, user._id]);

  /**
   * Removes a message from the displayed message list (for local deletion).
   */
  const removeMessageFromList = (messageId) => {
    setMessageList((currentMessages) =>
      currentMessages.filter((msg) => msg._id !== messageId)
    );
  };

  /**
   * Navigates back to the chat list on mobile view.
   */
  const goBackToChatList = async () => {
    await socket.emit("stop-typing", {
      typer: user._id,
      conversationId: activeChatId,
    });
    await socket.emit("leave-chat", activeChatId);
    setActiveChatId("");
    setReceiver({});
  };

  /**
   * Handles image file selection for attachment.
   */
  const handleImageSelection = (e) => {
    const chosenFile = e.target.files[0];
    if (chosenFile) {
      setSelectedImageFile(chosenFile);
      setImagePreview(URL.createObjectURL(chosenFile));
    }
  };

  /**
   * Uploads the selected image to S3 using a presigned URL.
   * @returns {string|null} The public URL of the uploaded image
   */
  const uploadImageToS3 = async () => {
    if (!selectedImageFile) return null;

    setIsUploading(true);
    try {
      // Get presigned URL from server
      const urlResponse = await fetch(
        `${hostName}/user/presigned-url?filename=${selectedImageFile.name}&filetype=${selectedImageFile.type}&type=chat`,
        {
          headers: {
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      const { url, fields } = await urlResponse.json();

      // Build and submit the S3 upload form
      const uploadFormData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        uploadFormData.append(key, value);
      });
      uploadFormData.append("file", selectedImageFile);

      const uploadResult = await fetch(url, {
        method: "POST",
        body: uploadFormData,
      });

      if (uploadResult.ok) {
        const resultXml = await uploadResult.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(resultXml, "text/xml");
        const publicUrl = xmlDoc.getElementsByTagName("Location")[0].textContent;

        setImagePreview(null);
        setSelectedImageFile(null);
        return decodeURIComponent(publicUrl);
      }
    } catch (uploadError) {
      console.error("Image upload error:", uploadError);
      toast({
        title: "Upload failed",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsUploading(false);
    }
    return null;
  };

  /**
   * Dispatches a chat message through the WebSocket connection.
   * Handles both text-only and text+image messages.
   */
  const dispatchChatMessage = async () => {
    const messageInput = document.getElementById("new-message");
    const messageText = messageInput?.value?.trim();

    if (!messageText && !selectedImageFile) return;

    let uploadedImageUrl = null;
    if (selectedImageFile) {
      uploadedImageUrl = await uploadImageToS3();
      if (!uploadedImageUrl && !messageText) return;
    }

    const messagePayload = {
      text: messageText || undefined,
      imageUrl: uploadedImageUrl || undefined,
      senderId: user._id,
      conversationId: activeChatId,
    };

    // Emit stop-typing indicator before sending
    socket.emit("stop-typing", {
      typer: user._id,
      conversationId: activeChatId,
    });

    socket.emit("send-message", messagePayload);

    // Update chat list preview text
    const previewText = messageText || "📷 Image";
    const updatedChatList = myChatList.map((chat) => {
      if (chat._id === activeChatId) {
        return { ...chat, latestmessage: previewText };
      }
      return chat;
    });
    setMyChatList(updatedChatList);

    // Clear input and image preview
    if (messageInput) {
      messageInput.value = "";
      messageInput.focus();
    }
    setImagePreview(null);
    setSelectedImageFile(null);
  };

  /** Debounce timer reference for typing indicator */
  let typingTimerRef;

  /**
   * Handles keyboard events in the message input:
   * - Enter key sends the message
   * - Other keys emit typing indicator with debounce
   */
  const handleKeyboardInput = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      dispatchChatMessage();
      return;
    }

    socket.emit("typing", {
      typer: user._id,
      conversationId: activeChatId,
    });

    clearTimeout(typingTimerRef);
    typingTimerRef = setTimeout(() => {
      socket.emit("stop-typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    }, 1500);
  };

  // ── Render: No active chat selected ──
  if (!activeChatId) {
    return (
      <Box
        display={{ base: "none", md: "flex" }}
        h="100%"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="2xl" fontWeight="bold" color="gray.400">
          Select a conversation to start chatting
        </Text>
      </Box>
    );
  }

  // ── Render: Chat loading state ──
  if (isChatLoading) {
    return (
      <Box
        h="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="xl" color="purple.400" />
      </Box>
    );
  }

  // ── Render: Active chat view ──
  return (
    <Flex direction="column" h="100%" w="100%">
      {/* Chat Header */}
      <Flex
        p={2}
        borderBottomWidth="1px"
        align="center"
        flexShrink={0}
      >
        <ChatAreaTop onBackClick={goBackToChatList} />
      </Flex>

      {/* Message List */}
      <Box
        id="chat-box"
        flex={1}
        overflowY="auto"
        px={2}
        py={1}
        sx={customScrollStyles}
      >
        {messageList.map((message, idx) => (
          <SingleMessage
            key={message._id || idx}
            message={message}
            user={user}
            receiver={receiver}
            markdownToHtml={renderMarkdownContent}
            scrollbarconfig={customScrollStyles}
            socket={socket}
            activeChatId={activeChatId}
            removeMessageFromList={removeMessageFromList}
            toast={toast}
          />
        ))}

        {isOtherUserTyping && (
          <Text fontSize="sm" color="gray.400" ml={2} mt={1}>
            typing...
          </Text>
        )}
      </Box>

      {/* Image Preview */}
      {imagePreview && (
        <Box px={4} py={2} borderTopWidth="1px">
          <Flex align="center" gap={2}>
            <Image
              src={imagePreview}
              maxH="100px"
              borderRadius="md"
              alt="Selected attachment"
            />
            <Button
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={() => {
                setImagePreview(null);
                setSelectedImageFile(null);
              }}
            >
              Remove
            </Button>
          </Flex>
        </Box>
      )}

      {/* Message Input */}
      <Flex p={2} borderTopWidth="1px" align="center" gap={2} flexShrink={0}>
        <IconButton
          icon={<AttachmentIcon />}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          variant="ghost"
          isLoading={isUploading}
        />
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImageSelection}
        />
        <Input
          id="new-message"
          placeholder="Type a message..."
          onKeyDown={handleKeyboardInput}
          flex={1}
          autoComplete="off"
        />
        <IconButton
          icon={<ArrowUpIcon />}
          colorScheme="purple"
          onClick={dispatchChatMessage}
          aria-label="Send message"
          isLoading={isUploading}
          borderRadius="full"
        />
      </Flex>
    </Flex>
  );
};

export default ChatArea;
