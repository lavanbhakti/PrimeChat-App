/**
 * PrimeChat New Contacts Component
 * 
 * Displays users who haven't been added as chat contacts yet.
 * Supports searching available users and creating new 1-to-1 or group conversations.
 * 
 * @module NewChats
 */

import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import {
  Box,
  Divider,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Text,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import {
  AddIcon,
  ArrowBackIcon,
  ChevronRightIcon,
  Search2Icon,
} from "@chakra-ui/icons";
import { useContext } from "react";
import primeChatContext from "../../context/chatContext";
import GroupModal from "../miscellaneous/GroupModal";

const NewChats = (props) => {
  const [contactsList, setContactsList] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState(contactsList);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const appContext = useContext(primeChatContext);
  const {
    hostName,
    socket,
    user,
    myChatList,
    setMyChatList,
    setReceiver,
    setActiveChatId,
  } = appContext;

  /**
   * Fetches users who don't yet have a conversation with the current user.
   */
  const loadAvailableContacts = async () => {
    try {
      const response = await fetch(`${hostName}/user/non-friends`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load contacts");
      }
      const availableUsers = await response.json();
      setContactsList(availableUsers);
      setFilteredContacts(availableUsers);
    } catch (fetchError) {
      console.log("Contact fetch error:", fetchError);
    }
  };

  /**
   * Fetches all registered users for group creation member selection.
   */
  const loadAllRegisteredUsers = async () => {
    try {
      const response = await fetch(`${hostName}/user/all-users`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to load user list");
      }
      const userData = await response.json();
      const otherUsers = userData.filter((u) => u._id !== user._id);
      setAllRegisteredUsers(otherUsers);
    } catch (fetchError) {
      console.log("User list fetch error:", fetchError);
    }
  };

  useEffect(() => {
    async function initializeContactLists() {
      await loadAvailableContacts();
      await loadAllRegisteredUsers();
    }
    initializeContactLists();
  }, [myChatList]);

  /**
   * Filters the available contacts list by name search query.
   */
  const filterContactsByName = async (e) => {
    if (e.target.value !== "") {
      const matchingContacts = contactsList.filter((contact) =>
        contact.name.toLowerCase().includes(e.target.value.toLowerCase())
      );
      setFilteredContacts(matchingContacts);
    } else {
      setFilteredContacts(contactsList);
    }
  };

  /**
   * Creates a new 1-to-1 conversation with the selected user.
   * Joins the socket room and switches to the new chat.
   */
  const startNewConversation = async (e, recipientId) => {
    e.preventDefault();
    const conversationPayload = { members: [user._id, recipientId] };
    try {
      const response = await fetch(`${hostName}/conversation/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify(conversationPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }
      const newConversation = await response.json();

      setMyChatList([newConversation, ...myChatList]);
      setReceiver(newConversation.members[0]);
      setActiveChatId(newConversation._id);
      props.setactiveTab(0);

      socket.emit("join-chat", {
        roomId: newConversation._id,
        userId: user._id,
      });

      setFilteredContacts((current) =>
        current.filter((contact) => contact._id !== recipientId)
      );
    } catch (createError) {
      console.log("Conversation creation error:", createError);
    }
  };

  return (
    <>
      <Box>
        <Flex justify={"space-between"}>
          <Button onClick={() => props.setactiveTab(0)}>
            <ArrowBackIcon />
          </Button>

          <Box display={"flex"}>
            <InputGroup w={"fit-content"} mx={2}>
              <InputLeftElement pointerEvents="none">
                <Search2Icon color="gray.300" />
              </InputLeftElement>
              <Input
                type="text"
                placeholder="Enter Name"
                onChange={filterContactsByName}
                id="search-input"
              />
            </InputGroup>
          </Box>
        </Flex>
      </Box>

      <Divider my={2} />

      <Box
        h={{ base: "63vh", md: "72vh" }}
        overflowY={"scroll"}
        sx={{
          "::-webkit-scrollbar": {
            width: "4px",
          },
          "::-webkit-scrollbar-track": {
            width: "6px",
          },
          "::-webkit-scrollbar-thumb": {
            background: { base: "gray.300", md: "gray.500" },
            borderRadius: "24px",
          },
        }}
      >
        <Button my={2} mx={2} colorScheme="purple" onClick={onOpen}>
          Create New Group <AddIcon ml={2} fontSize={"12px"} />
        </Button>
        {filteredContacts.map(
          (contact) =>
            contact._id !== appContext.user._id && (
              <Flex key={contact._id} p={2}>
                <Button
                  h={"4em"}
                  w={"100%"}
                  justifyContent={"space-between"}
                  onClick={(e) => startNewConversation(e, contact._id)}
                >
                  <Flex>
                    <Box>
                      <img
                        src={contact.profilePic}
                        alt="profile"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                        }}
                      />
                    </Box>
                    <Box mx={3} textAlign={"start"}>
                      <Text fontSize={"lg"} fontWeight={"bold"}>
                        {contact.name}
                      </Text>
                      <Text fontSize={"sm"} color={"gray.500"}>
                        {contact.phoneNum}
                      </Text>
                    </Box>
                  </Flex>

                  <ChevronRightIcon />
                </Button>
              </Flex>
            )
        )}
      </Box>

      <GroupModal
        isOpen={isOpen}
        onClose={onClose}
        users={allRegisteredUsers}
        hostName={hostName}
        user={user}
        setMyChatList={setMyChatList}
        myChatList={myChatList}
        setReceiver={setReceiver}
        setActiveChatId={setActiveChatId}
        socket={socket}
      />
    </>
  );
};

export default NewChats;
