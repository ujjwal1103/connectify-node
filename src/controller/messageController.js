import Chat from "../models/chat.modal.js";
import Message from "../models/message.modal.js";

export const sendMessage = async (req, res) => {
  const { userId: from } = req.user;
  const { chat } = req.params;
  const { text, messageType, to } = req.body;
  try {
    const existingChat = await Chat.findById(chat);

    if (!existingChat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }
    
    // Check if the user sending the message is a participant in the chat
    if (!existingChat.members.includes(from)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

    //

    // Create a new message
    const newMessage = new Message({
      from,
      text,
      messageType,
      to,
      chat,
    });

    // Update the "lastMessage" field in the chat
    existingChat.lastMessage = newMessage;
    await existingChat.save();

    const message = newMessage.save();

    // add this message as last message in the chat model
    await Chat.findByIdAndUpdate(
      { _id: chat },
      { lastMessage: message._id },
      { new: true }
    );

    return res.status(200).json({
      isSuccess: true,
      chatId: chat,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

// This controller allows you to retrieve messages from a specific chat.
export const getMessagesInChat = async (req, res) => {
  const { chat } = req.params;
  const { page = 1, pageSize = 20 } = req.query;
  try {
    const skip = (page - 1) * pageSize;
    const messages = await Message.find({ chat })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize))
      .exec();
    return res.status(200).json({
      isSuccess: true,
      messages: messages.reverse(),
      hasMore: messages.length > 0,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        error: "Message not found",
        isSuccess: false,
      });
    }
    // Check authorization here to ensure the user can delete the message
    await message.remove();
    return res.status(200).json({
      isSuccess: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};

export const markAllMessagesAsSeen = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.user;

  try {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        error: "Chat not found",
        isSuccess: false,
      });
    }

    // Check if the user is a participant in the chat
    if (!chat.members.includes(userId)) {
      return res.status(403).json({
        error: "You are not a participant in this chat",
        isSuccess: false,
      });
    }

    // Find all messages in the chat sent to the user and mark them as seen
    const messages = await Message.updateMany(
      { chat: chatId, to: userId },
      { isSeen: true }
    );

    return res.status(200).json({
      isSuccess: true,
      messages: messages,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      isSuccess: false,
    });
  }
};
