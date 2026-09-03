const SimplePeer = require('simple-peer');
const UserModel = require('../models/userModel');

const SocketController = (io) => {
    io.on('connection', (socket) => {
        console.log('New user connected:', socket.id);

        socket.on('register', async (username) => {
            try {
                await UserModel.registerUser(username, socket.id);
                io.to(socket.id).emit('me', socket.id);
            } catch (err) {
                console.error('Error registering user:', err);
            }
        });

        socket.on('callUser', async (data) => {
            try {
                const userToCall = await UserModel.findUserById(data.userToCall);
                if (userToCall) {
                    io.to(userToCall.socket_id).emit('receiveCall', { signal: data.signal, from: data.from });
                } else {
                    console.log('User to call not found');
                }
            } catch (err) {
                console.error('Error calling user:', err);
            }
        });

        socket.on('answerCall', async (data) => {
            try {
                const user = await UserModel.findUserById(data.to);
                if (user) {
                    io.to(user.socket_id).emit('callAccepted', data.signal);
                } else {
                    console.log('User not found to answer call');
                }
            } catch (err) {
                console.error('Error answering call:', err);
            }
        });

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);
            try {
                await UserModel.deleteUser(socket.id);
            } catch (err) {
                console.error('Error deleting user:', err);
            }
        });
    });
};

module.exports = SocketController;