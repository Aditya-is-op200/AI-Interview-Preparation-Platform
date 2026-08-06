const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true)

        // In production, only allow the configured CLIENT_URL
        if (process.env.NODE_ENV === "production") {
            if (origin === process.env.CLIENT_URL) {
                return callback(null, true)
            }
            return callback(new Error(`CORS: origin ${origin} not allowed`), false)
        }

        // In development, allow any localhost origin
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true)
        }

        return callback(new Error(`CORS: origin ${origin} not allowed`), false)
    },
    credentials: true
}))
//credentials need to be true for tokens to be accessed by the server 
/* require all the routes here */
const authRouter = require("./routes/auth.routes.js");
const interviewRouter = require("./routes/interview.routes.js");

/* Using all the routes here  */
app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);
module.exports = app;
