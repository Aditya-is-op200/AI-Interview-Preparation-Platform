const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
//credentials need to be true for tokens to be accessed by the server 
/* require all the routes here */
const authRouter = require("./routes/auth.routes.js");

/* Using all the routes here  */
app.use("/api/auth", authRouter);

module.exports = app;
