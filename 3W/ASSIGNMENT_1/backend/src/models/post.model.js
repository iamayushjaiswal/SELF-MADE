const mongoose = require("mongoose")

const postSchema = new mongoose.Schema({
    userId: {
        type: String,

        required: true,

    },
    text: {
        type: String
    },

    image: {
        type: String,

    },
    username: {
        type: String,
        required: true,

    },
    likes: {

        type: Array,

    },
    comments: {
        type: Array
    }
}, { timestamps: true })

const postModel = mongoose.model("postModel", postSchema)
module.exports = postModel