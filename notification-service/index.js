import "./src/config/env.js"

import app from "./app.js"
import connectDb from "./src/db/index.js"
import { consumeNotifications } from "./src/queues/notificationConsumer.js"

connectDb()
.then(() => {
    app.listen(process.env.PORT || 5006, () => {
        console.log(`Notification service is running on port ${process.env.PORT}`)
    })

    consumeNotifications()
})
.catch((error) => {
    console.log("Error: ", error)
})