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
        origin: ["http://localhost:3000","https://v-satwik-reddy.github.io"],
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

require("./scheduler");

// ✅ API Routes
app.use("/auth", require("./routes/auth"));
app.use("/home", require("./routes/home"));
app.use("/tasks", require("./routes/tasks"));
app.get("/",(req,res)=>{
    res.send("Welcome to Task Manager API. You can find all the routes in the /routes");
});
app.get("/routes",(req,res)=>{
    const routesList = [
        { method: "POST", path: "/auth/signUp" },
        { method: "POST", path: "/auth/login" },
        { method: "POST", path: "/auth/logout" },
        { method: "GET", path: "/auth/verify" },
        { method: "GET", path: "/auth/google" },
        { method: "GET", path: "/auth/google/callback" },
        { method: "GET", path: "/home/" },
        { method: "POST", path: "/tasks/createTask" },
        { method: "POST", path: "/tasks/bulkCreateTasks" },
        { method: "GET", path: "/tasks/getTasks" },
        { method: "PUT", path: "/tasks/updateTask/:id" },
        { method: "DELETE", path: "/tasks/deleteTask/:id" },
        { method: "POST", path: "/tasks/task/:id/upload" },
        { method: "GET", path: "/tasks/task/:id" },
        { method: "GET", path: "/" },
        { method: "GET", path: "/routes" }
    ];
    res.send(routesList);
});
// ✅ Catch-all error handler (for better debugging)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL + '?family=0');

// ✅ Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
