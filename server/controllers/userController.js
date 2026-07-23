const getProfile = async (req, res) => {
  try {

    res.status(200).json({
      message: "Profile fetched successfully",
      user: req.user,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }
};



const updateProfile = async (req, res) => {

  try {

    const { name, profilePic } = req.body;


    // User obtained from JWT middleware
    const user = req.user;


    // Update name
    if (name) {
      user.name = name;
    }


    // Update profile picture
    if (profilePic) {
      user.profilePic = profilePic;
    }


    // Save changes
    await user.save();


    res.status(200).json({

      message: "Profile updated successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        status: user.status
      }

    });


  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};



module.exports = {
  getProfile,
  updateProfile
};