import express from "express";
const app=express();
import summaryRouter from "./routes/summaryRoutes.js";


app.use(express.json())
app.get("/api/health",(req,res)=>{

    res.send("NoteSense backend running")
})
app.use("/api/summaries", summaryRouter)
export default app
