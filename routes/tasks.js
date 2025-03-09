const express = require("express");
const Task = require("../models/Task");
const auth = require("../middleware/auth");
const router = express.Router();

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

        await task.save();
        return res.status(201).json({ message: "Task created successfully", task });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get All Tasks for Logged-in User
router.get("/getTasks", auth, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id });
        return res.json({ tasks });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

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

module.exports = router;
