/**
 * PrimeChat Signup Component
 * 
 * Handles new user registration with email OTP verification.
 * The flow is: 1) Enter details → 2) Send OTP → 3) Verify OTP → 4) Register.
 * On success, stores JWT and redirects to dashboard.
 * 
 * @module SignupForm
 */

import React from "react";
import {
  Stack,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  HStack,
  PinInput,
  PinInputField,
} from "@chakra-ui/react";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import primeChatContext from "../../context/chatContext";
import { useToast } from "@chakra-ui/react";
import { ViewOffIcon, ViewIcon } from "@chakra-ui/icons";

const Signup = () => {
  const navigate = useNavigate();
  const appContext = useContext(primeChatContext);
  const { setIsAuthenticated, setUser, socket, hostName, fetchData } = appContext;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP verification state
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

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
   * Validates input fields before allowing OTP request or registration.
   * @returns {boolean} True if all fields are valid
   */
  const validateFormFields = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      showNotification("Missing Fields", "All fields are required", "warning");
      return false;
    }

    if (password !== confirmPassword) {
      showNotification("Password Mismatch", "Passwords do not match", "error");
      return false;
    }

    if (password.length < 6) {
      showNotification("Weak Password", "Password must be at least 6 characters", "warning");
      return false;
    }

    return true;
  };

  /**
   * Requests an OTP to be sent to the user's email for verification.
   */
  const requestVerificationCode = async () => {
    if (!validateFormFields()) return;

    setIsSendingOtp(true);
    try {
      const response = await fetch(`${hostName}/auth/signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();

      if (response.status === 200) {
        showNotification("OTP Sent", "Check your email for the verification code", "success");
        setIsOtpSent(true);
      } else {
        showNotification("Error", responseData.error || "Failed to send OTP", "error");
      }
    } catch (networkError) {
      showNotification("Connection Error", "Unable to reach the server", "error");
    } finally {
      setIsSendingOtp(false);
    }
  };

  /**
   * Verifies the OTP entered by the user against the server.
   */
  const confirmVerificationCode = async () => {
    if (!otpCode || otpCode.length < 6) {
      showNotification("Invalid OTP", "Please enter the complete 6-digit code", "warning");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`${hostName}/auth/verify-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const responseData = await response.json();

      if (response.status === 200 && responseData.verified) {
        showNotification("Verified", "Email verified successfully!", "success");
        setIsEmailVerified(true);
      } else {
        showNotification("Verification Failed", responseData.error || "Invalid OTP", "error");
      }
    } catch (networkError) {
      showNotification("Connection Error", "Unable to reach the server", "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /**
   * Submits the registration form with verified OTP.
   * Creates the user account and automatically logs them in.
   */
  const submitRegistration = async (e) => {
    e.preventDefault();

    if (!validateFormFields()) return;

    if (!isEmailVerified) {
      showNotification("Verification Required", "Please verify your email first", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationPayload = {
        name: fullName,
        email,
        password,
        otp: otpCode,
      };

      const response = await fetch(`${hostName}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationPayload),
      });

      const responseData = await response.json();

      if (response.status === 200) {
        localStorage.setItem("token", responseData.authtoken);
        setIsAuthenticated(true);

        // Fetch the newly created user profile
        const profileResponse = await fetch(`${hostName}/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": responseData.authtoken,
          },
        });

        const userProfile = await profileResponse.json();
        setUser(userProfile);
        localStorage.setItem("user", JSON.stringify(userProfile));
        socket.emit("setup", userProfile._id);
        fetchData();
        navigate("/dashboard");
        showNotification("Welcome!", "Account created successfully", "success");
      } else {
        showNotification("Registration Failed", responseData.error || "Something went wrong", "error");
      }
    } catch (networkError) {
      showNotification("Connection Error", "Unable to reach the server", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={submitRegistration}>
      <Stack spacing={4} mt={4}>
        <Input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // Reset verification status if email changes
            setIsOtpSent(false);
            setIsEmailVerified(false);
            setOtpCode("");
          }}
          isDisabled={isEmailVerified}
        />

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

        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {/* OTP Verification Flow */}
        {!isEmailVerified && !isOtpSent && (
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={requestVerificationCode}
            isLoading={isSendingOtp}
            loadingText="Sending OTP..."
          >
            Verify Email
          </Button>
        )}

        {isOtpSent && !isEmailVerified && (
          <>
            <Text fontSize="sm" textAlign="center" color="gray.500">
              Enter the 6-digit code sent to your email
            </Text>
            <HStack justify="center">
              <PinInput
                otp
                size="lg"
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
              >
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <PinInputField />
              </PinInput>
            </HStack>
            <Button
              colorScheme="green"
              onClick={confirmVerificationCode}
              isLoading={isVerifyingOtp}
              loadingText="Verifying..."
            >
              Verify OTP
            </Button>
            <Button
              variant="link"
              size="sm"
              onClick={requestVerificationCode}
              isLoading={isSendingOtp}
            >
              Resend Code
            </Button>
          </>
        )}

        {isEmailVerified && (
          <Text fontSize="sm" color="green.500" textAlign="center">
            ✅ Email verified successfully
          </Text>
        )}

        <Button
          colorScheme="purple"
          type="submit"
          isLoading={isSubmitting}
          loadingText="Creating Account..."
          isDisabled={!isEmailVerified}
        >
          Create Account
        </Button>
      </Stack>
    </form>
  );
};

export default Signup;
