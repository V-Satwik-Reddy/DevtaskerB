const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");
const Task=require("../models/Task");
const router = express.Router();
require("dotenv").config();
const axios = require("axios");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:5000/auth/google/callback";
const Redis=require("ioredis");
const redis=new Redis(process.env.REDIS_URL+ '?family=0');
//sign up route
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

        const hashedPassword = await bcrypt.hash(password, 8);

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

// Login Route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid Password" });

        const token = jwt.sign({ id: user._id, verified:true}, process.env.JWT_SECRET, { expiresIn: "24h" });
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, 
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000, 
        });
        const tasks=await Task.find({user:user._id});
        if(tasks.length>0){
            const pipeline=redis.pipeline();
            tasks.forEach(task=>{
                pipeline.hset(user.email,`task${task._id}`,JSON.stringify(task));
            })
            pipeline.expire(user.email,3600);
            await pipeline.exec();
        }
        res.json({ message: "Logged in successfully" ,user});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
})

// Logout Route
router.post("/logout",auth ,async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false, 
        sameSite: "Strict",
    });
    await redis.expire(req.user.email, 0);
    res.json({ message: "Logged out successfully" });
});

//verify user for protected routes
router.get("/verify", auth, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ user: req.user });
});


//oauth google login from frontend
router.get("/google", (req, res) => {
    const googleAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=email profile&access_type=offline`;
    res.redirect(googleAuthURL);
});
//call back for google oauth
router.get("/google/callback", async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange code for access token
        const { data } = await axios.post("https://oauth2.googleapis.com/token", null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                redirect_uri: REDIRECT_URI,
                grant_type: "authorization_code",
            },
        });

        const { access_token } = data;

        // Fetch user data from Google
        const { data: googleUser } = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        // Check if user exists
        let user = await User.findOne({ email: googleUser.email });

        if (!user) {
            // Create a new user if not found
            user = new User({
                username: googleUser.name,
                email: googleUser.email,
                googleId: googleUser.id,
            });
            await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, verified: true }, process.env.JWT_SECRET, { expiresIn: "24h" });

        // Set JWT token in cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, 
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000, 
        });

        res.redirect("http://localhost:3000/dashboard"); // Redirect to frontend
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(500).json({ message: "Authentication failed" });
    }
});

module.exports = router;
