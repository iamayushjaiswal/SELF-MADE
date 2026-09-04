import React, { useState } from "react"
import axios from "axios"
import "../App.css"

function CreatePost({ onPostCreated, user }) {
    const [text, setText] = useState("")
    const [image, setImage] = useState("")

    const handleImageUpload = (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setImage(reader.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async () => {
        if (!text.trim() && !image) return
        
        try {
            await axios.post("/api/posts", {
                userId: user.id,
                username: user.username,
                text,
                image
            })
            setText("")
            setImage("")
            onPostCreated()
        } catch (error) {
            console.error("Error creating post", error)
        }
    }

    return (
        <div className="create-post">
            <textarea
                className="create-input"
                placeholder="What's on your mind?"
                rows="3"
                value={text}
                onChange={(e) => setText(e.target.value)}
            ></textarea>
            
            {image && (
                <div>
                    <img src={image} alt="preview" className="create-preview" />
                    <span className="remove-img" onClick={() => setImage("")}>
                        Remove Image
                    </span>
                </div>
            )}
            
            <div className="create-actions">
                <label className="file-label">
                    Upload Image
                    <input className="file-input" accept="image/*" type="file" onChange={handleImageUpload} />
                </label>
                <button 
                    className="btn-primary" 
                    onClick={handleSubmit} 
                    disabled={!text.trim() && !image}
                >
                    Post
                </button>
            </div>
        </div>
    )
}

export default CreatePost
