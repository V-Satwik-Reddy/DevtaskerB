const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/signUp", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            email,
            password: hashedPassword,
        });
        await user.save();
        res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // Set to true in production with HTTPS
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.json({ message: "Logged in successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Logout Route: Clears the cookie
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: "Strict",
    });
    res.json({ message: "Logged out successfully" });
});

router.get("/verify", auth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
