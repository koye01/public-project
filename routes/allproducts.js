var express     = require("express");
var router      = express.Router();
var User        = require("../models/user");
var Product     = require("../models/product");
var middleware  = require("../middlewares/index");
var path        = require("path");
require('dotenv').config();
var multer = require('multer');
var storage = multer.diskStorage({
    filename: function(req, file, callback){
     callback(null, Date.now() + file.originalname);
    }
 });
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter});
var cloudinary = require('cloudinary');

cloudinary.config({ 
    cloud_name: "djt5dffbq", 
    api_key: process.env.cloudinary_api_key, 
    api_secret: process.env.cloudinary_api_secret 
  });



// Product.create({
//     name: "Meleagris gallovapo",
//     image: "/turkey.jpg",
//     description: "Turkeys are propably the most dullest among all birds"
// });

//Listing of all products
router.get("/", function(req, res){
    Product.find({}, function(err, products){
        if(err){
            console.log(err);
        }else{
            res.render("index", {products: products});
        }
    })
});

//New product route
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("new");
});

router.post("/",  middleware.isLoggedIn, upload.single("product[image]"),function(req, res){
    cloudinary.v2.uploader.upload(req.file.path, function(err, result){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }
        req.body.product.image = result.secure_url;
        req.body.product.imageId = result.public_id;
        req.body.product.author = {
        id: req.user._id,
        username: req.user.username
    }
    Product.create(req.body.product, async function(err, newProduce){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }else{
            try {
                    var user = await User.findById(req.user._id).populate('followers').exec();
                    var newNotification = {
                        username: req.user.username,
                        productId: newProduce.id
                    }
                    for(var follower of user.followers) {
                        var notification = await Notification.create(newNotification);
                        follower.notifications.push(notification);
                        follower.save();
                    }
                    //redirect back to allproducts page
                    res.redirect("/allproducts");
                } catch(err) {
                    req.flash("error", err.message);
                    console.log(err);
                    return res.redirect('back');
                }
        }
     })
    });
});

//show page
router.get("/:id", function(req, res){
   Product.findById(req.params.id).populate("comments").exec(function(err, showProducts){
       if(err){
           console.log(err);
           res.redirect("/allproducts");
       }else{
           res.render("show", {products: showProducts});
       }
   });
});

//product edit route
router.get("/:id/edit", middleware.checkOwnership, function(req, res){
    Product.findById(req.params.id, function(err, goods){
        if(err){
            console.log(err);
        }else{
            res.render("edit", {goods: goods});
        }
    });
});


router.put("/:id", middleware.checkOwnership, upload.single("update[image]"), function(req, res){
    Product.findById(req.params.id, async function(err, updatedGoods){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        }else{
            if(req.file){
                try{
                    await cloudinary.v2.uploader.destroy(updatedGoods.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    updatedGoods.imageId = result.public_id;
                    updatedGoods.image   = result.secure_url;
                }catch(err) {
                    req.flash("error", err.message);
                    return res.redirect("back");
                }
            }
            updatedGoods.name = req.body.update.name;
            updatedGoods.description = req.body.update.description;
            updatedGoods.save();
            req.flash("success", "successfully updated");
            res.redirect("/allproducts/" + updatedGoods._id);
        }
    });
    
});

//product delete route
router.post("/:id", middleware.checkOwnership, function(req, res){
    Product.findById(req.params.id, async function(err, goods){
        if(err){
            req.flash("error", err.message)
            res.redirect("/show")
        }else{
            try{
                await cloudinary.v2.uploader.destroy(goods.imageId);
                goods.remove();
                req.flash("success", "product successfully deleted");
                res.redirect("/allproducts");
            }catch(err){
                req.flash("error", err.message);
                return res.redirect("/show");
            }
           
        }
    });
});




module.exports = router;