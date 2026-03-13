/**
 * PrimeChat Chat List Component
 * 
 * Displays the user's conversation threads with search, unread counts,
 * typing indicators, and new message notifications with sound alerts.
 * 
 * @module MyChatList
 */

import React from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Circle,
  Stack,
  Spinner,
} from "@chakra-ui/react";
import { useState } from "react";
import { useEffect } from "react";
import { useContext } from "react";
import primeChatContext from "../../context/chatContext";
import { AddIcon, Search2Icon } from "@chakra-ui/icons";
import { useToast } from "@chakra-ui/react";
import ProfileMenu from "../Navbar/ProfileMenu";
import { useDisclosure } from "@chakra-ui/react";
import NewMessage from "../miscellaneous/NewMessage";
import wavFile from "../../assets/newmessage.wav";
import { ProfileModal } from "../miscellaneous/ProfileModal";

/** Custom scrollbar styling for the chat list container */
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

const MyChatList = (props) => {
  var notificationSound = new Audio(wavFile);
  const toast = useToast();
  const appContext = useContext(primeChatContext);
  const {
    hostName,
    user,
    socket,
    myChatList: conversationList,
    originalChatList: fullConversationList,
    activeChatId,
    setActiveChatId,
    setMyChatList,
    setIsChatLoading,
    setMessageList,
    setIsOtherUserTyping,
    setReceiver,
    isLoading,
    isOtherUserTyping,
  } = appContext;
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Listen for new message notifications from other conversations
  useEffect(() => {
    socket.on("new-message-notification", async (notificationData) => {
      var updatedList = conversationList;

      let threadIndex = updatedList.findIndex(
        (chat) => chat._id === notificationData.conversationId
      );
      if (threadIndex === -1) {
        updatedList.unshift(notificationData.conversation);
      }
      threadIndex = updatedList.findIndex(
        (chat) => chat._id === notificationData.conversationId
      );
      updatedList[threadIndex].latestmessage = notificationData.text;

      if (activeChatId !== notificationData.conversationId) {
        updatedList[threadIndex].unreadCounts = updatedList[threadIndex].unreadCounts.map(
          (counter) => {
            if (counter.userId === user._id) {
              counter.count = counter.count + 1;
            }
            return counter;
          }
        );
        updatedList[threadIndex].updatedAt = new Date();
      }

      // Move the updated conversation to the top of the list
      let movedConversation = updatedList.splice(threadIndex, 1)[0];
      updatedList.unshift(movedConversation);

      setMyChatList([...updatedList]);

      // Identify the message sender for the notification toast
      let senderInfo = updatedList.find(
        (chat) => chat._id === notificationData.conversationId
      ).members[0];

      // Play notification sound for messages in other conversations
      activeChatId !== notificationData.conversationId &&
        notificationSound.play().catch((audioError) => {
          console.log(audioError);
        });

      // Show notification toast for messages in non-active conversations
      activeChatId !== notificationData.conversationId &&
        toast({
          status: "success",
          duration: 5000,
          position: "top-right",
          render: () => (
            <NewMessage
              sender={senderInfo}
              data={notificationData}
              handleChatOpen={openConversation}
            />
          ),
        });
    });

    return () => {
      socket.off("new-message-notification");
    };
  });

  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Filters the conversation list based on user search input.
   */
  const filterChatsByName = async (e) => {
    if (e.target.value !== "") {
      setSearchQuery(e.target.value.toLowerCase());
      const filteredList = fullConversationList.filter((chat) => {
        const searchableName = chat.isGroup ? chat.name : chat.members[0]?.name;
        return (searchableName || "").toLowerCase().includes(searchQuery);
      });
      setMyChatList(filteredList);
    } else {
      setMyChatList(appContext.originalChatList);
    }
  };

  /**
   * Opens a conversation: fetches messages, joins the socket room,
   * resets unread counts, and updates the active chat state.
   */
  const openConversation = async (conversationId, recipientData) => {
    try {
      setIsChatLoading(true);
      setMessageList([]);
      setIsOtherUserTyping(false);
      const messageInput = document.getElementById("new-message");
      if (messageInput) {
        messageInput.value = "";
        messageInput.focus();
      }

      setIsOtherUserTyping(false);
      await socket.emit("stop-typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
      await socket.emit("leave-chat", activeChatId);

      socket.emit("join-chat", { roomId: conversationId, userId: user._id });
      setActiveChatId(conversationId);

      const response = await fetch(`${hostName}/message/${conversationId}/${user._id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const messagesData = await response.json();

      setMessageList(messagesData);
      setReceiver(recipientData);
      setIsChatLoading(false);

      // Reset unread count for this conversation
      const updatedList = conversationList.map((chat) => {
        if (chat._id === conversationId) {
          chat.unreadCounts = chat.unreadCounts.map((counter) => {
            if (counter.userId === user._id) {
              counter.count = 0;
            }
            return counter;
          });
        }
        return chat;
      });

      setMyChatList(updatedList);

      // Auto-scroll to the latest message
      setTimeout(() => {
        document.getElementById("chat-box")?.scrollTo({
          top: document.getElementById("chat-box").scrollHeight,
        });
      }, 100);
    } catch (openError) {
      console.log("Failed to open conversation:", openError);
    }
  };

  return !isLoading ? (
    <>
      <Box
        display={"flex"}
        justifyContent={"space-between"}
        flexDir={"column"}
        mt={1}
        h={"100%"}
      >
        <Flex zIndex={1} justify={"space-between"}>
          <Text mb={"10px"} fontWeight={"bold"} fontSize={"2xl"}>
            Chats
          </Text>

          <Flex>
            <InputGroup w={{ base: "fit-content", md: "fit-content" }} mx={2}>
              <InputLeftElement pointerEvents="none">
                <Search2Icon color="gray.300" />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="search user"
                onChange={filterChatsByName}
                id="search-input"
              />
            </InputGroup>

            <Box minW={"fit-content"} display={{ base: "block", md: "none" }}>
              <ProfileMenu
                user={user}
                isOpen={isOpen}
                onOpen={onOpen}
                onClose={onClose}
              />
            </Box>
          </Flex>
        </Flex>

        <Divider my={1} />

        <Button
          m={2}
          colorScheme="purple"
          onClick={() => props.setactiveTab(1)}
        >
          Add new Chat <AddIcon ml={2} fontSize={"12px"} />
        </Button>

        <Box h={"100%"} px={2} flex={1} overflowY={"auto"} sx={customScrollStyles}>
          {conversationList.map((chat) => {
            const displayName = chat.isGroup ? chat.name : chat.members[0]?.name;
            const displayPic = chat.isGroup
              ? (chat.profilePic || "https://via.placeholder.com/150")
              : (chat.members[0]?.profilePic || "https://via.placeholder.com/150");
            const recipientData = chat.isGroup ? chat : chat.members[0];

            return (
              <Flex
                key={chat._id}
                my={2}
                justify={"space-between"}
                align={"center"}
                w={"100%"}
                overflow={"hidden"}
              >
                <Button
                  h={"4em"}
                  w={"100%"}
                  justifyContent={"space-between"}
                  onClick={() => openConversation(chat._id, recipientData)}
                  colorScheme={chat._id === activeChatId ? "purple" : "gray"}
                >
                  <Flex>
                    <Box>
                      <img
                        src={displayPic}
                        alt="profile"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                        }}
                      />
                    </Box>
                    <Box ml={3} w={"50%"} textAlign={"left"}>
                      <Text
                        textOverflow={"hidden"}
                        fontSize={"lg"}
                        fontWeight={"bold"}
                      >
                        {displayName?.length > 11
                          ? displayName?.substring(0, 13) + "..."
                          : displayName}
                      </Text>
                      {isOtherUserTyping && chat._id === activeChatId ? (
                        <Text fontSize={"sm"} color={"purple.100"}>
                          typing...
                        </Text>
                      ) : (
                        <Text fontSize={"sm"} color={"gray.400"}>
                          {chat.latestmessage?.substring(0, 15) +
                            (chat.latestmessage?.length > 15 ? "..." : "")}
                        </Text>
                      )}
                    </Box>
                  </Flex>

                  <Stack direction={"row"} align={"center"}>
                    <Box textAlign={"right"} fontSize={"x-small"}>
                      {new Date(chat.updatedAt).toDateString() ===
                        new Date().toDateString() ? (
                        <Text mb={1} fontSize={"x-small"}>
                          Today
                        </Text>
                      ) : new Date(chat.updatedAt).toDateString() ===
                        new Date(
                          new Date().setDate(new Date().getDate() - 1)
                        ).toDateString() ? (
                        <Text mb={1} fontSize={"x-small"}>
                          Yesterday
                        </Text>
                      ) : (
                        <Text mb={1} fontSize={"x-small"}>
                          {new Date(chat.updatedAt).toLocaleDateString()}
                        </Text>
                      )}
                      {new Date(chat.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Box>

                    {chat.unreadCounts.find(
                      (counter) => counter.userId === user._id
                    )?.count > 0 && (
                        <Circle
                          backgroundColor={"black"}
                          color={"white"}
                          p={1}
                          borderRadius={40}
                          size={"20px"}
                        >
                          <Text fontSize={12} p={1} borderRadius={50}>
                            &nbsp;
                            {
                              chat.unreadCounts.find(
                                (counter) => counter.userId === user._id
                              )?.count
                            }
                            &nbsp;
                          </Text>
                        </Circle>
                      )}
                  </Stack>
                </Button>
              </Flex>
            );
          })}
        </Box>
        <ProfileModal
          isOpen={isOpen}
          onClose={onClose}
          onOpen={onOpen}
          user={user}
          setUser={appContext.setUser}
        />
      </Box>
    </>
  ) : (
    <>
      <Box margin={"auto"} w={"max-content"} mt={"30vh"}>
        <Spinner size={"xl"} />
      </Box>
    </>
  );
};

export default MyChatList;
