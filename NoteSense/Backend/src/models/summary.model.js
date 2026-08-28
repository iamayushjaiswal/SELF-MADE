import mongoose from "mongoose";


const summarySchema=new mongoose.Schema({
    originalText:{
        type:String,
        required:[true,"Text is required"]
    },
    summary:{
        type:String,
        required:[true,"Summary is required"]
    }
    
},{timestamps:true})

const summaryModel=mongoose.model("summaryModel",summarySchema)

export default summaryModel