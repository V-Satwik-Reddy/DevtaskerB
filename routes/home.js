const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Task = require("../models/Task");

router.get("/", auth, async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Check token expiration
    try {
        const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
        
        const tasks = await Task.find({ user: decoded.id });

        res.json({ message: "Welcome to Dashboard!", userId: decoded.id, tasks });
    } catch (err) {
        return res.status(401).json({ message: "Token expired or invalid" });
    }
});

module.exports = router;
