/**
 * PrimeChat DevWorkspace Panel
 * 
 * Side panel component for the encrypted notes feature.
 * Users enter a secret key to open, create, save, refresh,
 * or delete encrypted notes. Supports resizable width via
 * parent Dashboard component.
 * 
 * @module DevWorkspacePanel
 */

import React, { useState, useEffect, forwardRef } from "react";
import {
  Box,
  Button,
  Textarea,
  Input,
  VStack,
  HStack,
  Text,
  IconButton,
  useToast,
  Divider,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { CloseIcon, CheckIcon, DeleteIcon, RepeatIcon } from "@chakra-ui/icons";
import axios from "axios";

const DevWorkspace = forwardRef(({ isOpen, onClose, hostName, width }, ref) => {
  const [secretKey, setSecretKey] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isRefreshingNote, setIsRefreshingNote] = useState(false);
  const toast = useToast();

  // Reset editor state when the workspace panel is closed
  useEffect(() => {
    if (!isOpen) {
      setIsNoteEditorOpen(false);
      setSecretKey("");
      setNoteContent("");
    }
  }, [isOpen]);

  /**
   * Builds the authorization headers for API requests.
   */
  const buildRequestHeaders = () => ({
    "Content-Type": "application/json",
    "auth-token": localStorage.getItem("token"),
  });

  /**
   * Opens an encrypted note by its secret key.
   * Creates a new note if none exists for the given key.
   */
  const openEncryptedNote = async () => {
    if (!secretKey.trim()) {
      toast({ title: "Please enter a key", status: "warning", duration: 2000, isClosable: true });
      return;
    }

    try {
      const response = await axios.post(
        `${hostName}/codepad/open`,
        { key: secretKey },
        { headers: buildRequestHeaders() }
      );

      if (response.data) {
        setNoteContent(response.data.text || "");
        setIsNoteEditorOpen(true);
        toast({
          title: response.data.text ? "Note loaded successfully" : "New note created",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (loadError) {
      toast({
        title: "Error opening note",
        description: loadError.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  /**
   * Refreshes the note content from the server without re-entering the key.
   */
  const refreshNoteFromServer = async () => {
    if (!secretKey.trim()) {
      toast({ title: "Key is required", status: "warning", duration: 2000, isClosable: true });
      return;
    }

    setIsRefreshingNote(true);
    try {
      const response = await axios.post(
        `${hostName}/codepad/open`,
        { key: secretKey },
        { headers: buildRequestHeaders() }
      );

      if (response.data) {
        setNoteContent(response.data.text || "");
        toast({ title: "Note refreshed successfully", status: "success", duration: 2000, isClosable: true });
      }
    } catch (refreshError) {
      toast({
        title: "Error refreshing note",
        description: refreshError.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshingNote(false);
    }
  };

  /**
   * Encrypts and persists the note content to the server.
   */
  const saveNoteToServer = async () => {
    if (!secretKey.trim()) {
      toast({ title: "Key is required", status: "warning", duration: 2000, isClosable: true });
      return;
    }

    setIsSavingNote(true);
    try {
      const response = await axios.post(
        `${hostName}/codepad/save`,
        { key: secretKey, text: noteContent },
        { headers: buildRequestHeaders() }
      );

      if (response.data.ok) {
        toast({ title: "Note saved successfully", status: "success", duration: 2000, isClosable: true });
      }
    } catch (saveError) {
      toast({
        title: "Error saving note",
        description: saveError.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  /**
   * Permanently deletes the encrypted note from the server.
   */
  const deleteNoteFromServer = async () => {
    if (!secretKey.trim()) {
      toast({ title: "Key is required", status: "warning", duration: 2000, isClosable: true });
      return;
    }

    try {
      const response = await axios.post(
        `${hostName}/codepad/delete`,
        { key: secretKey },
        { headers: buildRequestHeaders() }
      );

      if (response.data.ok) {
        toast({ title: "Note deleted successfully", status: "success", duration: 2000, isClosable: true });
        setNoteContent("");
        setIsNoteEditorOpen(false);
        setSecretKey("");
      }
    } catch (deleteError) {
      toast({
        title: "Error deleting note",
        description: deleteError.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const navigateBackToKeyInput = () => {
    setIsNoteEditorOpen(false);
    setNoteContent("");
  };

  const closeWorkspaceCompletely = () => {
    setIsNoteEditorOpen(false);
    setNoteContent("");
    setSecretKey("");
    onClose();
  };

  const handleEnterKeyPress = (e) => {
    if (e.key === "Enter") {
      openEncryptedNote();
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      ref={ref}
      h="100%"
      w={{ base: "100%", md: width ? `${width}px` : "400px" }}
      minW="300px"
      bg={
        localStorage.getItem("chakra-ui-color-mode") === "dark"
          ? "gray.800"
          : "white"
      }
      borderLeftWidth="2px"
      p={4}
      overflowY="auto"
      flexShrink={0}
      transition="width 0.15s ease"
    >
      <VStack h="100%" spacing={4} align="stretch">
        {/* Panel Header */}
        <HStack justify="space-between">
          <Text fontSize="xl" fontWeight="bold">
            Dev Workspace
          </Text>
          <IconButton
            icon={<CloseIcon />}
            size="sm"
            onClick={isNoteEditorOpen ? closeWorkspaceCompletely : onClose}
            aria-label="Close Dev Workspace"
          />
        </HStack>

        <Divider />

        {!isNoteEditorOpen ? (
          // ── Secret Key Entry Screen ──
          <VStack spacing={4} flex={1} justify="center">
            <Text fontSize="md" textAlign="center">
              Enter a secret key to open or create a secure note
            </Text>
            <InputGroup size="md">
              <Input
                placeholder="Enter your secret key"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                onKeyPress={handleEnterKeyPress}
                type="password"
              />
              <InputRightElement width="4.5rem">
                <Button h="1.75rem" size="sm" onClick={openEncryptedNote}>
                  Open
                </Button>
              </InputRightElement>
            </InputGroup>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Your notes are encrypted with your key.
              <br />
              Keep it safe and don't share it.
            </Text>
          </VStack>
        ) : (
          // ── Note Editor Screen ──
          <VStack spacing={4} flex={1} align="stretch">
            <HStack justify="space-between">
              <HStack>
                <Button size="sm" onClick={navigateBackToKeyInput} variant="outline">
                  ← Back
                </Button>
                <Text fontSize="sm" color="gray.500" isTruncated>
                  Key: {secretKey}
                </Text>
              </HStack>
            </HStack>

            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Start typing your note..."
              flex={1}
              resize="none"
              fontFamily="monospace"
              fontSize="sm"
            />

            <VStack spacing={2}>
              <HStack spacing={2} w="100%">
                <Button
                  colorScheme="blue"
                  onClick={saveNoteToServer}
                  isLoading={isSavingNote}
                  leftIcon={<CheckIcon />}
                  flex={1}
                >
                  Save
                </Button>
                <Button
                  colorScheme="green"
                  onClick={refreshNoteFromServer}
                  isLoading={isRefreshingNote}
                  leftIcon={<RepeatIcon />}
                  variant="outline"
                >
                  Refresh
                </Button>
              </HStack>

              <HStack spacing={2} w="100%">
                <Button
                  colorScheme="red"
                  onClick={deleteNoteFromServer}
                  leftIcon={<DeleteIcon />}
                  variant="outline"
                  flex={1}
                >
                  Delete
                </Button>
                <Button
                  colorScheme="gray"
                  onClick={closeWorkspaceCompletely}
                  leftIcon={<CloseIcon />}
                  variant="outline"
                  flex={1}
                >
                  Close
                </Button>
              </HStack>
            </VStack>

            <Text fontSize="xs" color="gray.500" textAlign="center">
              Use Refresh to reload from server • Close to exit editor
            </Text>
          </VStack>
        )}
      </VStack>
    </Box>
  );
});

DevWorkspace.displayName = "DevWorkspace";

export default DevWorkspace;
