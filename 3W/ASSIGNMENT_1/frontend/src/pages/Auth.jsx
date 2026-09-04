import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../App.css"

function Auth() {
    const [tab, setTab] = useState("login")
    const [email, setEmail] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (tab === "login") {
                const res = await axios.post("/api/auth/login", { email, password })
                localStorage.setItem("token", res.data.token)
                localStorage.setItem("user", JSON.stringify(res.data.user))
                navigate("/")
            } else {
                await axios.post("/api/auth/register", { email, username, password })
                setTab("login")
                setEmail("")
                setPassword("")
            }
        } catch (error) {
            alert(error.response?.data?.error || "An error occurred")
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-box">
                <h1>TaskPlanet Social</h1>
                
                <div className="auth-tabs">
                    <div 
                        className={`auth-tab ${tab === "login" ? "active" : ""}`} 
                        onClick={() => setTab("login")}
                    >
                        Login
                    </div>
                    <div 
                        className={`auth-tab ${tab === "register" ? "active" : ""}`} 
                        onClick={() => setTab("register")}
                    >
                        Register
                    </div>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <input 
                        className="input-field"
                        type="email" 
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    {tab === "register" && (
                        <input 
                            className="input-field"
                            type="text" 
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    )}
                    <input 
                        className="input-field"
                        type="password" 
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="btn-primary" type="submit">
                        {tab === "login" ? "Login" : "Register"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Auth
