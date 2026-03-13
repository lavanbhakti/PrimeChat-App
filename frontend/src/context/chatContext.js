/**
 * PrimeChat Application Context
 * 
 * Creates the React context instance used throughout the application
 * for sharing authentication state, chat data, and socket connection.
 * 
 * @module PrimeChatContext
 */

import { createContext } from "react";

const primeChatContext = createContext();

export default primeChatContext;