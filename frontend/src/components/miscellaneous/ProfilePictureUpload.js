/**
 * PrimeChat Profile Picture Upload Modal
 * 
 * Handles uploading new profile or group pictures via S3 presigned URLs.
 * Validates file type and size, shows preview, and updates the picture
 * in the database after successful S3 upload.
 * 
 * @module ProfilePictureUpload
 */

import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  Text,
  useToast,
  Spinner,
  IconButton,
} from "@chakra-ui/react";
import { EditIcon, AttachmentIcon } from "@chakra-ui/icons";
import axios from "axios";

const ProfilePictureUpload = ({
  isOpen,
  onClose,
  currentPicture,
  onUploadSuccess,
  hostName,
  isGroup = false,
  conversationId = null
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  /**
   * Validates and sets the selected image file.
   * Enforces image-only and 5MB size constraints.
   */
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Uploads the selected image to S3 and updates the profile/group picture
   * in the PrimeChat database.
   * 
   * Flow:
   * 1. Request presigned URL from backend
   * 2. Upload image directly to S3
   * 3. Update profile/group picture reference in database
   * 4. Notify parent component of successful upload
   */
  const uploadImage = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Step 1: Get presigned URL from backend
      const uploadType = isGroup ? 'group' : 'profile';
      const response = await fetch(
        `${hostName}/user/presigned-url?filename=${encodeURIComponent(selectedFile.name)}&filetype=${encodeURIComponent(selectedFile.type)}&type=${uploadType}`,
        {
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get upload URL");
      }

      const { url, fields, key } = await response.json();

      console.log("Presigned URL received:", { url, key });

      // Step 2: Upload to S3 using presigned URL
      const formData = new FormData();

      // Append fields in the exact order AWS expects
      Object.entries(fields).forEach(([fieldKey, value]) => {
        formData.append(fieldKey, value);
      });

      // File must be appended last per AWS requirements
      formData.append("file", selectedFile);

      const uploadResponse = await axios.post(url, formData);

      console.log("S3 upload response:", uploadResponse.status);

      // AWS S3 can return 200, 201, or 204
      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error("Failed to upload image to S3");
      }

      // Step 3: Construct the final image URL
      const imageUrl = `${url}${url.endsWith('/') ? '' : '/'}${key}`;

      console.log("Image URL:", imageUrl);

      // Step 4: Update profile/group picture in database
      const updateEndpoint = isGroup
        ? `${hostName}/user/update-group-picture`
        : `${hostName}/user/update-profile-picture`;

      const updatePayload = isGroup
        ? { conversationId, profilePic: imageUrl }
        : { profilePic: imageUrl };

      const updateResponse = await fetch(updateEndpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || "Failed to update picture");
      }

      const data = await updateResponse.json();

      toast({
        title: "Success!",
        description: isGroup ? "Group picture updated" : "Profile picture updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(imageUrl, isGroup ? data.conversation : data.user);
      }

      // Reset and close
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Resets state and closes the upload modal.
   */
  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isGroup ? "Update Group Picture" : "Update Profile Picture"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            {/* Current/Preview Picture */}
            <Box position="relative">
              <Image
                borderRadius="full"
                boxSize="150px"
                src={previewUrl || currentPicture}
                alt="Profile"
                objectFit="cover"
                border="2px solid"
                borderColor="gray.200"
              />
              <IconButton
                icon={<EditIcon />}
                colorScheme="purple"
                borderRadius="full"
                position="absolute"
                bottom={0}
                right={0}
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change picture"
              />
            </Box>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              style={{ display: "none" }}
            />

            {!previewUrl && (
              <Button
                leftIcon={<AttachmentIcon />}
                onClick={() => fileInputRef.current?.click()}
                colorScheme="purple"
                variant="outline"
                w="full"
              >
                Choose Image
              </Button>
            )}

            {selectedFile && (
              <Box textAlign="center" w="full" p={2} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </Text>
              </Box>
            )}

            {previewUrl && (
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
              >
                Remove Image
              </Button>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} isDisabled={isUploading}>
            Cancel
          </Button>
          <Button
            colorScheme="purple"
            onClick={uploadImage}
            isDisabled={!selectedFile || isUploading}
            leftIcon={isUploading ? <Spinner size="sm" /> : null}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProfilePictureUpload;
