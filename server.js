const express = require('express');
const { Expo } = require('expo-server-sdk');

const app = express();
const port = 3000;
const expo = new Expo();

app.use(express.json());

app.post('/send-push-notifications', async (req, res) => {
    try {
        // Extract push tokens from the request
        const somePushTokens = req.body.pushTokens;

        // Create the messages that you want to send to clients
        let messages = [];
        for (let pushToken of somePushTokens) {
            // Check that all your push tokens appear to be valid Expo push tokens
            if (!Expo.isExpoPushToken(pushToken)) {
                console.error(`Push token ${pushToken} is not a valid Expo push token`);
                continue;
            }

            // Construct a message
            messages.push({
                to: pushToken,
                sound: 'default',
                body: 'This is a test notification',
                data: { withSome: 'data' },
            });
        }

        // The rest of your push notification sending logic...
        // (Same as in your original code)

        res.status(200).json({ success: true, message: 'Push notifications sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
