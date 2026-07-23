const express = require("express");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* require all the routes here */
const authRouter = require("./routes/auth.routes.js");

/* Using all the routes here  */
app.use("/api/auth", authRouter);

module.exports = app;
