const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    let token = req.cookies.token || req.header("Authorization");

    if (!token) return res.status(401).json({ message: "No token provided." });

    try {
        const extractedToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
        const decoded = jwt.verify(extractedToken, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(extractedToken)
        next();
    } catch (error) {
        res.status(400).json({ message: "Invalid token" });
    }
};