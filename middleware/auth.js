const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Import User model

module.exports = async function (req, res, next) {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ message: "No token provided." });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password"); // Exclude password

        if (!user) return res.status(404).json({ message: "User not found" });

        req.user = user; // Attach full user details to req.user
        next();
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
    }
};
