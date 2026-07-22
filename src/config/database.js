const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log("URI:", process.env.MONGO_URI);

        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(error);
    }
};

module.exports = connectDB;