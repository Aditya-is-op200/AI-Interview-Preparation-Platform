const userModel = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const tokenBlackListModel = require("../models/blacklist.model")

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
            })
        }
        const userAlreadyExists = await userModel.findOne(
            {
                $or: [{ username }, { email }]
                // this $or is a mongoose query operator which means that it will check if the username or email is already present in the database
                //used when checking both fields at once. if either one is present, it will return the user
            });
        if (userAlreadyExists) {
            return res.status(400).json({
                success: false,
                message: `User already exists with username ${username} or email ${email}`
            })
        }

        //Now the process of creating a new user starts ->

        const hash = await bcrypt.hash(password, 10);  // 10 is the salt factor, determines the complexity of the hash
        const user = await userModel.create({
            username,
            email,
            password: hash
        });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        // Now we will set this token to the cookies ->
        res.cookie("token", token);
        res.status(201).json({
            message: "User registered successfully",
            user: {
                username: user.username,
                email: user.email,
                id: user._id
            }
        })

    } catch (error) {

    }
}

/**
 * @name : loginUserController
 * @description : Login a registered user
 * @route : POST /api/auth/login
 * @access : Public
 * @param {String} req.body.username
 * @param {String} req.body.password
 * @returns {JSON}
 */

async function loginUserController(req, res) {
    const { email, username } = req.body;

    const user = await userModel.findOne({ email })
    if (!user) {
        return res.status(400).json({
            success: false,
            message: "User not found"
        })
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.password);
    if (!isPasswordValid) {
        return res.status(400).json({
            success: false,
            message: "Invalid password"
        })
    }
    //if password is valid then we will create a token 
    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token);
    res.status(200).json({
        message: "User logged in Successfully",
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
        }
    })

}
async function logoutUserController(req, res) {

    const token = req.cookies.token

    if (token) {
        await tokenBlackListModel.create({ token })
    }

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController
}