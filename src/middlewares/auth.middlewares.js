const jwt = require("jsonwebtoken")
const tokenBlackListModel = require("../models/blacklist.model")
async function authUser(req, res, next) {

    const token = req.cookies.token
    const isBlacklisted = await tokenBlackListModel.findOne({token})

    if (!token) {
        return res.status(401).json({
            message: "Token not provided."
        })
    }
    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized: Token is blacklisted."
        })
    }
    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        //jwt.verify returns the decoded token, which contains the user id and username, which is used to identify the user
        req.user = decoded  //now this decoded token is attached to the req object
        next()  //now the next middleware or route handler will be executed

    } catch (err) {
        //catch block executes when token doesn't match
        return res.status(401).json({
            message: "Invalid token."
        })
    }

}

module.exports = { authUser }