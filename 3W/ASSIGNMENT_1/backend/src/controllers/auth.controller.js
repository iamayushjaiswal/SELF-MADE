const userModel=require("../models/user.model")
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")

async function registerUser(req,res){
    try{
        const{email,username,password}=req.body
        if(!email || !username || !password){
            return res.status(400).json({error:"All fields are required"})
        }

        const existingUser=await userModel.findOne({$or:[{email},{username}]})
        if(existingUser){
            return res.status(400).json({error:"Email or username already exists"})
        }

        const salt=await bcrypt.genSalt(10)
        const hashedPassword=await bcrypt.hash(password,salt)

        const newUser=new userModel({
            email,
            username,
            password:hashedPassword
        })
        await newUser.save()
        
        res.status(201).json({message:"Registered successfully"})
    }catch(error){
        res.status(500).json({error:"Error in registration"})
    }
}

async function loginUser(req,res){
    try{
        const{email,password}=req.body
        const user=await userModel.findOne({email})
        
        if(!user){
            return res.status(400).json({error:"User not found"})
        }

        const isMatch=await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({error:"Invalid credentials"})
        }

        const token=jwt.sign({id:user._id,username:user.username},process.env.JWT_SECRET||"secret",{expiresIn:"1d"})
        
        res.status(200).json({
            message:"Login successful",
            token,
            user:{id:user._id,username:user.username,email:user.email}
        })
    }catch(error){
        res.status(500).json({error:"Error in login"})
    }
}

module.exports={
    registerUser,
    loginUser
}