require("dotenv").config();

const connectDB = require("./src/config/database.js");
const app = require("./src/app.js");

const PORT = process.env.PORT || 3000;

// Start server immediately (don't wait for DB)
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Connect to DB in parallel
connectDB();
