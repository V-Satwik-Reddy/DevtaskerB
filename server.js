const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cluster = require("cluster");
const os = require("os");

dotenv.config();
const numCPUs = os.cpus().length; // Get available vCPUs

if (cluster.isMaster) {
    console.log(`Master process PID: ${process.pid} is running`);
    
    // Fork worker processes
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Restart any crashed worker
    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });

} else {
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

    mongoose.connect(process.env.MONGO_URL, {
        maxPoolSize: 200
    })
        .then(() => console.log(`✅ MongoDB Connected (Worker ${process.pid})`))
        .catch((err) => {
            console.error(`❌ MongoDB Connection Failed: (Worker ${process.pid})`, err);
            process.exit(1);
        });

    app.use("/auth", require("./routes/auth"));
    app.use("/home", require("./routes/home"));
    app.use("/tasks", require("./routes/tasks"));

    app.get("/", (req, res) => {
        res.send(`Welcome to Task Manager API (Worker ${process.pid})`);
    });

    app.get("/routes", (req, res) => {
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

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ message: "Internal Server Error" });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Worker ${process.pid} running on http://localhost:${PORT}`);
    });
}
