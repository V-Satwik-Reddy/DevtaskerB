const cluster = require("cluster");
const os = require("os");

const isRailway = !!process.env.RAILWAY_ENV; // Detect Railway Deployment

if (cluster.isMaster && !isRailway) {
    const numCPUs = os.cpus().length;
    console.log(`Master process ${process.pid} is running`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died, restarting...`);
        cluster.fork();
    });

    // ✅ Handle SIGTERM for clean shutdown
    process.on("SIGTERM", () => {
        console.log("🚨 SIGTERM received. Stopping workers...");
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });

} else {
    startServer();
}

function startServer() {
    const express = require("express");
    const mongoose = require("mongoose");
    const cors = require("cors");
    const dotenv = require("dotenv");
    const morgan = require("morgan");
    const cookieParser = require("cookie-parser");
    const Redis = require("ioredis");

    dotenv.config();
    const app = express();

    app.use(cookieParser());
    app.use(express.json());
    app.use(morgan("dev"));

    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"]
        })
    );

    mongoose.connect(process.env.MONGO_URL, { maxPoolSize: 200 })
        .then(() => console.log(`✅ MongoDB Connected (Worker ${process.pid})`))
        .catch((err) => {
            console.error("❌ MongoDB Connection Failed:", err);
            process.exit(1);
        });

    app.use("/auth", require("./routes/auth"));
    app.use("/home", require("./routes/home"));
    app.use("/tasks", require("./routes/tasks"));

    app.get("/", (req, res) => {
        res.send("Welcome to Task Manager API.");
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ message: "Internal Server Error" });
    });

    const redis = new Redis(process.env.REDIS_URL + '?family=0');

    // ✅ Handle SIGTERM for clean shutdown
    process.on("SIGTERM", () => {
        console.log(`🚨 Worker ${process.pid} shutting down...`);
        redis.disconnect();
        mongoose.connection.close(() => {
            console.log("✅ MongoDB Disconnected");
            process.exit(0);
        });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Worker ${process.pid} running on http://localhost:${PORT}`);
    });
}
