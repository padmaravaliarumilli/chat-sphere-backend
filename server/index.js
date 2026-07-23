// const dns = require("dns");

// dns.setDefaultResultOrder("ipv4first");

// require("dotenv").config();

// const express = require("express");
// const connectDB = require("./config/db");

// const app = express();

// connectDB();

// app.get("/", (req, res) => {
//     res.send("Chat Sphere Backend Running");
// });

// const PORT = process.env.PORT || 3000;

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });


require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");

const authRoutes = require("./routes/authRoutes");

const app = express();

connectDB();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Chat Sphere Backend Running...");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});