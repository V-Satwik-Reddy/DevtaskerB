const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const token = req.cookies.token; // Only get token from cookies

    if (!token) return res.status(401).json({ message: "No token provided." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: "Invalid token" });
    }
};
