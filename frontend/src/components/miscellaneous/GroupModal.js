import React, { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Checkbox,
  Box,
  Avatar,
  useToast,
} from "@chakra-ui/react";

const GroupModal = ({ isOpen, onClose, users, hostName, user, setMyChatList, myChatList, setReceiver, setActiveChatId, socket }) => {
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();

  const handleUserToggle = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    if (selectedUsers.length < 1) {
      toast({
        title: "Please select at least one member",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        members: [user._id, ...selectedUsers],
        isGroup: true,
        name: groupName,
      };

      const response = await fetch(`${hostName}/conversation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create group");
      }

      const data = await response.json();

      // Add to chat list
      setMyChatList([data, ...myChatList]);
      setReceiver(data);
      setActiveChatId(data._id);

      // Join the room
      socket.emit("join-chat", {
        roomId: data._id,
        userId: user._id,
      });

      toast({
        title: "Group created successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      // Reset and close
      setGroupName("");
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error creating group",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create New Group</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Input
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              size="lg"
            />

            <Text fontWeight="bold" fontSize="sm">
              Select Members ({selectedUsers.length} selected)
            </Text>

            <Box
              maxH="300px"
              overflowY="auto"
              border="1px"
              borderColor="gray.200"
              borderRadius="md"
              p={2}
            >
              {users.map((u) => (
                <HStack
                  key={u._id}
                  p={2}
                  _hover={{ bg: "gray.100" }}
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => handleUserToggle(u._id)}
                >
                  <Checkbox
                    isChecked={selectedUsers.includes(u._id)}
                    onChange={() => handleUserToggle(u._id)}
                  />
                  <Avatar size="sm" src={u.profilePic} name={u.name} />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {u.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {u.phoneNum}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={handleCreateGroup}
            isLoading={isCreating}
            isDisabled={!groupName.trim() || selectedUsers.length < 1}
          >
            Create Group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GroupModal;
