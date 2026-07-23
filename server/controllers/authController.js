const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const registerUser = async(req,res)=>{

try{


const {name,email,password,gender}=req.body;             //controllers receives the data from the request body

const profilePic =
  gender === "male"
    ? process.env.DEFAULT_MALE_AVATAR
    : process.env.DEFAULT_FEMALE_AVATAR;

// 1. Validate

if(!name || !email || !password || !gender)
{
return res.status(400).json({
message:"All fields required"
});
}


// 2. Check existing user

const userExists =
await User.findOne({email});


if(userExists)
{
return res.status(400).json({
message:"User already exists"
});
}


// 3. Hash password

const hashedPassword =
await bcrypt.hash(password,10);


// 4. Create user

const user =
await User.create({

name,

email,

password:hashedPassword,

gender,

profilePic,

status:"offline"

});


// 5. Generate JWT

const token =
jwt.sign(
{
id:user._id
},
process.env.JWT_SECRET,
{
expiresIn:"7d"
}
);


// 6. Response


res.status(201).json({

message:"Registration successful",

token,

user: {
  id: user._id,
  name: user.name,
  email: user.email,
  gender: user.gender,
  profilePic: user.profilePic,
  status: user.status
}

});


}
catch(error){

res.status(500).json({
message:error.message
});

}

}



//Login User
const loginUser = async(req,res)=>{

try{


const {email,password}=req.body;


// 1. Validate

if(!email || !password)
{
    return res.status(400).json({
        message:"All fields required"
    });
}


if(password.length < 6)
{
    return res.status(400).json({
        message:"Password must be at least 6 characters"
    });
}


// 2. Find user

const user =
await User.findOne({email});


if(!user)
{
return res.status(404).json({
message:"User not found"
});
}


// 3. Compare password

const isMatch =
await bcrypt.compare(
password,
user.password
);


if(!isMatch)
{
return res.status(401).json({
message:"Invalid password"
});
}


// 4. Update status

user.status="online";

await user.save();


// 5. Generate token


const token =
jwt.sign(
{
id:user._id
},
process.env.JWT_SECRET,
{
expiresIn:"7d"
}
);


// 6. Response


res.status(200).json({

message:"Login successful",

token,

user:{
id:user._id,
name:user.name,
email:user.email,
status:user.status
}

});


}
catch(error){

res.status(500).json({
message:error.message
});

}

}
 module.exports = {
    registerUser,
    loginUser
};