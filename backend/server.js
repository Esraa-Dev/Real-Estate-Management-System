import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import { connectDB } from "./config/db.js"
import authRoutes from "./routes/auth.route.js"


const app=express()
dotenv.config()
const PORT=process.env.PORT || 5000


//DB
 connectDB();

//Middlewares
app.use(cors())
app.use(express.json())

//Routes
app.use("/api/auth", authRoutes);

app.get("/",(req,res)=>{
    res.send("Api is running")
})

 
app.listen(PORT,()=>{
    console.log(`Server Started on ${PORT}`)
})