const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Health check route */
app.get("/health", (req, res) => {
    const mongoose = require("mongoose");
    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };
    const dbState = mongoose.connection.readyState;

    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: states[dbState] || "unknown"
    });
});

/* require all the routes here */
const authRouter = require("./routes/auth.routes.js");

/* Using all the routes here  */
app.use("/api/auth", authRouter);

module.exports = app;
