/**
 * PrimeChat Loading Spinner
 * 
 * A centered spinner component used as a placeholder
 * while chat messages or conversations are being loaded.
 * 
 * @module ChatLoadingSpinner
 */

import { Box, Spinner } from "@chakra-ui/react";
import React from "react";

const ChatLoadingSpinner = () => {
  return (
    <Box
      m={5}
      w={"fit-content"}
      h={"max-content"}
      mx={"auto"}
      my={"50px"}
      alignSelf={"center"}
    >
      {" "}
      <Spinner size={"xl"} />
    </Box>
  );
};

export default ChatLoadingSpinner;
