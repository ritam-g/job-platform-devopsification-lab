import mongoose from "mongoose";

export const checkDatabase = async () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB not connected");
    }
    return "ok";
};

export const checkEnv = async () => {
    if (!process.env.ACCESS_TOKEN_SECRET) {
        throw new Error("ACCESS_TOKEN_SECRET missing");
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
        throw new Error("REFRESH_TOKEN_SECRET missing");
    }

    return "ok";
};
