const express=require("express");
const mongoose=require("mongoose");
const cors=require("cors");
const dotenv=require("dotenv");
const morgan=require("morgan");

const cookieParser = require("cookie-parser"); 
dotenv.config();
const app=express();

app.use(cookieParser());

app.use(express.json());
app.use(morgan("dev"));


app.use(cors({
    origin: "http://localhost:3000",
    credentials: true, // **Allows frontend to send cookies**
}));// Add this in your main `server.js`
mongoose.connect(process.env.MONGO_URL).then(()=>{
    console.log("MongoDB Connected");
}).catch((err)=>{
    console.log(err);
});

app.use("/auth",require("./routes/auth"));
app.use("/home", require("./routes/home"));

const PORT=process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server running on http://localhost:${PORT}`);
});
