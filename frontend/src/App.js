/**
 * PrimeChat Root Component
 * 
 * Top-level application wrapper that provides the Navbar
 * and color mode toggle functionality.
 * 
 * @module App
 */

import "./App.css";
import { useColorMode } from "@chakra-ui/react";
import Navbar from "./components/Navbar/Navbar";
import { useContext } from "react";
import primeChatContext from "./context/chatContext";

function App(props) {
  const { toggleColorMode } = useColorMode();
  const appContext = useContext(primeChatContext);

  return (
    <div className="App">
      <Navbar toggleColorMode={toggleColorMode} context={appContext} />
    </div>
  );
}

export default App;
