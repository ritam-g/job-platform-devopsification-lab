import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJWT } from "./src/middlewares/auth.middleware.js";
import { checkDatabase, checkEnv } from "./src/utils/healthChecks.js";

const app = express()

const corsOptions = {
  origin: "http://localhost:3000", // your frontend address
  credentials: true, // allow cookies and headers like authorization
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // allowed methods
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // allowed headers
};

app.use(cors(corsOptions))
app.use(cookieParser())

app.get("/", (req, res) => {
    res.send("Api-gateway is running")
})

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "api-gateway",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
  });
})

app.get("/ready", async(req, res) => {
    const services = {
        database: "unknown",
        env: "unknown"
    };
    try {
        await checkDatabase();
        services.database = "ok";

        await checkEnv();
        services.env = "ok";

        res.status(200).json({
            status: "ready",
            services
        });
    } catch (error) {
        res.status(503).json({
            status: "not ready",
            services,
            error: error.message
        });
    }
})

app.use("/api/user/profile", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5001",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/profile";
            return "/api/profile" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)

app.use("/api/job", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5002",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/job";
            return "/api/job" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)

app.use("/api/application", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5003",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/application";
            return "/api/application" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)

app.use("/api/interview", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5004",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/interview";
            return "/api/interview" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)

app.use("/api/notification", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5006",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/notification";
            return "/api/notification" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)

app.use("/api/chat", verifyJWT, 
    (req, res, next) => {
        if(req.user) {
            req.headers['x-user'] = JSON.stringify(req.user)
        }
        next()
    },
    createProxyMiddleware({
        target: "http://localhost:5005",
        changeOrigin: true,
        pathRewrite: (path, req) => {
            if (path === "/") return "/api/chat";
            return "/api/chat" + path;
        },
        onProxyReq: (proxyReq, req, res) => {
            console.log("Proxy request made to:", proxyReq.path);
        },
    })
)


app.use(express.json())

import authRouter from "./src/routes/user.route.js"
import googleRouter from "./src/routes/google.route.js"

app.use("/api/user", authRouter)
app.use("/api/auth", googleRouter)
  
export default app