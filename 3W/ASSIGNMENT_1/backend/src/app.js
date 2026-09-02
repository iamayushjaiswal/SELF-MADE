const express=require("express")
const cors=require("cors")
const app=express()

const authRoutes=require("./routes/auth.routes")
const postRoutes=require("./routes/post.routes")

app.use(cors())
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ limit: "50mb", extended: true }))

app.use("/api/auth",authRoutes)
app.use("/api/posts",postRoutes)

module.exports=app
