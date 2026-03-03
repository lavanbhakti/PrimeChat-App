import chatContext from "../../context/chatContext";
import { useState, useContext } from "react";
import {
  Flex,
  Heading,
  Input,
  Button,
  InputGroup,
  Stack,
  InputLeftElement,
  Box,
  Link,
  Avatar,
  FormControl,
  InputRightElement,
  Card,
  CardBody,
  useToast,
  HStack,
  PinInput,
  PinInputField,
  Text,
} from "@chakra-ui/react";
import { LockIcon, CheckIcon } from "@chakra-ui/icons";

const Signup = (props) => {
  const context = useContext(chatContext);
  const { hostName } = context;
  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);

  const [name, setname] = useState("");
  const [email, setemail] = useState("");
  const [password, setpassword] = useState("");
  const [confirmpassword, setconfirmpassword] = useState("");

  // OTP state
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const handletabs = props.handleTabsChange;

  function showtoast(description) {
    toast({
      title: "An error occurred.",
      description: description,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  }

  const handleShowClick = () => setShowPassword(!showPassword);

  const handleSendOtp = async () => {
    if (!email || !email.includes("@") || !email.includes(".")) {
      showtoast("Please enter a valid email address");
      return;
    }
    if (email.length > 50) {
      showtoast("Email should be at most 50 characters long");
      return;
    }

    setIsSendingOtp(true);
    try {
      const response = await fetch(`${hostName}/auth/signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setOtpVerified(false);
        setOtp("");
        toast({
          title: "OTP Sent!",
          description: "Check your email for the verification code",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      } else {
        showtoast(data.error || "Failed to send OTP");
      }
    } catch (error) {
      showtoast("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      showtoast("Please enter the 6-digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await fetch(`${hostName}/auth/verify-signup-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();

      if (response.ok && data.verified) {
        setOtpVerified(true);
        toast({
          title: "Email Verified!",
          description: "You can now complete your signup",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        showtoast(data.error || "Invalid OTP");
      }
    } catch (error) {
      showtoast("Failed to verify OTP. Please try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (email === "" || name === "" || password === "") {
      showtoast("All fields are required");
      return;
    } else if (!otpVerified) {
      showtoast("Please verify your email with OTP first");
      return;
    } else if (name.length > 20 || name.length < 3) {
      showtoast("Name should be atlest 3 and atmost 20 characters long");
      return;
    } else if (!email.includes("@") || !email.includes(".")) {
      showtoast("Invalid email");
      return;
    } else if (email.length > 50) {
      showtoast("Email should be atmost 50 characters long");
      return;
    } else if (password.length < 8 || password.length > 20) {
      showtoast("Invalid Password");
      return;
    } else if (password !== confirmpassword) {
      showtoast("Passwords do not match");
      return;
    } else {
      const payload = {
        email,
        name,
        password,
        otp,
      };

      toast.promise(
        fetch(`${hostName}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then((response) => {
            if (response.status !== 200) {
              response.json().then((resdata) => { });
              throw new Error("Failed to fetch data");
            } else {
              response.json().then((resdata) => {
                localStorage.setItem("token", resdata.authtoken);
                handletabs(0);
              });
            }
          })
          .catch((error) => { }),
        {
          loading: { title: "Creating account...", description: "please wait" },
          success: {
            title: "Account created.",
            description: "We have created your account for you.",
          },
          error: {
            title: "An error occurred.",
            description: "We were unable to create your account.",
          },
        }
      );
    }
  };

  return (
    <Flex
      flexDirection="column"
      width="100%"
      height="70vh"
      justifyContent="center"
      alignItems="center"
      borderRadius={15}
    >
      <Stack
        flexDir="column"
        mb="2"
        justifyContent="center"
        alignItems="center"
      >
        <Avatar bg="purple.300" />
        <Heading color="pruple.400">Welcome</Heading>
        <Card minW={{ base: "90%", md: "468px" }} borderRadius={15} shadow={0}>
          <CardBody p={0}>
            <form>
              <Stack spacing={4}>
                <FormControl>
                  <InputGroup
                    borderEndRadius={"10px"}
                    borderStartRadius={"10px"}
                    size={"lg"}
                  >
                    <Input
                      type="text"
                      placeholder="Enter your name"
                      focusBorderColor="purple.500"
                      onChange={(e) => setname(e.target.value)}
                      required
                    />
                  </InputGroup>
                </FormControl>

                <FormControl>
                  <InputGroup
                    borderEndRadius={"10px"}
                    borderStartRadius={"10px"}
                    size={"lg"}
                  >
                    <Input
                      type="email"
                      placeholder="Email address"
                      focusBorderColor="purple.500"
                      onChange={(e) => {
                        setemail(e.target.value);
                        // Reset OTP state if email changes
                        if (otpSent) {
                          setOtpSent(false);
                          setOtpVerified(false);
                          setOtp("");
                        }
                      }}
                      isDisabled={otpVerified}
                    />
                    <InputRightElement width="6rem" h="100%">
                      {otpVerified ? (
                        <Button
                          size="sm"
                          colorScheme="green"
                          variant="ghost"
                          leftIcon={<CheckIcon />}
                          isDisabled
                        >
                          Verified
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          colorScheme="purple"
                          onClick={handleSendOtp}
                          isLoading={isSendingOtp}
                          loadingText="..."
                        >
                          {otpSent ? "Resend" : "Send OTP"}
                        </Button>
                      )}
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* OTP Input - visible after OTP is sent */}
                {otpSent && !otpVerified && (
                  <FormControl>
                    <Box textAlign="center">
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Enter the 6-digit OTP sent to your email
                      </Text>
                      <HStack justify="center" mb={2}>
                        <PinInput
                          otp
                          size="md"
                          value={otp}
                          onChange={(value) => setOtp(value)}
                          focusBorderColor="purple.500"
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
                        size="sm"
                        colorScheme="purple"
                        onClick={handleVerifyOtp}
                        isLoading={isVerifyingOtp}
                        loadingText="Verifying..."
                        isDisabled={otp.length !== 6}
                      >
                        Verify OTP
                      </Button>
                    </Box>
                  </FormControl>
                )}

                <FormControl>
                  <InputGroup
                    borderEndRadius={"10px"}
                    borderStartRadius={"10px"}
                    size={"lg"}
                  >
                    <InputLeftElement
                      pointerEvents="none"
                      color="gray.300"
                      children={<LockIcon color="gray.300" />}
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      focusBorderColor="purple.500"
                      onChange={(e) => setpassword(e.target.value)}
                    />
                    <InputRightElement mx={1}>
                      <Button
                        fontSize={"x-small"}
                        size={"xs"}
                        onClick={handleShowClick}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>

                  <InputGroup
                    borderEndRadius={"10px"}
                    borderStartRadius={"10px"}
                    size={"lg"}
                    my={4}
                  >
                    <InputLeftElement
                      pointerEvents="none"
                      color="gray.300"
                      children={<LockIcon color="gray.300" />}
                    />
                    <Input
                      textOverflow={"ellipsis"}
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      focusBorderColor="purple.500"
                      onChange={(e) => setconfirmpassword(e.target.value)}
                    />
                    <InputRightElement mx={1}>
                      <Button
                        fontSize={"x-small"}
                        size={"xs"}
                        onClick={handleShowClick}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
                <Button
                  borderRadius={10}
                  type="submit"
                  variant="solid"
                  colorScheme="purple"
                  width="full"
                  onClick={handleSignup}
                  isDisabled={!otpVerified}
                  opacity={otpVerified ? 1 : 0.6}
                >
                  Signup
                </Button>
              </Stack>
            </form>
          </CardBody>
        </Card>
      </Stack>
      <Box>
        Already have account?{" "}
        <Link color="purple.500" onClick={() => handletabs(0)}>
          login
        </Link>
      </Box>
    </Flex>
  );
};

export default Signup;
