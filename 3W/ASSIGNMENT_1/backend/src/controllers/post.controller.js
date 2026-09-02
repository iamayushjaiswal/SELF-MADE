const postModel = require("../models/post.model")

async function createPost(req, res) {
    try {
        const { userId, username, text, image } = req.body
        if (!text && !image) {
            return res.status(400).json({ error: "Text or image is required" })
        }

        const newPost = new postModel({
            userId,
            username,
            text,
            image,
            likes: [],
            comments: []
        })
        await newPost.save()
        res.status(201).json(newPost)
    } catch (error) {
        res.status(500).json({ error: "Error creating post" })
    }
}

async function getPosts(req, res) {
    try {
        const posts = await postModel.find().sort({ createdAt: -1 })
        res.status(200).json(posts)
    } catch (error) {
        res.status(500).json({ error: "Error fetching posts" })
    }
}

async function likePost(req, res) {
    try {
        const { userId } = req.body // The user who is liking the post
        const post = await postModel.findById(req.params.id)

        if (!post.likes.includes(userId)) {
            post.likes.push(userId)
            await post.save()
            return res.status(200).json(post)
        } else {
            // unlike if already liked
            post.likes = post.likes.filter(id => id !== userId)
            await post.save()
            return res.status(200).json(post)
        }
    } catch (error) {
        res.status(500).json({ error: "Error liking post" })
    }
}

async function commentPost(req, res) {
    try {
        const { username, text } = req.body
        const post = await postModel.findById(req.params.id)

        const comment = { username, text, createdAt: new Date() }
        post.comments.push(comment)

        await post.save()
        res.status(200).json(post)
    } catch (error) {
        res.status(500).json({ error: "Error commenting on post" })
    }
}

module.exports = {
    createPost,
    getPosts,
    likePost,
    commentPost
}
