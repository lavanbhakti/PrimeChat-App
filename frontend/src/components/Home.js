/**
 * PrimeChat Home / Landing Page
 * 
 * Serves as the entry point for unauthenticated users.
 * Provides buttons to access Login or Signup flows.
 * Redirects authenticated users to the dashboard automatically.
 * 
 * @module Home
 */

import React, { useContext, useEffect, useState } from "react";
import { Button, Box, Text, Flex, Image, Spinner } from "@chakra-ui/react";
import Auth from "./Authentication/Auth";
import { useNavigate } from "react-router-dom";
import primeChatContext from "../context/chatContext";

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useContext(primeChatContext);
  const [selectedAuthTab, setSelectedAuthTab] = useState(0);
  const [isAuthPageVisible, setIsAuthPageVisible] = useState(false);

  // Auto-redirect authenticated users to the dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  /**
   * Shows the authentication modal with the Login tab selected.
   */
  const openLoginDialog = () => {
    setSelectedAuthTab(0);
    setIsAuthPageVisible(true);
  };

  /**
   * Shows the authentication modal with the Signup tab selected.
   */
  const openSignupDialog = () => {
    setSelectedAuthTab(1);
    setIsAuthPageVisible(true);
  };

  if (isLoading) {
    return (
      <Box
        height={"92vh"}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Spinner size={"xl"} />
      </Box>
    );
  }

  return (
    <Box
      height={"92vh"}
      display={"flex"}
      justifyContent={"center"}
      alignItems={"center"}
      w={"100%"}
    >
      {!isAuthPageVisible ? (
        <Box>
          <Text fontSize="3xl" fontWeight={"bold"} textAlign={"center"} mb={5}>
            Welcome to PrimeChat
          </Text>
          <Text fontSize="lg" textAlign={"center"} mb={5}>
            Connect, Chat, and Collaborate — your private messaging hub
          </Text>
          <Flex justify={"center"} gap={3}>
            <Button
              colorScheme="purple"
              onClick={openLoginDialog}
              size="lg"
            >
              Login
            </Button>
            <Button
              colorScheme="blue"
              onClick={openSignupDialog}
              size="lg"
              variant={"outline"}
            >
              Sign Up
            </Button>
          </Flex>
        </Box>
      ) : (
        <Auth
          selectedAuthTab={selectedAuthTab}
          setSelectedAuthTab={setSelectedAuthTab}
        />
      )}
    </Box>
  );
};

export default Home;
