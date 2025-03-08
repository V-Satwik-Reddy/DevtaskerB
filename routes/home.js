const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/User");
const router = express.Router();

router.get("/", auth, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Check token expiration
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token expired or invalid" });
        }
        return decoded;
    });

    res.json({ message: "Welcome to the protected route!", userId: decoded.id });
});


module.exports = router;
