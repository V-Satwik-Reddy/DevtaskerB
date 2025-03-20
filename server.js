const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

dotenv.config();
const app = express();

app.use(cookieParser());

app.use(express.json());
app.use(morgan("dev"));

//  Improved CORS setup for Cookies
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true, // **Ensures frontend can send & receive cookies**
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
    })
);

mongoose.connect(process.env.MONGO_URL,{
    maxPoolSize: 200
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1);
    });

// ✅ API Routes
app.use("/auth", require("./routes/auth"));
app.use("/home", require("./routes/home"));
app.use("/tasks", require("./routes/tasks"));
// ✅ Catch-all error handler (for better debugging)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});


// ✅ Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
