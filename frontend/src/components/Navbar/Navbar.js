/**
 * PrimeChat Navigation Bar
 * 
 * Top-level navigation component that displays the app name,
 * dark/light mode toggle, DevWorkspace toggle button,
 * and the user profile menu on desktop.
 * 
 * @module Navbar
 */

import React, { useContext } from "react";
import { Box, Button, Flex, Text, Link, useDisclosure, useColorMode } from "@chakra-ui/react";
import { FaMoon, FaSun, FaCode } from "react-icons/fa";
import ProfileMenu from "./ProfileMenu";
import primeChatContext from "../../context/chatContext";

const Navbar = (props) => {
  const appContext = useContext(primeChatContext);
  const { isAuthenticated } = appContext;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const currentPath = window.location.pathname;

  /**
   * Opens/closes the DevWorkspace side panel via the global toggle function.
   */
  const toggleWorkspacePanel = () => {
    if (window.toggleDevWorkspace) {
      window.toggleDevWorkspace();
    }
  };

  return (
    <>
      {!currentPath.includes("dashboard") && (
        <Box
          position={"absolute"}
          top={5}
          left={5}
          display={{
            md: "none",
            base: "flex",
          }}
        >
          <Button
            borderRadius="md"
            borderWidth={1}
            fontSize="sm"
            backgroundColor="transparent"
            onClick={toggleColorMode}
            mx={1}
            leftIcon={colorMode === "dark" ? <FaSun /> : <FaMoon />}
            px={4}
          >
            {colorMode === "dark" ? "Light Theme" : "Dark Theme"}
          </Button>
        </Box>
      )}
      <Box
        p={3}
        w={{ base: "94vw", md: "99vw" }}
        m={2}
        borderRadius="10px"
        borderWidth="2px"
        display={{
          base: "none",
          md: "block",
        }}
      >
        <Flex justify={"space-between"}>
          <Text fontSize="2xl">PrimeChat</Text>

          <Box
            display={{ base: "none", md: "block" }}
            justifyContent="space-between"
            alignItems="center"
          >
            <Button
              onClick={toggleColorMode}
              mr={4}
              borderRadius="md"
              borderWidth={1}
              fontSize="sm"
              backgroundColor="transparent"
              leftIcon={colorMode === "dark" ? <FaSun /> : <FaMoon />}
              px={4}
            >
              {colorMode === "dark" ? "Light Theme" : "Dark Theme"}
            </Button>
            {isAuthenticated && currentPath.includes("dashboard") && (
              <Button
                borderRadius="md"
                borderWidth={1}
                fontSize="sm"
                backgroundColor="transparent"
                px={4}
                mr={3}
                onClick={toggleWorkspacePanel}
                leftIcon={<FaCode />}
              >
                Dev Workspace
              </Button>
            )}
            {isAuthenticated && (
              <ProfileMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
            )}
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default Navbar;
