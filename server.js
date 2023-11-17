const express = require('express');
const { Expo } = require('expo-server-sdk');

const app = express();
const cors = require('cors');
const port = process.env.PORT || 3000;
const expo = new Expo();

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.post('/send-push-notifications', async (req, res) => {
    try {
        // Extract notificationData from the request
        const { notificationData } = req.body;
        console.log(req.body);

        // Extract push tokens and message from notificationData
        const { expoPushTokensList, message } = notificationData;
        console.log(expoPushTokensList);
        console.log(message);

        // Create the messages that you want to send to clients
        let messages = [];
        for (let pushToken of expoPushTokensList) {
            // Check that all your push tokens appear to be valid Expo push tokens
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            // Construct a message
            messages.push({
                to: pushToken,
                sound: 'default',
                title: message.title,
                body: message.body,
                data: message.data,
            });

            // // Construct a message
            // messages.push({
            //     to: pushToken,
            //     sound: 'default',
            //     body: 'This is a test notification',
            //     data: { withSome: 'data' },
            // });
        }

        // The rest of your push notification sending logic...
        // (Same as in your original code)
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
        })();

        res.status(200).json({ success: true, message: 'Push notifications sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
