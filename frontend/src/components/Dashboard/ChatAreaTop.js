import {
  Flex,
  Text,
  Button,
  Image,
  Tooltip,
  SkeletonCircle,
  Skeleton,
  Circle,
  Stack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { ArrowBackIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useContext, useEffect } from "react";
import chatContext from "../../context/chatContext";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useDisclosure } from "@chakra-ui/react";

const ChatAreaTop = () => {
  const context = useContext(chatContext);

  const {
    receiver,
    setReceiver,
    activeChatId,
    setActiveChatId,
    setMessageList,
    isChatLoading,
    hostName,
    socket,
    myChatList,
    setMyChatList,
    user,
  } = context;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const getReceiverOnlineStatus = async () => {
    if (!receiver._id || receiver.isGroup) {
      return;
    }

    try {
      const repsonse = await fetch(
        `${hostName}/user/online-status/${receiver._id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );
      const data = await repsonse.json();
      setReceiver((receiver) => ({
        ...receiver,
        isOnline: data.isOnline,
      }));
    } catch (error) {}
  };

  const handleBack = () => {
    socket.emit("leave-chat", activeChatId);
    setActiveChatId("");
    setMessageList([]);
    setReceiver({});
  };

  const handleDeleteChat = async () => {
    if (receiver.isGroup) {
      toast({
        title: "Cannot delete group chat",
        description: "Please exit the group instead",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await fetch(
        `${hostName}/conversation/${activeChatId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        // Remove from chat list
        setMyChatList(myChatList.filter((chat) => chat._id !== activeChatId));
        handleBack();
        toast({
          title: "Chat deleted",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to delete chat");
      }
    } catch (error) {
      toast({
        title: "Error deleting chat",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExitGroup = async () => {
    if (!receiver.isGroup) {
      return;
    }

    try {
      const response = await fetch(
        `${hostName}/conversation/${activeChatId}/leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        // Remove from chat list
        setMyChatList(myChatList.filter((chat) => chat._id !== activeChatId));
        handleBack();
        toast({
          title: "Left group",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to exit group");
      }
    } catch (error) {
      toast({
        title: "Error exiting group",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteGroup = async () => {
    if (!receiver.isGroup) {
      return;
    }

    try {
      const response = await fetch(
        `${hostName}/conversation/${activeChatId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.ok) {
        // Remove from chat list and notify all members via socket
        socket.emit("group-deleted", {
          groupId: activeChatId,
          members: receiver.members.map((m) => m._id),
        });
        setMyChatList(myChatList.filter((chat) => chat._id !== activeChatId));
        handleBack();
        toast({
          title: "Group deleted",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error("Failed to delete group");
      }
    } catch (error) {
      toast({
        title: "Error deleting group",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const getLastSeenString = (lastSeen) => {
    var lastSeenString = "last seen ";
    if (new Date(lastSeen).toDateString() === new Date().toDateString()) {
      lastSeenString += "today ";
    } else if (
      new Date(lastSeen).toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
    ) {
      lastSeenString += "yesterday ";
    } else {
      lastSeenString += `on ${new Date(lastSeen).toLocaleDateString()} `;
    }

    lastSeenString += `at ${new Date(lastSeen).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    return lastSeenString;
  };

  useEffect(() => {
    getReceiverOnlineStatus();
  }, [receiver?._id]);
  
  return (
    <>
      <Flex w={"100%"}>
        <Button
          borderRadius={0}
          height={"inherit"}
          onClick={() => handleBack()}
        >
          <ArrowBackIcon />
        </Button>
        <Tooltip label="View Profile">
          <Button
            w={"100%"}
            mr={0}
            p={2}
            h={"max-content"}
            justifyContent={"space-between"}
            borderRadius={"0px"}
            onClick={onOpen}
          >
            {isChatLoading ? (
              <>
                <Flex>
                  <SkeletonCircle size="10" mx={2} />
                  <Skeleton
                    height="20px"
                    width="250px"
                    borderRadius={"md"}
                    my={2}
                  />
                </Flex>
              </>
            ) : (
              <>
                <Flex gap={2} alignItems={"center"}>
                  <Image
                    borderRadius="full"
                    boxSize="40px"
                    src={receiver.isGroup ? (receiver.profilePic || "https://via.placeholder.com/150") : receiver.profilePic}
                    alt=""
                  />

                  <Stack
                    justifyContent={"center"}
                    m={0}
                    p={0}
                    lineHeight={1}
                    gap={0}
                    textAlign={"left"}
                  >
                    <Text mx={1} my={receiver.isOnline || receiver.isGroup ? 0 : 2} fontSize="2xl">
                      {receiver.isGroup ? receiver.name : receiver.name}
                    </Text>
                    {receiver.isGroup ? (
                      <Text mx={1} fontSize={"small"} color="gray.500">
                        {receiver.members?.length || 0} members
                      </Text>
                    ) : receiver.isOnline ? (
                      <Text mx={1} fontSize={"small"}>
                        <Circle
                          size="2"
                          bg="green.500"
                          display="inline-block"
                          borderRadius="full"
                          mx={1}
                        />
                        active now
                      </Text>
                    ) : (
                      <Text my={0} mx={1} fontSize={"xx-small"}>
                        {getLastSeenString(receiver.lastSeen)}
                      </Text>
                    )}
                  </Stack>
                </Flex>
              </>
            )}
          </Button>
        </Tooltip>
        
        {/* Menu for chat options */}
        <Menu>
          <MenuButton
            as={IconButton}
            icon={<HamburgerIcon />}
            variant="ghost"
            aria-label="Options"
          />
          <MenuList>
            {receiver.isGroup ? (
              <>
                <MenuItem onClick={handleExitGroup}>Exit Group</MenuItem>
                <MenuItem onClick={handleDeleteGroup} color="red.500">
                  Delete Group
                </MenuItem>
              </>
            ) : (
              <MenuItem onClick={handleDeleteChat} color="red.500">
                Delete Chat
              </MenuItem>
            )}
          </MenuList>
        </Menu>
      </Flex>

      <ProfileModal isOpen={isOpen} onClose={onClose} user={receiver} />
    </>
  );
};

export default ChatAreaTop;
