var express = require("express");
var router = express.Router({mergeParams: true});
var Product = require("../models/product");
var Comment = require("../models/comment");
var middleware = require("../middlewares/index");
var User        = require("../models/user");

//comment route
router.get("/new", middleware.isLoggedIn, function(req, res){
    Product.findById(req.params.id, function(err, comment){
        if(err){
            console.log(err);
            res.redirect("/back");
        }else{
            res.render("comment/new", {comment: comment, title: 'comment on' + comment});
        }
    })
});

router.post("/", middleware.isLoggedIn, function(req, res){
    Product.findById(req.params.id, function(err, newComment){
        if(err){
            console.log(err);
        }else{
            Comment.create(req.body.comment, function(err, freshComment){
                if(err){
                    console.log(err);
                    res.redirect("/back");
                }else{
                    freshComment.author.id = req.user._id;
                    freshComment.author.username = req.user.username;
                    freshComment.save();
                    newComment.comments.push(freshComment);
                    newComment.save();
                    req.flash("success", "comment successfully added");
                    res.redirect("/allproducts/" + req.params.id);
                }
            });
        }
    });
});

//comment edit route
router.get("/:comment_id/edit", middleware.commentOwnership, function(req, res){
    Comment.findById(req.params.comment_id, function(err, editing){
        if(err){
            console.log(err);
            res.redirect("back");
        }else{
            res.render("comment/edit", {products_id: req.params.id, comment: editing, title: 'edit comment'})
        }
    });
});

//comment edit post route
router.put("/:comment_id", middleware.commentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, update){
        if(err){
            console.log(err);
            res.redirect("back");
        }else{
            res.redirect("/allproducts/" + req.params.id)
        }
    })
});

//comment delete route
router.delete("/:comment_id", middleware.commentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            console.log(err);
            res.redirect("back");
        }else{
            req.flash("success", "comment successfully removed");
            res.redirect("/allproducts/" + req.params.id)
        }
    })
});



module.exports = router;