import mongoose from "mongoose";

export async function connectToDb(){
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Connected to mongoDB")
}