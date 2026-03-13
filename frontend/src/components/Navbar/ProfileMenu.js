/**
 * PrimeChat Profile Menu Dropdown
 * 
 * Displays a dropdown menu with the user's avatar, profile link,
 * color mode toggle (mobile), and logout option.
 * 
 * @module ProfileMenu
 */

import React, { useContext } from "react";
import {
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Image,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useColorMode } from "@chakra-ui/react";
import primeChatContext from "../../context/chatContext";

const ProfileMenu = (props) => {
  const { toggleColorMode } = useColorMode();
  const appContext = useContext(primeChatContext);
  const {
    user,
    setUser,
    setIsAuthenticated,
    setActiveChatId,
    setMessageList,
    setReceiver,
  } = appContext;
  const navigate = useNavigate();

  /**
   * Signs the user out by clearing all local state and storage,
   * then redirects to the home page.
   */
  const performSignOut = async (e) => {
    e.preventDefault();
    setUser({});
    setMessageList([]);
    setActiveChatId("");
    setReceiver({});
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    console.log("User signed out");
    navigate("/");
  };

  return (
    <>
      <Menu>
        {
          <>
            <MenuButton
              isActive={props.isOpen}
              as={Button}
              rightIcon={<ChevronDownIcon />}
              leftIcon={
                <Image
                  boxSize="26px"
                  borderRadius="full"
                  src={user.profilePic}
                  alt="profile-pic"
                />
              }
            >
              <Text
                display={{
                  base: "none",
                  md: "block",
                }}
                fontSize={"13px"}
              >
                {user.name}
              </Text>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={props.onOpen}>MyProfile</MenuItem>
              <MenuItem
                display={{
                  base: "block",
                  md: "none",
                }}
                onClick={toggleColorMode}
              >
                {localStorage.getItem("chakra-ui-color-mode") === "light"
                  ? "Dark Mode"
                  : "Light Mode"}
              </MenuItem>
              <MenuItem color={"red"} onClick={performSignOut}>
                Logout
              </MenuItem>
            </MenuList>
          </>
        }
      </Menu>
      <ProfileModal
        isOpen={props.isOpen}
        onClose={props.onClose}
        user={user}
        setUser={setUser}
      />
    </>
  );
};

export default ProfileMenu;
