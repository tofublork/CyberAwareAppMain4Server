const express = require('express');
const { Expo } = require('expo-server-sdk');

const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const expo = new Expo();

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// function extractExpoPushTokenFromReceipt(details) {
//     return details.expoPushToken; 
// }

app.post('/send-push-notifications', async (req, res) => {
    try {
        // Extract notificationData from the request
        const { notificationData } = req.body;
        console.log(req.body);

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

        // The Expo push notification service accepts batches of notifications so
        // that you don't need to send 1000 requests to send 1000 notifications. We
        // recommend you batch your notifications to reduce the number of requests
        // and to compress them (notifications with similar content will get
        // compressed).
        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];
        (async () => {
            // Send the chunks to the Expo push notification service. There are
            // different strategies you could use. A simple one is to send one chunk at a
            // time, which nicely spreads the load out over time:
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log(ticketChunk);
                    tickets.push(...ticketChunk);
                    // NOTE: If a ticket contains an error code in ticket.details.error, you
                    // must handle it appropriately. The error codes are listed in the Expo
                    // documentation:
                    // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                } catch (error) {
                    console.error(error);
                }
            }

            // Handle receipts after sending notifications
            let receiptIds = [];
            for (let ticket of tickets) {
                // NOTE: Not all tickets have IDs; for example, tickets for notifications
                // that could not be enqueued will have error information and no receipt ID.
                if (ticket.id) {
                    receiptIds.push(ticket.id);
                }
            }
        })();

        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        (async () => {
            // Like sending notifications, there are different strategies you could use
            // to retrieve batches of receipts from the Expo service.
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
                                // You must handle the errors appropriately.
                                console.error(`The error code is ${details.error}`);

                                // Handle DeviceNotRegistered
                                // if (details.error === 'DeviceNotRegistered') {
                                //     const expoPushToken = extractExpoPushTokenFromReceipt(details);

                                //     // Modify this part based on how you want to handle DeviceNotRegistered error
                                //     console.log(`DeviceNotRegistered for ExpoPushToken: ${expoPushToken}`);
                                // }
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

app.listen(port, () => {
    //console.log(`Server is listening at http://localhost:${port}`);
});
