import jwt from "jsonwebtoken"
import { Message } from "../models/message.model.js"
import { publishToQueue } from "../utils/rabbitmq.js"

export const chatSocketHandler = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token

            if(!token) {
                return res.status(400).json({ message: "Token is missing"})
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            socket.data = { user: decoded }
            next()
        } catch (error) {
            console.log("Verify JWT error: ", error)
            return res.status(400).json({error: error})
        }
    })

    io.on('connection', (socket) => {
        const userId = socket.data.user._id
        
        if(!userId) {
            return socket.disconnect()
        }

        socket.join(userId)
        console.log(`User-${userId} connected via socket`)

        socket.on('sendMessage', async({receiverId, message}) => {
            try {
                if(!receiverId || !message) {
                    return socket.emit('error', 'Invalid message payload')
                }
    
                const newMsg = await Message.create({
                    senderId: userId,
                    receiverId,
                    message,
                })
    
                io.to(userId).emit('newMessage', newMsg)
                io.to(receiverId).emit('newMessage', newMsg)

                await publishToQueue({
                    userId: receiverId,
                    message: `New message from user-${userId}`,
                    type: "info",
                    metadata: {
                        senderId: userId,
                        receiverId,
                        messageId: newMsg._id
                    }
                })
            } catch (error) {
                console.log(error);
                socket.emit('error', 'Failed to send message')
            }
        })

        socket.on('messageDelivered', async (messageId) => {
            try {
                await Message.findByIdAndUpdate(messageId, { delivered: true })
                const message = await Message.findById(messageId)
                io.to(message.senderId).emit('messageStatusUpdate', {
                    messageId,
                    status: 'delivered',
                })
            } catch (error) {
                console.log('Error marking message as delivered:', error)
                socket.emit('error', 'Failed to mark message as delivered')
            }
        })

        socket.on('messageSeen', async({ messageIds }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds }, receiverId: userId },
                    { $set: { seen: true } }
                )

                for(const id of messageIds) {
                    const message = await Message.findById(id)
                    if(message && message.senderId) {
                        io.to(message.senderId).emit('messageSeenUpdate', {
                            messageId: id
                        })
                    }
                }
            } catch (error) {
                console.log('Error marking message as seen:', error)
                socket.emit('error', 'Failed to mark message as seen')
            }
        })

        socket.on('typing', async({ toUserId }) => {
            try {
                io.to(toUserId).emit('typing', {
                    from: userId
                })
            } catch (error) {
                console.log('Error marking typing:', error)
                socket.emit('error', 'Failed to mark typing')
            }
        })

        socket.io('stopTyping', async({ toUserId }) => {
            try {
                io.to(toUserId).emit('stopTyping', {
                    from: userId
                })
            } catch (error) {
                console.log('Error marking stop typing:', error)
                socket.emit('error', 'Failed to mark stop typing')
            }
        })

        socket.on('disconnect', () => {
            console.log(`User-${userId} disconnected`);
        })
    })
}