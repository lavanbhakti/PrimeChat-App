/**
 * PrimeChat Tabs Container
 * 
 * Wraps the MyChatList and NewChats components in a tabbed interface.
 * Used as the left sidebar content within the Dashboard layout.
 * 
 * @module ChatTabs
 */

import React, { useState } from "react";
import { Tabs, TabPanel, TabPanels } from "@chakra-ui/react";
import MyChatList from "./MyChatList";
import NewChats from "./NewChats";

const Chats = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  return (
    <>
      <Tabs
        isFitted
        variant="enclosed"
        w="100%"
        index={selectedTabIndex}
        colorScheme="purple"
        h={"100%"}
      >
        <TabPanels h="100%">
          <TabPanel
            py={1}
            mt={{ base: 2, md: 0 }}
            px={2}
            w="100%"
            borderRightWidth={{ base: "0px", md: "1px" }}
            h="100%"
          >
            <MyChatList setactiveTab={setSelectedTabIndex} />
          </TabPanel>
          <TabPanel
            mt={{ base: 2, md: 0 }}
            px={{ base: 0, md: 2 }}
            w="100%"
            borderRightWidth={{ base: "0px", md: "1px" }}
          >
            <NewChats setactiveTab={setSelectedTabIndex} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};

export default Chats;
