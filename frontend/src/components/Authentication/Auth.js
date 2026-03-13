/**
 * PrimeChat Authentication Container
 * 
 * Renders tabbed Login and Signup forms within a centered card layout.
 * Manages tab switching between the two authentication flows.
 * 
 * @module AuthContainer
 */

import React from "react";
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Box,
} from "@chakra-ui/react";
import Login from "./Login";
import Signup from "./Signup";

const Auth = ({ selectedAuthTab, setSelectedAuthTab }) => {
  return (
    <Box
      w={{ base: "90%", md: "400px" }}
      p={5}
      borderWidth="1px"
      borderRadius="lg"
    >
      <Tabs
        isFitted
        variant="enclosed"
        colorScheme="purple"
        index={selectedAuthTab}
        onChange={(tabIndex) => setSelectedAuthTab(tabIndex)}
      >
        <TabList>
          <Tab>Login</Tab>
          <Tab>Sign Up</Tab>
        </TabList>
        <TabPanels>
          <TabPanel>
            <Login />
          </TabPanel>
          <TabPanel>
            <Signup />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default Auth;
