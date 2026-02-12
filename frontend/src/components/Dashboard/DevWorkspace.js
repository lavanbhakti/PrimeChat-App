import React, { useState, useEffect } from "react";
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

const DevWorkspace = ({ isOpen, onClose, hostName }) => {
  const [key, setKey] = useState("");
  const [text, setText] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Reset state when Dev Workspace is closed
    if (!isOpen) {
      setIsEditorOpen(false);
      setKey("");
      setText("");
    }
  }, [isOpen]);

  const handleOpen = async () => {
    if (!key.trim()) {
      toast({
        title: "Please enter a key",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await axios.post(
        `${hostName}/codepad/open`,
        { key },
        {
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.data) {
        setText(response.data.text || "");
        setIsEditorOpen(true);
        toast({
          title: response.data.text
            ? "Note loaded successfully"
            : "New note created",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error opening note",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRefresh = async () => {
    if (!key.trim()) {
      toast({
        title: "Key is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await axios.post(
        `${hostName}/codepad/open`,
        { key },
        {
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.data) {
        setText(response.data.text || "");
        toast({
          title: "Note refreshed successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error refreshing note",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!key.trim()) {
      toast({
        title: "Key is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.post(
        `${hostName}/codepad/save`,
        { key, text },
        {
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.data.ok) {
        toast({
          title: "Note saved successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Error saving note",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!key.trim()) {
      toast({
        title: "Key is required",
        status: "warning",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await axios.post(
        `${hostName}/codepad/delete`,
        { key },
        {
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (response.data.ok) {
        toast({
          title: "Note deleted successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setText("");
        setIsEditorOpen(false);
        setKey("");
      }
    } catch (error) {
      toast({
        title: "Error deleting note",
        description: error.response?.data?.error || "Something went wrong",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleBack = () => {
    setIsEditorOpen(false);
    setText("");
  };

  const handleCloseEditor = () => {
    // Close the entire Dev Workspace
    setIsEditorOpen(false);
    setText("");
    setKey("");
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleOpen();
    }
  };

  if (!isOpen) return null;

  return (
    <Box
      position="fixed"
      right={0}
      top="70px"
      h="calc(100vh - 70px)"
      w={{ base: "100%", md: "400px" }}
      bg={
        localStorage.getItem("chakra-ui-color-mode") === "dark"
          ? "gray.800"
          : "white"
      }
      borderLeftWidth="2px"
      boxShadow="xl"
      zIndex={1000}
      p={4}
    >
      <VStack h="100%" spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Text fontSize="xl" fontWeight="bold">
            Dev Workspace
          </Text>
          <IconButton
            icon={<CloseIcon />}
            size="sm"
            onClick={isEditorOpen ? handleCloseEditor : onClose}
            aria-label="Close Dev Workspace"
          />
        </HStack>

        <Divider />

        {!isEditorOpen ? (
          // Key Input Screen
          <VStack spacing={4} flex={1} justify="center">
            <Text fontSize="md" textAlign="center">
              Enter a secret key to open or create a secure note
            </Text>
            <InputGroup size="md">
              <Input
                placeholder="Enter your secret key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyPress={handleKeyPress}
                type="password"
              />
              <InputRightElement width="4.5rem">
                <Button h="1.75rem" size="sm" onClick={handleOpen}>
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
          // Editor Screen
          <VStack spacing={4} flex={1} align="stretch">
            <HStack justify="space-between">
              <HStack>
                <Button size="sm" onClick={handleBack} variant="outline">
                  ← Back
                </Button>
                <Text fontSize="sm" color="gray.500" isTruncated>
                  Key: {key}
                </Text>
              </HStack>
              <IconButton
                icon={<CloseIcon />}
                size="sm"
                onClick={handleCloseEditor}
                aria-label="Close Editor"
                variant="ghost"
              />
            </HStack>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
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
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={<CheckIcon />}
                  flex={1}
                >
                  Save
                </Button>
                <Button
                  colorScheme="green"
                  onClick={handleRefresh}
                  isLoading={isRefreshing}
                  leftIcon={<RepeatIcon />}
                  variant="outline"
                >
                  Refresh
                </Button>
              </HStack>
              
              <HStack spacing={2} w="100%">
                <Button
                  colorScheme="red"
                  onClick={handleDelete}
                  leftIcon={<DeleteIcon />}
                  variant="outline"
                  flex={1}
                >
                  Delete
                </Button>
                <Button
                  colorScheme="gray"
                  onClick={handleCloseEditor}
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
};

export default DevWorkspace;
