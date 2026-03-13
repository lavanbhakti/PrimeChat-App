/**
 * PrimeChat Group Creation Modal
 * 
 * Provides a dialog for creating new group conversations.
 * Users can name the group and select members from the full user list.
 * Requires at least one member selected and a group name to proceed.
 * 
 * @module GroupCreationModal
 */

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
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  /**
   * Toggles a user's selection status for group membership.
   * @param {string} memberId - The user ID to toggle
   */
  const toggleMemberSelection = (memberId) => {
    if (selectedMemberIds.includes(memberId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  /**
   * Creates a new group conversation with the selected members.
   * Joins the socket room and adds the group to the chat list.
   */
  const submitGroupCreation = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    if (selectedMemberIds.length < 1) {
      toast({
        title: "Please select at least one member",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const groupPayload = {
        members: [user._id, ...selectedMemberIds],
        isGroup: true,
        name: groupName,
      };

      const response = await fetch(`${hostName}/conversation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(groupPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to create group");
      }

      const newGroup = await response.json();

      setMyChatList([newGroup, ...myChatList]);
      setReceiver(newGroup);
      setActiveChatId(newGroup._id);

      socket.emit("join-chat", {
        roomId: newGroup._id,
        userId: user._id,
      });

      toast({
        title: "Group created successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });

      setGroupName("");
      setSelectedMemberIds([]);
      onClose();
    } catch (creationError) {
      console.error(creationError);
      toast({
        title: "Error creating group",
        description: creationError.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resets form state and closes the modal.
   */
  const dismissModal = () => {
    setGroupName("");
    setSelectedMemberIds([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={dismissModal} size="md">
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
              Select Members ({selectedMemberIds.length} selected)
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
                  onClick={() => toggleMemberSelection(u._id)}
                >
                  <Checkbox
                    isChecked={selectedMemberIds.includes(u._id)}
                    onChange={() => toggleMemberSelection(u._id)}
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
          <Button variant="ghost" mr={3} onClick={dismissModal}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={submitGroupCreation}
            isLoading={isSubmitting}
            isDisabled={!groupName.trim() || selectedMemberIds.length < 1}
          >
            Create Group
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default GroupModal;
