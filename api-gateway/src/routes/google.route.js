import { Router } from "express";
import { oAuth2Client } from "../utils/googleAuth.js";
import { google } from "googleapis";
import { User } from "../models/user.model.js";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "../controllers/googleCalendar.controller.js";

const router = Router()

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        console.log("Something went wrong while generating tokens: ", error)
    }
}

router.get("/google", (req, res) => {
    const url = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/calendar.events.owned',
            'profile',
            'email'
        ]
    })

    res.redirect(url)
})

router.get("/google/callback", async (req, res) => {
    const code = req.query.code

    if (!code) {
        return res.status(400).json({ messsgae: "Missing Code" })
    }

    const { tokens } = await oAuth2Client.getToken(code)
    oAuth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client })
    const { data } = await oauth2.userinfo.get()

    const { email, name } = data

    if (!email || !name) {
        return res.status(400).json({ messsgae: "Email or name is missing" })
    }

    let user = await User.findOne({ email })

    if (!user) {
        user = await User.create({
            name,
            email,
            password: "google-oauth",
        });
    }

    user.google = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiryDate: new Date(tokens.expiry_date),
    }

    await user.save({ validateBeforeSave: false })

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -google"
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/"
    };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, options);

    return res.redirect("http://localhost:3000/auth/success");
})

router.route("/google/calendar").post(createCalendarEvent)
router.route("/google/calendar/update").put(updateCalendarEvent)
router.route("/google/calendar/delete").delete(deleteCalendarEvent)

export default router