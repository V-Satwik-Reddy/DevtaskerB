const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const router = express.Router();
const Redis=require("ioredis");
const redis=new Redis();
// Create Task
router.post("/createTask", auth, async (req, res) => {
    try {
        const { title, description, priority, dueDate } = req.body;

        if (!title || !description || !dueDate) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (new Date(dueDate) < new Date()) {
            return res.status(400).json({ message: "Due date must be in the future" });
        }

        const task = new Task({
            title,
            description,
            priority,
            dueDate,
            user: req.user.id, // Fix: Store only user ID
        });
        if (req.body.status) {
            task.status = req.body.status;
        }
        await task.save();
        await redis.hset(req.user.email, `task${task._id}`, JSON.stringify(task));
        await redis.expire(req.user.email, 3600);
        
        return res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
// routes/tasks.js
router.post("/bulkCreateTasks",auth, async (req, res) => {
    try {
        const tasks = req.body.tasks.map(task => ({
            ...task,
            user: req.user._id, // Assign the authenticated user to each task
        }));

        if (!Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ message: "Invalid task data" });
        }

        const createdTasks = await Task.insertMany(tasks);
        res.status(201).json({ message: "Tasks added successfully", tasks: createdTasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//get tasks
const mongoose = require("mongoose");

router.get("/getTasks", auth, async (req, res) => {
    try {
        let tasks = [];
        const taskFields = await redis.hkeys(req.user.email);

        if (taskFields.length > 0) {
            const taskValues = await redis.hmget(req.user.email, ...taskFields);
            tasks = taskValues.map(task => JSON.parse(task));
        } else {
            console.log("No tasks found in Redis");
        }

        if (tasks.length > 0) {
            return res.json({ tasks });
        }

        // Fetch from DB if not in Redis
        const tasksFromDB = await Task.find({ user: req.user._id });

        if (tasksFromDB.length > 0) {
            const pipeline = redis.pipeline();
            tasksFromDB.forEach(task => {
                pipeline.hset(req.user.email, `task${task._id}`, JSON.stringify(task));
            });
            pipeline.expire(req.user.email, 3600);
            await pipeline.exec();
        }

        return res.json({ tasks: tasksFromDB });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Server error" });
    }
});



module.exports = router;


// Update Task
router.put("/updateTask/:id", auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!task.user.equals(req.user.id)) {
            return res.status(401).json({ message: "Not authorized" });
        }

        const allowedUpdates = ["title", "description", "status", "priority", "dueDate"];
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).json({ message: "Invalid updates" });
        }

        Object.assign(task, req.body); // Merge updates
        await task.save();
        
        return res.json({ message: "Task updated successfully", updatedTask: task });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Delete Task
router.delete("/deleteTask/:id", auth, async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!task.user.equals(req.user.id)) {
            return res.status(401).json({ message: "Not authorized" });
        }

        await task.deleteOne();
        return res.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


const multer = require("multer");
const path = require("path");

// Multer Config for File Uploads
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

router.post("/task/:id/upload", upload.single("file"), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found" });

        task.completionFile = req.file.path;
        await task.save();

        res.json({ message: "File uploaded successfully", filePath: req.file.path });
    } catch (error) {
        res.status(500).json({ message: "Error uploading file" });
    }
});

// Get a single task by ID
router.get("/task/:id", async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.json(task);
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
