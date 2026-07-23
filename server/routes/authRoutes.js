// const express = require("express");
// const router = express.Router();

// const {
//   registerUser,
//   loginUser,
// } = require("../controllers/authController");

// // Register Route
// router.post("/register", registerUser);

// // Login Route
// router.post("/login", loginUser);

// module.exports = router;




const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;