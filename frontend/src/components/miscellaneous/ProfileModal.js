/**
 * PrimeChat Profile Modal Component
 * 
 * Displays user or group profile information in a modal dialog.
 * For the current user, provides edit functionality for name, about,
 * password, and profile picture. For groups, shows member count
 * and allows changing the group avatar.
 * 
 * @module ProfileModal
 */

import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Tabs,
  TabPanels,
  TabPanel,
  Button,
  Input,
  Stack,
  Text,
  Flex,
  IconButton,
  Image,
  Circle,
  Box,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon, EditIcon } from "@chakra-ui/icons";
import primeChatContext from "../../context/chatContext";
import _isEqual from "lodash/isEqual";
import { useToast } from "@chakra-ui/react";
import ProfilePictureUpload from "./ProfilePictureUpload";

export const ProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const appContext = useContext(primeChatContext);
  const { hostName, receiver, setReceiver } = appContext;
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableProfile, setEditableProfile] = useState(user);
  const [isEditIconVisible, setIsEditIconVisible] = useState(false);
  const [isPasswordSectionOpen, setIsPasswordSectionOpen] = useState(false);
  const {
    isOpen: isPictureUploadOpen,
    onOpen: openPictureUpload,
    onClose: closePictureUpload,
  } = useDisclosure();

  const toast = useToast();
  const isViewingOwnProfile = user._id === appContext.user?._id;
  const isGroupProfile = user.isGroup || false;

  // Sync editable profile when the source user data changes
  useEffect(() => {
    if (!_isEqual(user, editableProfile)) {
      setEditableProfile(user);
    }
  }, [user]);

  /**
   * Saves profile changes to the server and updates local state.
   */
  const saveProfileChanges = async () => {
    try {
      setUser && setUser(editableProfile);
    } catch (err) { }

    appContext.setUser(editableProfile);

    try {
      const response = await fetch(`${hostName}/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(editableProfile),
      });

      const responseData = await response.json();

      if (response.status !== 200) {
        toast({
          title: "An error occurred.",
          description: responseData.error,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile was updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setIsEditMode(false);
      }
    } catch (saveError) {
      console.log("Profile save error:", saveError);
    }
  };

  const enterEditMode = () => {
    setIsEditMode(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setEditableProfile({ ...editableProfile, [name]: value });
  };

  /**
   * Handles successful profile/group picture upload.
   * Updates the relevant context state and refreshes chat list data.
   */
  const onPictureUploadComplete = (newImageUrl, updatedData) => {
    if (isGroupProfile) {
      setReceiver && setReceiver({ ...receiver, profilePic: newImageUrl });
      appContext.fetchData && appContext.fetchData();
    } else {
      setEditableProfile({ ...editableProfile, profilePic: newImageUrl });
      appContext.setUser({ ...appContext.user, profilePic: newImageUrl });
      appContext.fetchData && appContext.fetchData();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader p={6} borderBottomWidth="1px" borderColor="gray.100">
            <Flex mt={3} justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold">
                {isGroupProfile ? "Group Info" : "Profile"}
              </Text>
              {isViewingOwnProfile && !isGroupProfile && (
                <IconButton
                  aria-label="Edit profile"
                  icon={<EditIcon />}
                  variant="ghost"
                  colorScheme="purple"
                  onClick={enterEditMode}
                />
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs
              isFitted
              variant="enclosed"
              index={isEditMode ? 1 : 0}
              onChange={(index) => setIsEditMode(index === 1)}
            >
              <TabPanels>
                {/* View Mode */}
                <TabPanel>
                  <Stack spacing={2}>
                    <Box position="relative" mx="auto" w="fit-content">
                      <Image
                        borderRadius="full"
                        boxSize={{ base: "100px", md: "150px" }}
                        src={user.profilePic || "https://via.placeholder.com/150"}
                        alt={user.name}
                        mx="auto"
                      />
                      {(isViewingOwnProfile || isGroupProfile) && (
                        <IconButton
                          icon={<EditIcon />}
                          colorScheme="purple"
                          borderRadius="full"
                          size="sm"
                          position="absolute"
                          bottom={0}
                          right={0}
                          onClick={openPictureUpload}
                          aria-label="Change picture"
                        />
                      )}
                    </Box>
                    <Text fontSize="xx-large" fontWeight="bold">
                      {user.name}
                    </Text>
                    {!isGroupProfile && (
                      <>
                        <Text fontSize="md">About: {user.about}</Text>
                        <Text fontSize="md">Email: {user.email}</Text>
                      </>
                    )}
                    {isGroupProfile && (
                      <Text fontSize="md">
                        Members: {user.members?.length || 0}
                      </Text>
                    )}
                  </Stack>
                </TabPanel>

                {/* Edit Mode */}
                <TabPanel>
                  <Stack spacing={4}>
                    <Circle
                      cursor="pointer"
                      onMouseOver={() => setIsEditIconVisible(true)}
                      onMouseOut={() => setIsEditIconVisible(false)}
                      onClick={openPictureUpload}
                    >
                      <Image
                        borderRadius="full"
                        boxSize={{ base: "100px", md: "150px" }}
                        src={user.profilePic || "https://via.placeholder.com/150"}
                        alt="profile-pic"
                        mx="auto"
                      />
                      {isEditIconVisible && (
                        <Box
                          textAlign={"center"}
                          position="absolute"
                          top="auto"
                          left="auto"
                        >
                          <IconButton
                            aria-label="Edit profile picture"
                            icon={<EditIcon />}
                          ></IconButton>
                          <Text fontSize={"xx-small"}>click to edit profile</Text>
                        </Box>
                      )}
                    </Circle>
                    <Input
                      name="name"
                      placeholder="Name"
                      value={editableProfile.name}
                      onChange={handleFieldChange}
                    />
                    <Input
                      name="about"
                      placeholder="about"
                      value={editableProfile.about}
                      onChange={handleFieldChange}
                    />
                    <Button
                      onClick={() => setIsPasswordSectionOpen(!isPasswordSectionOpen)}
                    >
                      change my password{" "}
                      {isPasswordSectionOpen ? (
                        <ChevronUpIcon />
                      ) : (
                        <ChevronDownIcon />
                      )}
                    </Button>
                    {isPasswordSectionOpen && (
                      <Box>
                        <Input
                          name="oldpassword"
                          placeholder="old password"
                          type="password"
                          onChange={handleFieldChange}
                          mb={2}
                        />
                        <Input
                          name="newpassword"
                          placeholder="new password"
                          type="password"
                          onChange={handleFieldChange}
                        />
                      </Box>
                    )}
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            {isEditMode ? (
              <Button colorScheme="purple" mr={3} onClick={saveProfileChanges}>
                Save
              </Button>
            ) : (
              <Button
                colorScheme="purple"
                display={isViewingOwnProfile ? "block" : "none"}
                mr={3}
                onClick={enterEditMode}
              >
                Edit
              </Button>
            )}
            {isEditMode && <Button onClick={() => setIsEditMode(false)}>Back</Button>}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile/Group Picture Upload Modal */}
      <ProfilePictureUpload
        isOpen={isPictureUploadOpen}
        onClose={closePictureUpload}
        currentPicture={user.profilePic || "https://via.placeholder.com/150"}
        onUploadSuccess={onPictureUploadComplete}
        hostName={hostName}
        isGroup={isGroupProfile}
        conversationId={user._id}
      />
    </>
  );
};
