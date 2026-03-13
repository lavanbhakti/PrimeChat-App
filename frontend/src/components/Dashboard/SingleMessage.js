/**
 * PrimeChat Single Message Bubble
 * 
 * Renders an individual chat message with support for text, images,
 * read receipts, reactions, replies, copy/delete actions,
 * and hover-based action buttons.
 * 
 * @module SingleMessage
 */

import React, { useState } from "react";
import {
  Box,
  Image,
  Text,
  Button,
  Tooltip,
  Flex,
  Circle,
  Stack,
  useDisclosure,
} from "@chakra-ui/react";
import { CopyIcon, DeleteIcon, CheckCircleIcon } from "@chakra-ui/icons";
import DeleteMessageModal from "../miscellaneous/DeleteMessageModal";

const SingleMessage = ({
  message,
  user,
  receiver,
  markdownToHtml,
  scrollbarconfig,
  socket,
  activeChatId,
  removeMessageFromList,
  toast,
}) => {
  const isSentByCurrentUser = message.senderId === user._id;
  const messageTimestamp = new Date(message.createdAt);
  const formattedTime = `${messageTimestamp.getHours().toString().padStart(2, '0')}:${messageTimestamp.getMinutes().toString().padStart(2, '0')}`;

  const [isMessageHovered, setIsMessageHovered] = useState(false);

  const {
    isOpen: isDeleteDialogOpen,
    onOpen: openDeleteDialog,
    onClose: closeDeleteDialog,
  } = useDisclosure();

  /**
   * Copies the message text content to the system clipboard.
   */
  const copyMessageToClipboard = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text).then(() => {
      toast({
        duration: 1000,
        render: () => (
          <Box color="white" p={3} bg="purple.300" borderRadius="lg">
            Message copied to clipboard!!
          </Box>
        ),
      });
    });
  };

  /**
   * Handles message deletion — removes from UI and emits socket event.
   * @param {number} deleteScope - 1 for self-only, 2 for everyone
   */
  const removeMessage = async (deleteScope) => {
    removeMessageFromList(message._id);
    closeDeleteDialog();

    const affectedUsers = [user._id];
    if (deleteScope === 2) {
      affectedUsers.push(receiver._id);
    }

    const deletionPayload = {
      messageId: message._id,
      conversationId: activeChatId,
      deleteFrom: affectedUsers,
    };

    socket.emit("delete-message", deletionPayload);
  };

  return (
    <>
      <Flex
        justify={isSentByCurrentUser ? "end" : "start"}
        mx={2}
        onMouseEnter={() => setIsMessageHovered(true)}
        onMouseLeave={() => setIsMessageHovered(false)}
      >
        {/* Sender-side action buttons (copy + delete) */}
        {isSentByCurrentUser && isMessageHovered && (
          <Box margin={2} display="flex">
            <Tooltip label="Copy" placement="top">
              <Button
                size="sm"
                variant="ghost"
                mr={2}
                onClick={copyMessageToClipboard}
                borderRadius="md"
              >
                <CopyIcon />
              </Button>
            </Tooltip>

            <Tooltip label="Delete" placement="top">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  openDeleteDialog();
                }}
                borderRadius="md"
              >
                <DeleteIcon />
              </Button>
            </Tooltip>
          </Box>
        )}
        <Flex maxW="100%" position="relative">
          {/* Receiver avatar for non-sender messages */}
          {!isSentByCurrentUser && receiver?.profilePic && (
            <Image
              borderRadius="50%"
              src={receiver.profilePic}
              alt="Sender"
              w="20px"
              h="20px"
              mr={1}
              alignSelf="center"
            />
          )}

          <Stack spacing={0} position="relative">
            {/* Reply indicator */}
            {message.replyto && (
              <Box
                my={1}
                p={2}
                borderRadius={10}
                bg={isSentByCurrentUser ? "purple.200" : "blue.200"}
                mx={2}
                color="white"
                w="max-content"
                maxW="55vw"
                alignSelf={isSentByCurrentUser ? "flex-end" : "flex-start"}
              >
                reply to
              </Box>
            )}

            {/* Message bubble */}
            <Box
              alignSelf={isSentByCurrentUser ? "flex-end" : "flex-start"}
              position="relative"
              my={1}
              p={2}
              borderRadius={10}
              bg={isSentByCurrentUser ? "purple.300" : "blue.300"}
              color="white"
              w="max-content"
              maxW="60vw"
            >
              {/* Attached image */}
              {message.imageUrl && (
                <Image
                  src={message.imageUrl}
                  alt="loading..."
                  w="200px"
                  maxW="40vw"
                  borderRadius="10px"
                  mb={message.text ? 2 : 0}
                  cursor="pointer"
                  onClick={() => window.open(message.imageUrl, '_blank')}
                  onError={(e) => { e.target.style.display = 'none'; }}
                  loading="lazy"
                />
              )}
              {/* Message text with markdown support */}
              {message.text && (
                <Text
                  wordBreak="break-word"
                  whiteSpace="pre-wrap"
                  dangerouslySetInnerHTML={markdownToHtml(message.text)}
                ></Text>
              )}
              {/* Timestamp and read receipt */}
              <Flex justify="end" align="center" mt={1} gap={1}>
                <Text align="end" fontSize="11px" color="whiteAlpha.700" fontWeight="medium">
                  {formattedTime}
                </Text>

                {isSentByCurrentUser &&
                  message.seenBy?.find(
                    (entry) => entry.user === receiver._id
                  ) && (
                    <Circle ml={1} fontSize="x-small" color="green.100">
                      <CheckCircleIcon />
                    </Circle>
                  )}
              </Flex>

              {/* Emoji reaction badge */}
              {message.reaction && (
                <Box
                  fontSize="xs"
                  position="absolute"
                  bg={isSentByCurrentUser ? "purple.300" : "blue.300"}
                  bottom={-1}
                  left={-1}
                  borderRadius="lg"
                >
                  {message.reaction}
                </Box>
              )}

              {/* Receiver-side copy button */}
              {!isSentByCurrentUser && isMessageHovered && (
                <Box position="absolute" top="0" right="-50px" display="flex">
                  <Tooltip label="Copy" placement="top">
                    <Button
                      size="sm"
                      variant="ghost"
                      mr={2}
                      onClick={copyMessageToClipboard}
                      borderRadius="md"
                    >
                      <CopyIcon />
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </Stack>
        </Flex>
      </Flex>

      <DeleteMessageModal
        isOpen={isDeleteDialogOpen}
        handleDeleteMessage={removeMessage}
        onClose={closeDeleteDialog}
      />
    </>
  );
};

export default SingleMessage;
