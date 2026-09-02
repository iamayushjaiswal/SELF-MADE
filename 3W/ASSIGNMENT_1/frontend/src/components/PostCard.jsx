import React, { useState } from "react"
import axios from "axios"
import "../App.css"

function PostCard({ post, user, onPostUpdated }) {
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState("")

    const isLiked = post.likes.includes(user.id)

    const handleLike = async () => {
        try {
            await axios.post(`http://localhost:3000/api/posts/${post._id}/like`, { userId: user.id })
            onPostUpdated()
        } catch (error) {
            console.error("Error liking post", error)
        }
    }

    const handleComment = async () => {
        if (!commentText.trim()) return
        try {
            await axios.post(`http://localhost:3000/api/posts/${post._id}/comment`, {
                username: user.username,
                text: commentText
            })
            setCommentText("")
            onPostUpdated()
        } catch (error) {
            console.error("Error commenting", error)
        }
    }

    return (
        <div className="post-card">
            <div className="post-header">
                <div className="post-avatar">
                    {post.username.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="post-user">{post.username}</p>
                    <p className="post-time">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
            </div>

            {post.text && <p className="post-text">{post.text}</p>}
            {post.image && <img src={post.image} alt="post content" className="post-image" />}

            <div className="post-stats">
                <span>{post.likes.length} Likes</span>
                <span>{post.comments.length} Comments</span>
            </div>

            <div className="post-actions">
                <button className={`btn-action ${isLiked ? "liked" : ""}`} onClick={handleLike}>
                    {isLiked ? "♥ Liked" : "♡ Like"}
                </button>
                <button className="btn-action" onClick={() => setShowComments(!showComments)}>
                    💬 Comment
                </button>
                <button className="btn-action">
                    ↗ Share
                </button>
            </div>

            {showComments && (
                <div className="post-comments">
                    {post.comments.map((comment, index) => (
                        <div key={index} className="comment">
                            <div className="comment-avatar">
                                {comment.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="comment-content">
                                <p className="comment-user">{comment.username}</p>
                                <p className="comment-text">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                    
                    <div className="add-comment">
                        <input
                            className="comment-input"
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <button className="btn-primary" disabled={!commentText.trim()} onClick={handleComment}>
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PostCard
