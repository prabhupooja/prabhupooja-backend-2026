const socketIo = require("socket.io");
const db = require("./db");

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("join_chat", async ({ requestId, userId, astrologerId }) => {
            const roomName = requestId ? `chat_${requestId}` : `chat_${userId}_${astrologerId}`;
            const normalizedUserId = userId || "";
            const normalizedAstrologerId = astrologerId || "";

            if (requestId) {
                socket.join(roomName);

                try {
                    const [requestRows] = await db.query(
                        "SELECT user_id, pandit_astrologer_id, status FROM requests WHERE id = ?",
                        [requestId]
                    );

                    const requestData = requestRows[0];
                    if (requestData && requestData.status !== "accepted") {
                        await db.query(
                            "UPDATE requests SET status = ?, updated_at = NOW() WHERE id = ?",
                            ["accepted", requestId]
                        );
                        if (requestData.user_id) {
                            await db.query(
                                "UPDATE user_status SET status = 1, chat_mode = 1 WHERE user_id = ?",
                                [requestData.user_id]
                            );
                        }
                        if (requestData.pandit_astrologer_id) {
                            await db.query(
                                "UPDATE pandit_status SET chat_mode = 1 WHERE pandit_id = ?",
                                [requestData.pandit_astrologer_id]
                            );
                        }
                    }
                } catch (error) {
                    console.error("Failed to accept chat request on join:", error);
                }
            }
            if (normalizedUserId) {
                socket.join(`user_${normalizedUserId}`);
            }
            if (normalizedAstrologerId) {
                socket.join(`astrologer_${normalizedAstrologerId}`);
            }

            socket.data = { ...socket.data, requestId, userId: normalizedUserId, astrologerId: normalizedAstrologerId };
            console.log(`Socket ${socket.id} joined ${roomName}`);
        });

        socket.on("send_chat_message", async (payload) => {
            const { requestId, senderId, receiverId, message } = payload || {};

            if (!requestId || !senderId || !receiverId || !message) {
                socket.emit("chat_error", { message: "Missing required chat data" });
                return;
            }

            try {
                const timestamp = new Date();
                await db.query(
                    "INSERT INTO messages (request_id, sender_id, receiver_id, message, timestamp) VALUES (?, ?, ?, ?, ?)",
                    [requestId, senderId, receiverId, message, timestamp]
                );

                const messagePayload = {
                    requestId,
                    senderId,
                    receiverId,
                    message,
                    createdAt: timestamp.toISOString()
                };

                io.to(`chat_${requestId}`).emit("receive_chat_message", messagePayload);
                io.to(`user_${receiverId}`).emit("receive_chat_message", messagePayload);
                io.to(`astrologer_${receiverId}`).emit("receive_chat_message", messagePayload);
                socket.emit("chat_message_sent", messagePayload);
            } catch (error) {
                console.error("Socket chat send failed:", error);
                socket.emit("chat_error", { message: "Failed to send message" });
            }
        });

        socket.on("typing_chat", ({ requestId, userId, astrologerId, isTyping }) => {
            const roomName = requestId ? `chat_${requestId}` : `chat_${userId}_${astrologerId}`;
            socket.to(roomName).emit("typing_chat", { userId, astrologerId, isTyping });
        });

        socket.on("leave_chat", ({ requestId, userId, astrologerId }) => {
            const roomName = requestId ? `chat_${requestId}` : `chat_${userId}_${astrologerId}`;
            if (requestId) {
                socket.leave(roomName);
            }
            if (userId) {
                socket.leave(`user_${userId}`);
            }
            if (astrologerId) {
                socket.leave(`astrologer_${astrologerId}`);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

module.exports = { initializeSocket, getIo };
