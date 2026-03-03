const Conversation = require("../Models/Conversation.js");

const createConversation = async (req, res) => {
  try {
    const { members: memberIds, isGroup, name } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({
        error: "Please provide valid members",
      });
    }

    // For groups, always create a new conversation
    if (isGroup) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Group name is required",
        });
      }

      const newConversation = await Conversation.create({
        members: memberIds,
        isGroup: true,
        name: name.trim(),
        unreadCounts: memberIds.map((memberId) => ({
          userId: memberId,
          count: 0,
        })),
      });

      await newConversation.populate("members", "-password");

      return res.status(200).json(newConversation);
    }

    // For 1:1 chats, check if conversation already exists
    const conv = await Conversation.findOne({
      members: { $all: memberIds, $size: memberIds.length },
      isGroup: { $ne: true },
    }).populate("members", "-password");

    if (conv) {
      conv.members = conv.members.filter(
        (member) => member._id.toString() !== req.user.id
      );
      return res.status(200).json(conv);
    }

    const newConversation = await Conversation.create({
      members: memberIds,
      isGroup: false,
      unreadCounts: memberIds.map((memberId) => ({
        userId: memberId,
        count: 0,
      })),
    });

    await newConversation.populate("members", "-password");

    newConversation.members = newConversation.members.filter(
      (member) => member._id.toString() !== req.user.id
    );

    return res.status(200).json(newConversation);
  } catch (error) {
    console.log("Error in createConversation:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneNum"
    );

    if (!conversation) {
      return res.status(404).json({
        error: "No conversation found",
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.log("Error in getConversation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getConversationList = async (req, res) => {
  const userId = req.user.id;

  try {
    const conversationList = await Conversation.find({
      members: { $in: userId },
    }).populate("members", "-password");

    if (!conversationList) {
      return res.status(404).json({
        error: "No conversation found",
      });
    }

    // For 1:1 chats, remove current user from members
    // For group chats, keep all members but mark which is current user
    for (let i = 0; i < conversationList.length; i++) {
      if (!conversationList[i].isGroup) {
        conversationList[i].members = conversationList[i].members.filter(
          (member) => member._id.toString() !== userId
        );
      }
    }

    conversationList.sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    res.status(200).json(conversationList);
  } catch (error) {
    console.log("Error in getConversationList:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  createConversation,
  getConversation,
  getConversationList,
};
