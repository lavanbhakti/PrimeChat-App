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
import chatContext from "../../context/chatContext";
import _isEqual from "lodash/isEqual";
import { useToast } from "@chakra-ui/react";
import ProfilePictureUpload from "./ProfilePictureUpload";

export const ProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const context = useContext(chatContext);
  const { hostName, receiver, setReceiver } = context;
  const [editing, setEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [showEditIcon, setShowEditIcon] = useState(false);
  const [showchangepassword, setshowchangepassword] = useState(false);
  const {
    isOpen: isPictureModalOpen,
    onOpen: onPictureModalOpen,
    onClose: onPictureModalClose
  } = useDisclosure();

  const toast = useToast();
  const isOwnProfile = user._id === context.user?._id;
  const isGroupProfile = user.isGroup || false;

  useEffect(() => {
    if (!_isEqual(user, editedUser)) {
      setEditedUser(user);
    }
  }, [user]);

  const handleSave = async () => {
    try {
      setUser && setUser(editedUser);
    } catch (error) { }

    context.setUser(editedUser);

    try {
      const response = await fetch(`${hostName}/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(editedUser),
      });

      const json = await response.json();

      if (response.status !== 200) {
        toast({
          title: "An error occurred.",
          description: json.error,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: "User updated",
          description: "User updated successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
        setEditing(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUser({ ...editedUser, [name]: value });
  };

  const handleMouseOver = () => {
    setShowEditIcon(true);
  };

  const handleMouseOut = () => {
    setShowEditIcon(false);
  };

  const handlePictureUploadSuccess = (imageUrl, updatedData) => {
    if (isGroupProfile) {
      // Update group picture
      setReceiver && setReceiver({ ...receiver, profilePic: imageUrl });
      // Refresh chat list to show updated group picture
      context.fetchData && context.fetchData();
    } else {
      // Update user picture
      setEditedUser({ ...editedUser, profilePic: imageUrl });
      context.setUser({ ...context.user, profilePic: imageUrl });
      // Refresh chat list to show updated profile picture
      context.fetchData && context.fetchData();
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
              {isOwnProfile && !isGroupProfile && (
                <IconButton
                  aria-label="Edit profile"
                  icon={<EditIcon />}
                  variant="ghost"
                  colorScheme="purple"
                  onClick={handleEdit}
                />
              )}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Tabs
              isFitted
              variant="enclosed"
              index={editing ? 1 : 0}
              onChange={(index) => setEditing(index === 1)}
            >
              <TabPanels>
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
                      {(isOwnProfile || isGroupProfile) && (
                        <IconButton
                          icon={<EditIcon />}
                          colorScheme="purple"
                          borderRadius="full"
                          size="sm"
                          position="absolute"
                          bottom={0}
                          right={0}
                          onClick={onPictureModalOpen}
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
                <TabPanel>
                  <Stack spacing={4}>
                    <Circle
                      cursor="pointer"
                      onMouseOver={handleMouseOver}
                      onMouseOut={handleMouseOut}
                      onClick={onPictureModalOpen}
                    >
                      <Image
                        borderRadius="full"
                        boxSize={{ base: "100px", md: "150px" }}
                        src={user.profilePic || "https://via.placeholder.com/150"}
                        alt="profile-pic"
                        mx="auto"
                      />
                      {showEditIcon && (
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
                      value={editedUser.name}
                      onChange={handleChange}
                    />
                    <Input
                      name="about"
                      placeholder="about"
                      value={editedUser.about}
                      onChange={handleChange}
                    />
                    <Button
                      onClick={() => setshowchangepassword(!showchangepassword)}
                    >
                      change my password{" "}
                      {showchangepassword ? (
                        <ChevronUpIcon />
                      ) : (
                        <ChevronDownIcon />
                      )}
                    </Button>
                    {showchangepassword && (
                      <Box>
                        <Input
                          name="oldpassword"
                          placeholder="old password"
                          type="password"
                          onChange={handleChange}
                          mb={2}
                        />
                        <Input
                          name="newpassword"
                          placeholder="new password"
                          type="password"
                          onChange={handleChange}
                        />
                      </Box>
                    )}
                  </Stack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            {editing ? (
              <Button colorScheme="purple" mr={3} onClick={handleSave}>
                Save
              </Button>
            ) : (
              <Button
                colorScheme="purple"
                display={isOwnProfile ? "block" : "none"}
                mr={3}
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
            {editing && <Button onClick={() => setEditing(false)}>Back</Button>}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile/Group Picture Upload Modal */}
      <ProfilePictureUpload
        isOpen={isPictureModalOpen}
        onClose={onPictureModalClose}
        currentPicture={user.profilePic || "https://via.placeholder.com/150"}
        onUploadSuccess={handlePictureUploadSuccess}
        hostName={hostName}
        isGroup={isGroupProfile}
        conversationId={user._id}
      />
    </>
  );
};
