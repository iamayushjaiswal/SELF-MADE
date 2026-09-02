const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        required: true,
        type: String
    },
    username: {
        type: String,
        unique: true,
        required: true
    }
}, { timestamps: true })

const userModel = mongoose.model("userModel", userSchema)

module.exports = userModel