var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var userSchema = new mongoose.Schema({
    fullname: {type: String, unique: true, required: true},
    username: {type: String, unique: true, required: true},
    password: String,
    email: {type: String, unique: true, required: true},
    telephone: String,
    isAdmin: {type: Boolean, default: false},
    description: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    notifications: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification'
        }
    ],
    followers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        ]
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);