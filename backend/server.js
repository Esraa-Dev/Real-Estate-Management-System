import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./config/db.js"
const app=express()
dotenv.config()

const PORT=process.env.PORT || 5000


//DB
 connectDB();

//Middlewares
app.use(cors())
app.use(express.json())

//Routes
app.get("/",(req,res)=>{
    res.send("Hello from backend")
})

 
app.listen(PORT,()=>{
    console.log(`Server Started on ${PORT}`)
})