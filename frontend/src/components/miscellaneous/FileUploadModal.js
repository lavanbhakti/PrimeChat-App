import { 
  Button, 
  CloseButton, 
  Input, 
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Box,
  Text,
  Flex,
  Image,
  VStack,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import React, { useRef, useState } from "react";
import { ArrowForwardIcon, AttachmentIcon } from "@chakra-ui/icons";

const FileUploadModal = (props) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const handleFileUpload = () => {
    fileInputRef.current.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if it's an image
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF, etc.)",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        fileInputRef.current.value = null;
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        fileInputRef.current.value = null;
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleSend = async (e) => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      await props.handleSendMessage(e, message, selectedFile);
      // Reset state after successful send
      setSelectedFile(null);
      setPreviewUrl(null);
      setMessage("");
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
      props.onClose();
    } catch (error) {
      toast({
        title: "Error sending image",
        description: error.message || "Failed to send image",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    removeFile();
    setMessage("");
    props.onClose();
  };

  return (
    <Modal isOpen={props.isOpen} onClose={handleClose} isCentered size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader display="flex" justifyContent="space-between" alignItems="center">
          <Text>Send an Image</Text>
          <CloseButton onClick={handleClose} />
        </ModalHeader>
        <ModalBody pb={6}>
          <Input
            type="file"
            display="none"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileInputChange}
          />

          <VStack spacing={4} align="stretch">
            {/* Image Preview */}
            {previewUrl ? (
              <Box
                position="relative"
                borderRadius="md"
                overflow="hidden"
                border="2px solid"
                borderColor="gray.200"
              >
                <Image
                  src={previewUrl}
                  alt="Preview"
                  maxH="300px"
                  w="100%"
                  objectFit="contain"
                />
                <Button
                  position="absolute"
                  top={2}
                  right={2}
                  size="sm"
                  colorScheme="red"
                  onClick={removeFile}
                >
                  Remove
                </Button>
              </Box>
            ) : (
              <Box
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                p={8}
                textAlign="center"
                cursor="pointer"
                onClick={handleFileUpload}
                _hover={{ borderColor: "purple.500", bg: "gray.50" }}
                transition="all 0.2s"
              >
                <AttachmentIcon fontSize="3xl" color="gray.400" mb={2} />
                <Text color="gray.600">Click to select an image</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Maximum size: 10MB
                </Text>
              </Box>
            )}

            {/* Message Input */}
            <Input
              type="text"
              placeholder="Add a caption (optional)..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              isDisabled={!selectedFile}
            />

            {/* Action Buttons */}
            <Flex justify="flex-end" gap={2}>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                colorScheme="purple"
                onClick={handleSend}
                isDisabled={!selectedFile || isUploading}
                rightIcon={isUploading ? <Spinner size="sm" /> : <ArrowForwardIcon />}
              >
                {isUploading ? "Sending..." : "Send"}
              </Button>
            </Flex>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default FileUploadModal;
