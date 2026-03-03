import { useEffect, useContext, useState, useCallback, useRef } from "react";
import {
  Box,
  Divider,
  Flex,
  useToast,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Stack,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import chatContext from "../../context/chatContext";
import Chats from "./Chats";
import { ChatArea } from "./ChatArea";
import DevWorkspace from "./DevWorkspace";

/* ─── Resize Divider ─── */
const ResizeDivider = ({ onMouseDown }) => (
  <Box
    w="6px"
    h="100%"
    cursor="col-resize"
    flexShrink={0}
    position="relative"
    _hover={{
      "& > .divider-line": {
        bg: "purple.400",
        opacity: 1,
      },
    }}
    onMouseDown={onMouseDown}
  >
    <Box
      className="divider-line"
      position="absolute"
      left="2px"
      top={0}
      bottom={0}
      w="2px"
      bg="gray.600"
      opacity={0.3}
      transition="all 0.15s"
    />
  </Box>
);

/* ─── Dashboard ─── */
const Dashboard = () => {
  const context = useContext(chatContext);
  const { user, isAuthenticated, activeChatId, hostName } = context;
  const navigator = useNavigate();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isDevWorkspaceOpen, setIsDevWorkspaceOpen] = useState(false);

  // Panel widths in pixels — null means "use default"
  const [chatsPanelWidth, setChatsPanelWidth] = useState(300);
  const [devWorkspaceWidth, setDevWorkspaceWidth] = useState(350);

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  // Expose the DevWorkspace toggle globally so Navbar can use it
  useEffect(() => {
    window.toggleDevWorkspace = () =>
      setIsDevWorkspaceOpen((prev) => !prev);
    return () => { delete window.toggleDevWorkspace; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "You are not logged in",
        description: "Please login to continue",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      navigator("/");
    }
  }, [isAuthenticated]);

  setTimeout(async () => {
    if (!isAuthenticated) {
      navigator("/");
    } else {
      setIsLoading((await user) && false);
    }
  }, 1000);

  /* ─── Drag-to-resize logic ─── */
  const handleMouseDown = useCallback(
    (panel) => (e) => {
      e.preventDefault();
      const start = {
        panel,
        x: e.clientX,
        chatsW: chatsPanelWidth,
        devW: devWorkspaceWidth,
      };

      const onMove = (e) => {
        const dx = e.clientX - start.x;
        if (start.panel === "chats") {
          setChatsPanelWidth(Math.max(220, Math.min(500, start.chatsW + dx)));
        } else {
          setDevWorkspaceWidth(Math.max(280, Math.min(600, start.devW - dx)));
        }
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        dragRef.current = false;
      };

      dragRef.current = true;
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [chatsPanelWidth, devWorkspaceWidth]
  );

  /* ─── Loading skeleton ─── */
  if (isLoading) {
    return (
      <Box display="flex" p={3} w="99%" h="85vh" borderRadius="lg" borderWidth="1px" m="auto" mt={2}>
        <Box h="80vh" w={{ base: "100%", md: "29vw" }} mt={10} mx={2}>
          <Divider mb={5} />
          <Stack>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton height="50px" key={i} borderRadius="lg" />
            ))}
          </Stack>
        </Box>
        <Box h="80vh" w="75%" display={{ base: "none", md: "block" }}>
          <Stack mt={5}>
            <SkeletonCircle size="10" mx={2} />
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonText key={i} mt={4} mx={2} noOfLines={4} spacing={4} borderRadius="lg" />
            ))}
          </Stack>
        </Box>
      </Box>
    );
  }

  /* ─── Main layout ─── */
  return (
    <Box
      w={{ base: "100vw", md: "99vw" }}
      h={{ base: "calc(100vh - 65px)", md: "calc(100vh - 65px)" }}
      m="0 auto"
      borderRadius={{ base: 0, md: "lg" }}
      borderWidth={{ base: "0px", md: "2px" }}
      overflow="hidden"
      ref={containerRef}
    >
      <Flex h="100%" overflow="hidden">
        {/* ── Chats panel ── */}
        <Box
          display={{
            base: activeChatId !== "" ? "none" : "flex",
            md: "flex",
          }}
          w={{ base: "100%", md: `${chatsPanelWidth}px` }}
          minW={{ base: "100%", md: "220px" }}
          flexShrink={0}
          h="100%"
          overflow="hidden"
        >
          <Chats />
        </Box>

        {/* ── Divider: Chats | Chat ── */}
        <Box display={{ base: "none", md: "block" }} h="100%">
          <ResizeDivider onMouseDown={handleMouseDown("chats")} />
        </Box>

        {/* ── Chat area ── */}
        <Box flex={1} h="100%" minW="350px" overflow="hidden">
          <ChatArea />
        </Box>

        {/* ── Divider: Chat | DevWorkspace ── */}
        {isDevWorkspaceOpen && (
          <Box display={{ base: "none", md: "block" }} h="100%">
            <ResizeDivider onMouseDown={handleMouseDown("devworkspace")} />
          </Box>
        )}

        {/* ── DevWorkspace sidebar ── */}
        {isDevWorkspaceOpen && (
          <DevWorkspace
            isOpen={isDevWorkspaceOpen}
            onClose={() => setIsDevWorkspaceOpen(false)}
            hostName={hostName}
            width={devWorkspaceWidth}
          />
        )}
      </Flex>
    </Box>
  );
};

export default Dashboard;
