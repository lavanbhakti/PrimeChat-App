/**
 * PrimeChat Conversation Controller
 * 
 * Manages the lifecycle of chat threads — creating 1-to-1 or group
 * conversations, retrieving conversation details and lists,
 * deleting conversations, and handling group membership changes.
 * 
 * @module ConversationController
 */

const Conversation = require("../Models/Conversation.js");

/**
 * Filters out the current user from a conversation's member list.
 * Used for 1-to-1 chats where UI only needs to show the other participant.
 * 
 * @param {Array} membersList - Populated members array
 * @param {string} currentUserId - ID of the authenticated user
 * @returns {Array} Filtered members without the current user
 */
function excludeCurrentUser(membersList, currentUserId) {
  return membersList.filter(
    (member) => member._id.toString() !== currentUserId
  );
}

/**
 * Initializes per-member unread counters for a new conversation.
 * @param {Array<string>} memberIds - Array of user IDs
 * @returns {Array<{userId: string, count: number}>}
 */
function initializeUnreadCounters(memberIds) {
  return memberIds.map((memberId) => ({ userId: memberId, count: 0 }));
}

/**
 * POST /conversation/
 * Creates a new conversation thread. For groups, always creates a new thread.
 * For 1-to-1 chats, returns existing thread if one already exists between the members.
 */
const initiateConversation = async (req, res) => {
  try {
    const { members: memberIds, isGroup, name } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
      return res.status(400).json({ error: "At least two members are required" });
    }

    // Group conversation creation flow
    if (isGroup) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Group name is required" });
      }

      const groupThread = await Conversation.create({
        members: memberIds,
        isGroup: true,
        name: name.trim(),
        unreadCounts: initializeUnreadCounters(memberIds),
      });

      await groupThread.populate("members", "-password");
      return res.status(200).json(groupThread);
    }

    // Direct message: check for existing conversation between these users
    const existingThread = await Conversation.findOne({
      members: { $all: memberIds, $size: memberIds.length },
      isGroup: { $ne: true },
    }).populate("members", "-password");

    if (existingThread) {
      existingThread.members = excludeCurrentUser(existingThread.members, req.user.id);
      return res.status(200).json(existingThread);
    }

    // No existing thread found — create new direct message thread
    const directThread = await Conversation.create({
      members: memberIds,
      isGroup: false,
      unreadCounts: initializeUnreadCounters(memberIds),
    });

    await directThread.populate("members", "-password");
    directThread.members = excludeCurrentUser(directThread.members, req.user.id);

    return res.status(200).json(directThread);
  } catch (creationError) {
    console.log("Conversation creation error:", creationError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /conversation/:id
 * Retrieves a single conversation by its ID with populated member profiles.
 */
const fetchConversationById = async (req, res) => {
  try {
    const conversationData = await Conversation.findById(req.params.id).populate(
      "members",
      "-password -phoneNum"
    );

    if (!conversationData) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).json(conversationData);
  } catch (fetchError) {
    console.log("Conversation fetch error:", fetchError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /conversation/
 * Retrieves all conversations for the authenticated user,
 * sorted by most recently updated. For 1-to-1 chats, the current
 * user is removed from the members array for cleaner UI display.
 */
const retrieveUserConversations = async (req, res) => {
  const authenticatedUserId = req.user.id;

  try {
    const allThreads = await Conversation.find({
      members: { $in: authenticatedUserId },
    }).populate("members", "-password");

    if (!allThreads) {
      return res.status(404).json({ error: "No conversations found" });
    }

    // Strip current user from 1-to-1 chat member lists (not groups)
    for (let idx = 0; idx < allThreads.length; idx++) {
      if (!allThreads[idx].isGroup) {
        allThreads[idx].members = excludeCurrentUser(
          allThreads[idx].members,
          authenticatedUserId
        );
      }
    }

    // Sort by most recent activity first
    allThreads.sort((threadA, threadB) => {
      return new Date(threadB.updatedAt).getTime() - new Date(threadA.updatedAt).getTime();
    });

    return res.status(200).json(allThreads);
  } catch (fetchError) {
    console.log("Conversation list error:", fetchError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * DELETE /conversation/:id
 * Permanently removes a conversation. Only members can delete their conversations.
 */
const removeConversation = async (req, res) => {
  try {
    const threadId = req.params.id;
    const requestingUserId = req.user.id;

    const targetThread = await Conversation.findById(threadId);

    if (!targetThread) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Verify the requesting user is a participant
    if (!targetThread.members.includes(requestingUserId)) {
      return res.status(403).json({ error: "You are not authorized to delete this conversation" });
    }

    await Conversation.findByIdAndDelete(threadId);
    return res.status(200).json({ message: "Conversation deleted successfully" });
  } catch (deleteError) {
    console.log("Conversation deletion error:", deleteError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * POST /conversation/:id/leave
 * Removes the authenticated user from a group conversation.
 * If no members remain after leaving, the group is automatically deleted.
 */
const exitGroupConversation = async (req, res) => {
  try {
    const threadId = req.params.id;
    const departingUserId = req.user.id;

    const groupThread = await Conversation.findById(threadId);

    if (!groupThread) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (!groupThread.isGroup) {
      return res.status(400).json({ error: "This operation is only for group conversations" });
    }

    if (!groupThread.members.includes(departingUserId)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Remove user from the members and unread counters
    groupThread.members = groupThread.members.filter(
      (memberId) => memberId.toString() !== departingUserId
    );
    groupThread.unreadCounts = groupThread.unreadCounts.filter(
      (entry) => entry.userId.toString() !== departingUserId
    );

    // Auto-delete the group if no members remain
    if (groupThread.members.length === 0) {
      await Conversation.findByIdAndDelete(threadId);
      return res.status(200).json({ message: "Group deleted as no members remain" });
    }

    await groupThread.save();
    return res.status(200).json({ message: "Successfully left the group" });
  } catch (leaveError) {
    console.log("Group exit error:", leaveError);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  initiateConversation,
  fetchConversationById,
  retrieveUserConversations,
  removeConversation,
  exitGroupConversation,
};
