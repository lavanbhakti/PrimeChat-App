/**
 * PrimeChat Login Component
 * 
 * Handles user authentication via email+password or email+OTP.
 * Users can switch between password and OTP login modes.
 * On success, stores JWT and redirects to dashboard.
 * 
 * @module LoginForm
 */

import React from "react";
import {
  Stack,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Text,
} from "@chakra-ui/react";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import primeChatContext from "../../context/chatContext";
import { useToast } from "@chakra-ui/react";
import { ViewOffIcon, ViewIcon } from "@chakra-ui/icons";

const Login = () => {
  const navigate = useNavigate();
  const appContext = useContext(primeChatContext);
  const { setIsAuthenticated, setUser, socket, hostName, fetchData } = appContext;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);

  const toast = useToast();

  /**
   * Displays a notification toast with consistent styling.
   */
  const showNotification = (title, description, status) => {
    toast({
      title,
      description,
      status,
      duration: 5000,
      isClosable: true,
      position: "bottom",
    });
  };

  /**
   * Sends a one-time password to the user's email for passwordless login.
   */
  const requestLoginOtp = async () => {
    if (!email) {
      showNotification("Missing Email", "Please enter your email address first", "warning");
      return;
    }

    setIsOtpSending(true);
    try {
      const response = await fetch(`${hostName}/auth/getotp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();

      if (response.status === 200) {
        showNotification("OTP Sent", "Check your email for the verification code", "success");
        setIsOtpMode(true);
      } else {
        showNotification("Error", responseData.error || "Failed to send OTP", "error");
      }
    } catch (networkError) {
      showNotification("Connection Error", "Unable to reach the server", "error");
    } finally {
      setIsOtpSending(false);
    }
  };

  /**
   * Submits login credentials (email + password or email + OTP)
   * and handles the authentication response.
   */
  const submitLoginCredentials = async (e) => {
    e.preventDefault();

    if (!email) {
      showNotification("Missing Field", "Email is required", "warning");
      return;
    }

    if (!isOtpMode && !password) {
      showNotification("Missing Field", "Password is required", "warning");
      return;
    }

    if (isOtpMode && !otp) {
      showNotification("Missing Field", "OTP is required", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const loginPayload = isOtpMode ? { email, otp } : { email, password };

      const response = await fetch(`${hostName}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload),
      });

      const responseData = await response.json();

      if (response.status === 200) {
        localStorage.setItem("token", responseData.authtoken);
        localStorage.setItem("user", JSON.stringify(responseData.user));
        setUser(responseData.user);
        setIsAuthenticated(true);
        socket.emit("setup", responseData.user._id);
        fetchData();
        navigate("/dashboard");
        showNotification("Welcome!", "Login successful", "success");
      } else {
        showNotification("Login Failed", responseData.error || "Invalid credentials", "error");
      }
    } catch (networkError) {
      showNotification("Connection Error", "Unable to reach the server", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={submitLoginCredentials}>
      <Stack spacing={4} mt={4}>
        <Input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {!isOtpMode ? (
          <InputGroup>
            <Input
              type={isPasswordHidden ? "password" : "text"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <InputRightElement>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPasswordHidden(!isPasswordHidden)}
              >
                {isPasswordHidden ? <ViewIcon /> : <ViewOffIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
        ) : (
          <Input
            type="text"
            placeholder="Enter OTP from your email"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        )}

        <Button
          colorScheme="purple"
          type="submit"
          isLoading={isSubmitting}
          loadingText="Logging in..."
        >
          Login
        </Button>

        <Button
          variant="link"
          colorScheme="blue"
          onClick={isOtpMode ? () => setIsOtpMode(false) : requestLoginOtp}
          isLoading={isOtpSending}
          loadingText="Sending OTP..."
        >
          {isOtpMode ? "Use Password Instead" : "Login with OTP"}
        </Button>

        {!isOtpMode && (
          <Text fontSize="sm" textAlign="center" color="gray.500">
            We'll send a one-time code to your email
          </Text>
        )}
      </Stack>
    </form>
  );
};

export default Login;
