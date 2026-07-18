import app from "./app.js";
import "./src/config/env.js";

import connectDb from "./src/db/index.js";

connectDb()
.then(() => {
    app.listen(process.env.PORT || 5005, () => {
        console.log(`Chat server is running on port ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("Error: ", error)
})