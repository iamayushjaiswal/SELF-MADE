import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import CreatePost from "../components/CreatePost"
import PostCard from "../components/PostCard"
import "../App.css"

function Feed() {
    const [posts, setPosts] = useState([])
    const navigate = useNavigate()
    const user = JSON.parse(localStorage.getItem("user") || "{}")

    useEffect(() => {
        if (!user.id) {
            navigate("/auth")
            return
        }
        fetchPosts()
    }, [])

    const fetchPosts = async () => {
        try {
            const res = await axios.get("/api/posts")
            setPosts(res.data)
        } catch (error) {
            console.error("Error fetching posts", error)
        }
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate("/auth")
    }

    return (
        <div>
            <nav className="navbar">
                <h2 className="nav-brand">TaskPlanet Social</h2>
                <div className="nav-user">
                    <span>Hello, @{user.username}</span>
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>
            </nav>
            
            <div className="app-container">
                <CreatePost onPostCreated={fetchPosts} user={user} />
                
                <div>
                    {posts.map(post => (
                        <PostCard key={post._id} post={post} user={user} onPostUpdated={fetchPosts} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Feed
