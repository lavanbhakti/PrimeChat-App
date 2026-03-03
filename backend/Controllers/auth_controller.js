const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Conversation = require("../Models/Conversation.js");
const ObjectId = require("mongoose").Types.ObjectId;
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const { JWT_SECRET } = require("../secrets.js");

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// In-memory store for signup OTPs: { email: { otp, expiry } }
const signupOtpStore = {};

const register = async (req, res) => {
  try {
    console.log("register request received");

    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp) {
      return res.status(400).json({
        error: "Please fill all the fields and verify OTP",
      });
    }

    // Verify signup OTP
    const storedOtp = signupOtpStore[email.toLowerCase()];
    if (!storedOtp || storedOtp.otp !== otp || Date.now() > storedOtp.expiry) {
      return res.status(400).json({
        error: "Invalid or expired OTP. Please request a new one.",
      });
    }
    // OTP is valid, remove it from store
    delete signupOtpStore[email.toLowerCase()];

    if (email.endsWith("bot")) {
      return res.status(400).json({
        error: "Invalid email",
      });
    }

    const user = await User.findOne({
      email: email,
    });

    if (user) {
      return res.status(400).json({
        error: "User already exists",
      });
    }
    var imageUrl = `https://ui-avatars.com/api/?name=${name}&background=random&bold=true`;

    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: secPass,
      profilePic: imageUrl,
      about: "Hello World!!",
    });

    await newUser.save();

    const us = await User.findOne({ email: email });
    us._id = new ObjectId();
    us.name = "AI Chatbot";
    us.email = email + "bot";
    us.about = "I am an AI Chatbot to help you";
    us.profilePic =
      "https://play-lh.googleusercontent.com/Oe0NgYQ63TGGEr7ViA2fGA-yAB7w2zhMofDBR3opTGVvsCFibD8pecWUjHBF_VnVKNdJ";
    await User.insertMany(us);

    const bot = await User.findOne({ email: email + "bot" });

    const newConversation = new Conversation({
      members: [newUser._id, bot._id],
    });

    await newConversation.save();

    const data = {
      user: {
        id: newUser.id,
      },
    };

    const authtoken = jwt.sign(data, JWT_SECRET);
    res.json({
      authtoken,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const login = async (req, res) => {
  console.log("login request received");

  try {
    const { email, password, otp } = req.body;

    if (!email || (!password && !otp)) {
      return res.status(400).json({
        error: "Please fill all the fields",
      });
    }

    const user = await User.findOne({
      email: email,
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid Credentials",
      });
    }
    if (otp) {
      if (user.otp != otp) {
        return res.status(400).json({
          error: "Invalid otp",
        });
      }
      user.otp = "";
      await user.save();
    } else {
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({
          error: "Invalid Credentials",
        });
      }
    }

    const data = {
      user: {
        id: user.id,
      },
    };

    const authtoken = jwt.sign(data, JWT_SECRET);
    res.json({
      authtoken,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const authUser = async (req, res) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send("Please authenticate using a valid token");
  }

  try {
    const data = jwt.verify(token, JWT_SECRET);

    if (!data) {
      return res.status(401).send("Please authenticate using a valid token");
    }

    const user = await User.findById(data.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const getNonFriendsList = async (req, res) => {
  try {
    // find all friends(all other members in conversations) and user whose email not endswith bot
    const conversations = await Conversation.find({
      members: { $in: [req.user.id] },
      isGroup: false,
    });

    const users = await User.find({
      _id: { $nin: conversations.flatMap((c) => c.members) },
      email: { $not: /bot$/ },
    });

    res.json(users);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const updateprofile = async (req, res) => {
  try {
    const dbuser = await User.findById(req.user.id);

    if (req.body.newpassword) {
      const passwordCompare = await bcrypt.compare(
        req.body.oldpassword,
        dbuser.password
      );
      if (!passwordCompare) {
        return res.status(400).json({
          error: "Invalid Credentials",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.newpassword, salt);
      req.body.password = secPass;

      delete req.body.oldpassword;
      delete req.body.newpassword;
    }
    await User.findByIdAndUpdate(req.user.id, req.body);
    res.status(200).json({ message: "Profile Updated" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const sendotp = async (req, res) => {
  try {
    console.log("sendotp request received");
    const { email } = req.body;
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    await user.save();

    //delete otp after 5 minutes
    setTimeout(() => {
      user.otp = "";
      user.save();
    }, 300000);

    let mailDetails = {
      from: process.env.EMAIL,
      to: email,
      subject: "Login with your Otp",

      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <title>Otp for Login</title>
          <style>
              .container {
                  width: 50%;
                  margin: 0 auto;
                  background: #f4f4f4;
                  padding: 20px;
              }
              h1 {
                  text-align: center;
              }
    
          </style> 
      </head>
      <body>
              <strong><h1>Prime-Chat - online chatting app</h1></strong>
          <div class="container">
              <h2>Your Otp is</h2>
              <strong><p>${otp}</p><strong>
              <p>Use this Otp to login</p>
          </div>
      </body>
      </html>`,
    };

    await mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        console.log("Error Occurs", err);
        res.status(400).json({ message: "Error Occurs" });
      } else {
        console.log("Email sent successfully");
        res.status(200).json({ message: "OTP sent" });
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Get all users except bots and the current user
    const users = await User.find({
      _id: { $ne: req.user.id },
      email: { $not: /bot$/ },
    }).select("-password");

    res.json(users);
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    res.status(500).send("Internal Server Error");
  }
};

const sendSignupOtp = async (req, res) => {
  try {
    console.log("sendSignupOtp request received");
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists. Please login." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    signupOtpStore[email.toLowerCase()] = {
      otp,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      delete signupOtpStore[email.toLowerCase()];
    }, 5 * 60 * 1000);

    let mailDetails = {
      from: process.env.EMAIL,
      to: email,
      subject: "Signup OTP - PrimeChat",
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <title>Signup OTP</title>
          <style>
              .container { width: 50%; margin: 0 auto; background: #f4f4f4; padding: 20px; }
              h1 { text-align: center; }
          </style>
      </head>
      <body>
              <strong><h1>PrimeChat - Signup Verification</h1></strong>
          <div class="container">
              <h2>Your OTP is</h2>
              <strong><p style="font-size:24px;letter-spacing:4px;">${otp}</p></strong>
              <p>Use this OTP to complete your signup. It expires in 5 minutes.</p>
          </div>
      </body>
      </html>`,
    };

    await mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        console.log("Error sending signup OTP:", err);
        res.status(400).json({ error: "Failed to send OTP" });
      } else {
        console.log("Signup OTP sent successfully");
        res.status(200).json({ message: "OTP sent to your email" });
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const storedOtp = signupOtpStore[email.toLowerCase()];
    if (!storedOtp) {
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }
    if (Date.now() > storedOtp.expiry) {
      delete signupOtpStore[email.toLowerCase()];
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }
    if (storedOtp.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    res.status(200).json({ message: "OTP verified successfully", verified: true });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getAllUsers,
  register,
  login,
  getNonFriendsList,
  authUser,
  updateprofile,
  sendotp,
  sendSignupOtp,
  verifySignupOtp,
};