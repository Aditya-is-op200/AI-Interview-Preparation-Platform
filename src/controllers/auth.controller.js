const userModel = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * description: Register a new user and expects username, email and password in the body
 * route: POST /api/auth/register
 * access: Public
 * @param {String} req.body.username
 * @param {String} req.body.email
 * @param {String} req.body.password
 * @returns {JSON}
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const userAlreadyExists = await userModel.findOne({
            $or: [{ username }, { email }]
        });

        if (userAlreadyExists) {
            return res.status(400).json({
                success: false,
                message: `User already exists with username ${username} or email ${email}`
            });
        }

        const hash = await bcrypt.hash(password, 10);
        const user = await userModel.create({
            username,
            email,
            password: hash
        });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "1d" }
        );

        res.cookie("token", token, { httpOnly: true });
        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

/**
 * @name : loginUserController
 * @description : Login a registered user
 * @route : POST /api/auth/login
 * @access : Public
 * @param {String} req.body.username
 * @param {String} req.body.email
 * @param {String} req.body.password
 * @returns {JSON}
 */
async function loginUserController(req, res) {
    try {
        const { email, username, password } = req.body;
        const identifier = email || username;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Email or username, and password are required"
            });
        }

        const user = await userModel.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid password"
            });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "1d" }
        );

        res.cookie("token", token, { httpOnly: true });
        return res.status(200).json({
            success: true,
            message: "User logged in Successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    registerUserController,
    loginUserController
};