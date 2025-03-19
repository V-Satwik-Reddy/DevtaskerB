const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true,index:true },
    password: { type: String},
    googleId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);