const express = require('express');
const { Expo } = require('expo-server-sdk');

const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const expo = new Expo();

app.use(cors()); // Enable CORS for all routes
app.use(express.json());


let receiptIds = [];

app.post('/send-push-notifications', async (req, res) => {
    try {
        // Extract notificationData from the request
        const { notificationData } = req.body;

        // Extract push tokens and message from notificationData
        const { to, title, body, data } = notificationData;

        // Create the messages that you want to send to clients
        let messages = [];
        for (let pushToken of to) {
            // Check that all your push tokens appear to be valid Expo push tokens
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            // Construct a message
            messages.push({
                to: pushToken,
                sound: 'default',
                title: title,
                body: body,
                data: data,
            });
        }

        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];
        (async () => {
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log(ticketChunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    console.error(error);
                }
            }

            // Handle receipts after sending notifications
            for (let ticket of tickets) {
                if (ticket.id) {
                    receiptIds.push(ticket.id);
                }
            }
        })();

        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        (async () => {
            // retrieve batches of receipts from the Expo service.
            for (let chunk of receiptIdChunks) {
                try {
                    let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
                    console.log(receipts);

                    // The receipts specify whether Apple or Google successfully received the
                    // notification and information about an error, if one occurred.
                    for (let receiptId in receipts) {
                        let { status, message, details } = receipts[receiptId];
                        if (status === 'ok') {
                            continue;
                        } else if (status === 'error') {
                            console.error(
                                `There was an error sending a notification: ${message}`
                            );
                            if (details && details.error) {
                                // The error codes are listed in the Expo documentation:
                                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                                console.error(`The error code is ${details.error}`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        })();

        res.status(200).json({ success: true, message: 'Push notifications sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

