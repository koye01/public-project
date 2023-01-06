var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middlewares/index");
var Product = require("../models/product");
var User    = require("../models/user");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
require('dotenv').config();
var google = require("googleapis");
var expressSanitizer = require("express-sanitizer");



router.get("/", function(req, res){
    res.redirect("/allproducts");
});
router.get("/termandconditions", function(req, res){
    res.render("terms", {title: 'term and conditions'})
})
router.get("/aboutus", function(req, res){
    res.render("aboutus", {title: 'about us'});
});
router.get("/contactus", function(req, res){
    res.render("contactus", {title: 'contact us'});
});

//register route
router.get("/register", function(req, res){
    res.render("register", {title: 'signup'});
});

router.post("/register", function(req, res){
    var newUser = new User({username: req.body.username, email: req.body.email, 
        fullname: req.body.fullname, description: req.body.description, telephone: req.body.telephone});
        if(req.body.admincode === "secretcode123"){
            newUser.isAdmin = true;
        };
        req.body.description = req.sanitize(req.body.description);
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            res.render("register");
        }
            passport.authenticate("local") (req, res, function(){
                req.flash("success", user.username +"!", "you are welcome to our product gallery");
                res.redirect("/login");
            });
        
    })
});

//login route
router.get("/login", function(req, res){
    res.render("login", {title: 'login page'});
});

router.post("/login", passport.authenticate("local", {
        failureRedirect: "/login",
        successRedirect: "/allproducts"
    }), function(req, res){
    });


//logout
router.get("/logout", function(req, res){
    req.logout(function(err, out){
        if(err){
            res.redirect("/back");
        }
        req.flash("success", "successfully logged out");
        res.redirect("/allproducts");
    });
    
});

//forgot password
router.get("/forgot", function(req, res){
    res.render("users/forgot", {title: 'password reset'});
});

router.post("/forgot", function(req, res, next){
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf){
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({email: req.body.email}, function(err, user){
                if(!user){
                    req.flash("error", "no account with that email adress exist");
                    return res.redirect("/forget");
                }
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; //1 hour

                user.save(function(err){
                    done(err, token, user);
                });
            });
        },
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                   
                        user: "koyegarden@gmail.com",
                        pass: process.env.password
                }
            });
          
            var mailOptions = {
                to: user.email,
                from: "koyegarden@gmail.com",
                subject: "Producer's market password reset",
                text: "You are receiving this because you or someone else have requested for password reset,\n\n" +
                "please click on this link or copy the code to your browser to complete the process:\n\n" +
                "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                "if you did not request for this please ignore and password will remain unchanged"
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                console.log("mail sent");
                req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
                done(err, "done");
            });
        }
    ], function(err){
        if(err) return next(err);
        res.redirect("/forgot");
    });
});

router.get("/reset/:token", function(req, res){
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user){

    if(!user) {
        req.flash("error", "password reset token has been expired.");
        return res.redirect("/forgot");
    }
    res.render("users/reset", {token: req.params.token, title: 'reset token'});
});
});

router.post("/reset/:token", function(req, res){
    async.waterfall([
        function(done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, function(err, user){
                if(!user){
                    req.flash("error", "Password reset token is invalid or has expired");
                    return res.redirect("/back");
                }
                if(req.body.password === req.body.confirm) {
                    user.setPassword(req.body.password, function(err){
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function(err){
                            req.logIn(user, function(err){
                                done(err, user);
                            });
                        });
                    });
                } else {
                    req.flash("error", "passwords do not match");
                    return res.redirect("/back");
                }
            })
        }, function(user, done){
            var smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "koyegarden@gmail.com",
                    pass: process.env.password
            },
            });
            var mailOptions = {
                to: user.email,
                from: "oyelekejubril@gmail.com",
                subject: "Your password has been changed",
                text: "Hello,\n\n" +
                "This is a confirmation message that the password for your account " +user.email + "has just been changed"
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                console.log("mail sent");
                req.flash("success", "Your password has been changed.");
                done(err);
            });
        }

    ], function(err){
        res.redirect("/allproducts");
    });
})

//product search bar
router.post("/search", function(req, res){
    Product.find({name: req.body.search}, function(err, search){
        if(err){
            req.flash("error", err.message);
            res.redirect("/allproducts");
        }else{
            res.render("search", {searchbar: search, title: 'search keyword'});
        }
    })
});


//USER PROFILE ROUTE
router.get("/users/:id", async function(req, res){
   
    try {
        var product = await Product.find({});
        var user = await User.findById(req.params.id).populate('followers').exec();
        var unique = user.followers.filter((value, index)=>{
            return user.followers.indexOf(value) === index;
        });
        res.render('profile', {user, product, unique, title: user.username  + ' profile'});
    } catch(err) {
        req.flash("error", err.message);
        console.log(err);
        return res.redirect('back');
    }
});

//follow user
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
    try {
        var user = await User.findById(req.params.id);
        user.followers.push(req.user._id);
        var unique = user.followers.filter((value, index)=>{
            return user.followers.indexOf(value) === index;
        });
        user.followers = unique;
        user.save();
        req.flash("success", user.username, " successfully followed");
        res.redirect('/users/' + req.params.id);
    } catch(err) {
        console.log(err);
        res.redirect('back');
    }
});

//Unfollow user
router.get('/unfollow/:id', middleware.isLoggedIn, async function(req, res) {
    try {
        var user = await User.findById(req.params.id);
        var remove = user.followers.indexOf(req.user._id);
        user.followers.splice(remove, 1);
        user.save();
        req.flash("success", user.username, " successfully Unfollowed");
        res.redirect('/users/' + req.params.id);
    } catch(err) {
        console.log(err);
        res.redirect('back');
    }
});


//view all notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res){
    try {
        var user = await User.findById(req.user._id).populate({
            path: 'notifications',
            options: {sort: {"_id": -1}}
        }).exec();
        var allNotifications = user.notifications;
        res.render('notification/index', {allNotifications, title: 'notification page'});
    } catch(err) {
        console.log(err);
        res.redirect('back');
    }
});

//handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
    try {
        var notification = await Notification.findById(req.params.id);
        notification.isRead = true;
        notification.save();
        res.redirect(`/allproducts/${notification.productId}`);
    } catch(err) {
        res.redirect('back');
    }
});


module.exports = router;