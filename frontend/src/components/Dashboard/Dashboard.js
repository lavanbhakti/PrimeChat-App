/**
 * PrimeChat Dashboard Layout
 * 
 * Main application view after authentication. Features a resizable
 * two-panel layout: chat list sidebar and active chat area.
 * Also manages the DevWorkspace side panel toggle.
 * 
 * @module Dashboard
 */

import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import { Box, Flex, useDisclosure } from "@chakra-ui/react";
import ChatArea from "./ChatArea";
import Chats from "./Chats";
import { useNavigate } from "react-router-dom";
import primeChatContext from "../../context/chatContext";
import DevWorkspace from "./DevWorkspace";

/** Minimum width constraint for the chat panel in pixels */
const MIN_PANEL_WIDTH = 280;

/**
 * Draggable resize handle between the chat list and chat area panels.
 * Uses CSS cursor feedback and triggers the parent's resize callback.
 */
const PanelResizeHandle = ({ onDragStart }) => (
  <Box
    w="6px"
    cursor="col-resize"
    bg="transparent"
    _hover={{ bg: "purple.200" }}
    transition="background 0.2s"
    onMouseDown={onDragStart}
    userSelect="none"
    display={{ base: "none", md: "block" }}
  />
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, activeChatId, hostName, user, fetchData, socket } =
    useContext(primeChatContext);

  const [chatPanelWidth, setChatPanelWidth] = useState(350);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  // DevWorkspace panel state
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [workspacePanelWidth, setWorkspacePanelWidth] = useState(400);
  const [isDraggingWorkspace, setIsDraggingWorkspace] = useState(false);
  const workspaceRef = useRef(null);

  // Redirect unauthenticated users to home page
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Expose workspace toggle globally for the Navbar button
  useEffect(() => {
    window.toggleDevWorkspace = () => {
      setIsWorkspaceOpen((prev) => !prev);
    };
    return () => {
      delete window.toggleDevWorkspace;
    };
  }, []);

  // ── Chat panel resize handlers ──

  const initiatePanelResize = useCallback((e) => {
    e.preventDefault();
    setIsDraggingPanel(true);
  }, []);

  const handlePanelResize = useCallback(
    (e) => {
      if (!isDraggingPanel) return;
      const updatedWidth = Math.max(MIN_PANEL_WIDTH, e.clientX);
      const maxAllowed = window.innerWidth * 0.45;
      setChatPanelWidth(Math.min(updatedWidth, maxAllowed));
    },
    [isDraggingPanel]
  );

  const finishPanelResize = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  useEffect(() => {
    if (isDraggingPanel) {
      window.addEventListener("mousemove", handlePanelResize);
      window.addEventListener("mouseup", finishPanelResize);
    }
    return () => {
      window.removeEventListener("mousemove", handlePanelResize);
      window.removeEventListener("mouseup", finishPanelResize);
    };
  }, [isDraggingPanel, handlePanelResize, finishPanelResize]);

  // ── Workspace panel resize handlers ──

  const initiateWorkspaceResize = useCallback((e) => {
    e.preventDefault();
    setIsDraggingWorkspace(true);
  }, []);

  const handleWorkspaceResize = useCallback(
    (e) => {
      if (!isDraggingWorkspace) return;
      const updatedWidth = Math.max(300, window.innerWidth - e.clientX);
      const maxAllowed = window.innerWidth * 0.5;
      setWorkspacePanelWidth(Math.min(updatedWidth, maxAllowed));
    },
    [isDraggingWorkspace]
  );

  const finishWorkspaceResize = useCallback(() => {
    setIsDraggingWorkspace(false);
  }, []);

  useEffect(() => {
    if (isDraggingWorkspace) {
      window.addEventListener("mousemove", handleWorkspaceResize);
      window.addEventListener("mouseup", finishWorkspaceResize);
    }
    return () => {
      window.removeEventListener("mousemove", handleWorkspaceResize);
      window.removeEventListener("mouseup", finishWorkspaceResize);
    };
  }, [isDraggingWorkspace, handleWorkspaceResize, finishWorkspaceResize]);

  return (
    <Flex
      h={{ base: "92vh", md: "87vh" }}
      w="100%"
      overflow="hidden"
      userSelect={isDraggingPanel || isDraggingWorkspace ? "none" : "auto"}
    >
      {/* Chat List Sidebar */}
      <Box
        w={{ base: activeChatId ? "0%" : "100%", md: `${chatPanelWidth}px` }}
        display={{ base: activeChatId ? "none" : "block", md: "block" }}
        h="100%"
        minW={{ md: `${MIN_PANEL_WIDTH}px` }}
        flexShrink={0}
        overflow="hidden"
      >
        <Chats />
      </Box>

      {/* Resize Handle: Chat List ↔ Chat Area */}
      <PanelResizeHandle onDragStart={initiatePanelResize} />

      {/* Active Chat Area */}
      <Box flex={1} h="100%" overflow="hidden" minW={0}>
        <ChatArea />
      </Box>

      {/* Resize Handle: Chat Area ↔ Workspace */}
      {isWorkspaceOpen && (
        <Box
          w="6px"
          cursor="col-resize"
          bg="transparent"
          _hover={{ bg: "blue.200" }}
          transition="background 0.2s"
          onMouseDown={initiateWorkspaceResize}
          userSelect="none"
          display={{ base: "none", md: "block" }}
        />
      )}

      {/* DevWorkspace Side Panel */}
      <DevWorkspace
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        hostName={hostName}
        width={workspacePanelWidth}
        ref={workspaceRef}
      />
    </Flex>
  );
};

export default Dashboard;
