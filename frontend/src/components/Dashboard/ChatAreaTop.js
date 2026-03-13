/**
 * PrimeChat Chat Header Component
 * 
 * Displays recipient information at the top of the chat area:
 * profile picture, name, online/offline status, and last seen time.
 * Clicking the header opens the profile modal.
 * 
 * @module ChatAreaTop
 */

import React, { useContext, useEffect, useState, useCallback } from "react";
import { Box, Flex, Image, Text, useDisclosure, Menu, MenuButton, MenuList, MenuItem, IconButton, useToast } from "@chakra-ui/react";
import { SettingsIcon, ArrowBackIcon } from "@chakra-ui/icons";
import primeChatContext from "../../context/chatContext";
import { ProfileModal } from "../miscellaneous/ProfileModal";

const ChatAreaTop = ({ onBackClick }) => {
  const appContext = useContext(primeChatContext);
  const { hostName, receiver, setReceiver, activeChatId, setActiveChatId, myChatList, setMyChatList } = appContext;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [presenceStatus, setPresenceStatus] = useState(null);
  const toast = useToast();

  /**
   * Polls the server for the recipient's current online status.
   * Updates local state and the receiver context accordingly.
   */
  const pollRecipientPresence = useCallback(async () => {
    if (!receiver?._id || receiver?.isGroup) return;

    try {
      const response = await fetch(
        `${hostName}/user/online-status/${receiver._id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      const presenceData = await response.json();
      setPresenceStatus(presenceData);
      setReceiver((prevReceiver) => ({
        ...prevReceiver,
        isOnline: presenceData.isOnline,
      }));
    } catch (pollError) {
      console.log("Presence polling error:", pollError);
    }
  }, [receiver?._id, receiver?.isGroup, hostName, setReceiver]);

  // Poll presence status on mount and at regular intervals
  useEffect(() => {
    pollRecipientPresence();
    const pollingInterval = setInterval(pollRecipientPresence, 30000);
    return () => clearInterval(pollingInterval);
  }, [pollRecipientPresence]);

  /**
   * Formats the last seen timestamp into a human-readable string.
   * Returns relative descriptions for recent times and absolute dates for older ones.
   * 
   * @param {string|Date} lastSeenTimestamp - ISO timestamp of last activity
   * @returns {string} Formatted "last seen" description
   */
  const formatLastSeenTimestamp = (lastSeenTimestamp) => {
    if (!lastSeenTimestamp) return "";

    const lastSeenDate = new Date(lastSeenTimestamp);
    const currentDate = new Date();
    const elapsedMs = currentDate.getTime() - lastSeenDate.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes < 1) return "last seen just now";
    if (elapsedMinutes < 60) return `last seen ${elapsedMinutes} min ago`;

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `last seen ${elapsedHours} hr ago`;

    // More than 24 hours — show formatted date
    const timeString = lastSeenDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const isYesterday =
      currentDate.toDateString() !==
        lastSeenDate.toDateString() &&
      new Date(currentDate - 86400000).toDateString() ===
        lastSeenDate.toDateString();

    if (isYesterday) return `last seen yesterday at ${timeString}`;

    return `last seen ${lastSeenDate.toLocaleDateString()} at ${timeString}`;
  };

  /** Determine display name and image based on chat type */
  const displayName = receiver?.isGroup
    ? receiver?.name
    : receiver?.name || "Unknown";

  const displayImage = receiver?.isGroup
    ? receiver?.profilePic || "https://via.placeholder.com/150"
    : receiver?.profilePic || "https://via.placeholder.com/150";

  /**
   * Leaves the current group conversation.
   */
  const handleExitGroup = async () => {
    try {
      const response = await fetch(`${hostName}/conversation/${activeChatId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      if (response.ok) {
        setMyChatList(myChatList.filter((chat) => chat._id !== activeChatId));
        setActiveChatId("");
        setReceiver({});
        toast({ title: "Left group successfully", status: "success", duration: 3000 });
      } else {
        toast({ title: "Failed to leave group", status: "error", duration: 3000 });
      }
    } catch (error) {
      console.log("Error leaving group:", error);
    }
  };

  /**
   * Permanently deletes the current conversation.
   */
  const handleDeleteChat = async () => {
    try {
      const response = await fetch(`${hostName}/conversation/${activeChatId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      if (response.ok) {
        setMyChatList(myChatList.filter((chat) => chat._id !== activeChatId));
        setActiveChatId("");
        setReceiver({});
        toast({ title: "Chat deleted", status: "success", duration: 3000 });
      } else {
        toast({ title: "Failed to delete chat", status: "error", duration: 3000 });
      }
    } catch (error) {
      console.log("Error deleting chat:", error);
    }
  };

  return (
    <>
      <IconButton
        icon={<ArrowBackIcon />}
        mr={2}
        onClick={onBackClick}
        aria-label="Back to chat list"
        variant="ghost"
      />
      <Flex
        align="center"
        flex={1}
        cursor="pointer"
        onClick={onOpen}
      >
        <Image
          borderRadius="full"
          boxSize="40px"
          src={displayImage}
          alt={displayName}
          mr={3}
        />
        <Box>
          <Text fontWeight="bold" fontSize="md">
            {displayName}
          </Text>
          {!receiver?.isGroup && (
            <Text fontSize="xs" color={receiver?.isOnline ? "green.400" : "gray.400"}>
              {receiver?.isOnline
                ? "online"
                : formatLastSeenTimestamp(receiver?.lastSeen)}
            </Text>
          )}
          {receiver?.isGroup && (
            <Text fontSize="xs" color="gray.400">
              {receiver?.members?.length || 0} members
            </Text>
          )}
        </Box>
      </Flex>

      {!receiver?.email?.endsWith("bot") && (
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<SettingsIcon />}
            variant="ghost"
            aria-label="Chat options"
          />
          <MenuList>
            {receiver?.isGroup ? (
              <>
                <MenuItem color="red.500" onClick={handleExitGroup}>
                  Exit Group
                </MenuItem>
                <MenuItem color="red.500" onClick={handleDeleteChat}>
                  Delete Group
                </MenuItem>
              </>
            ) : (
              <MenuItem color="red.500" onClick={handleDeleteChat}>
                Delete Chat
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      )}

      <ProfileModal
        isOpen={isOpen}
        onClose={onClose}
        user={receiver}
        setUser={setReceiver}
      />
    </>
  );
};

export default ChatAreaTop;
