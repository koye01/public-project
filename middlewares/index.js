var Product = require("../models/product");
var Comment = require("../models/comment");
var User    = require("../models/user");
middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
     }else{
         req.flash("error", "Please login first");
         res.redirect("/login");
     }
 }

middlewareObj.commentOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, commentUpdate){
            if(err){
                res.redirect("back");
            }else{
                if(commentUpdate.author.id.equals(req.user._id) || req.user.isAdmin){
                    next()
                }else{
                    req.flash("error", "you are not authorised to do so");
                    res.redirect("back");
                }
                
            }
        })
    }else{
        req.flash("error", "please login first");
        res.redirect("/login")
    }
}

middlewareObj.checkOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        Product.findById(req.params.id, function(err, goods){
        if(err){
            req.flash("error", "you are not authorised to do that");
            res.redirect("back")
        }else{
            if(goods.author.id.equals(req.user._id)|| req.user.isAdmin){
                next();
            }else{
                req.flash("error", "you are not authorised to do that");
                res.redirect("back")
                }
            } 
                
        })
    }else{
        req.flash("error", "please login first")
        res.redirect("/login")
    }
}



module.exports = middlewareObj;