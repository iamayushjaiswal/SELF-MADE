import "dotenv/config"
import app from "./src/app.js";
import {connectToDb} from "./src/config/database.js"
app.listen(3001,()=>{
    console.log("Server started on port 3001")
    connectToDb()
})
