var express                 = require("express"),
    app                     = express()
    bodyParser              = require("body-parser"),
    Product                 = require("./models/product"),
    Comment                 = require("./models/comment"),
    User                    = require("./models/user"),
    Notification            = require("./models/notification"),
    methodOverride          = require("method-override"),
    expressSanitizer        = require("express-sanitizer");
    multer                  = require("multer"),
    passport                = require("passport"),
    session                 = require("express-session");
    localStrategy           = require("passport-local"),
    passportLocalMongoose   = require("passport-local-mongoose"),
    mongoose                = require("mongoose"),
    flash                   = require("connect-flash"),
    path                    = require("path");
  
    

var allproductsRoutes = require("./routes/allproducts");
var commentsRoutes = require("./routes/comments");
var indexRoutes = require("./routes/index");

//mongoose.connect("mongodb://localhost/uthman");
//mongoose.connect("mongodb+srv://jubril:<condemned>@cluster0.5kundcf.mongodb.net/test");
mongoose.connect("mongodb+srv://jubril:condemned@cluster0.5kundcf.mongodb.net/?retryWrites=true&w=majority");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(require("express-session")({
    secret: "Rusty is my very cute dog",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));
app.use(flash());


passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(async function(req, res, next){
    if(req.user) {
        try {
            var user = await User.findById(req.user._id).populate('notifications', null, {isRead: false}).exec();
            res.locals.notifications = user.notifications.reverse();
        } catch(err) {
            console.log(err.message);
        }
    }
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});
app.use("/allproducts", allproductsRoutes);
app.use("/allproducts/:id/comments", commentsRoutes);
app.use("/", indexRoutes);

var storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, "public")
    },
    filename: function(req, file, cb){
        console.log(file),
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
var upload = multer({storage: storage});


app.listen(process.env.PORT, process.env.IP);
