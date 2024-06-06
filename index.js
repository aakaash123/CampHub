const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const Campground = require('./models/campground');
const User = require('./models/user');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const Review = require('./models/review');
const { cloudinary, upload } = require('./cloudinaryConfig');
const MongoDBStore = require('connect-mongo');

// Ensure environment variables are loaded
require('dotenv').config();

const db_url = process.env.DB_URL || 'mongodb://localhost:27017/camphubs';

// Mongoose connection
mongoose.connect(db_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("Error connecting to MongoDB", err));

// Configure session store
const store = MongoDBStore.create({
  mongoUrl: db_url,
  secret: 'yourSecretKey', // Use the same secret used in session configuration
  touchAfter: 24 * 3600 // Time period in seconds
});

store.on('error', function (e) {
  console.log('SESSION STORE ERROR', e);
});

// Passport Configuration
app.use(session({
  store: store,
  name: 'sessionId',
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Set secure cookies in production
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500).render('error', { error: err });
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/getUsername', (req, res) => {
  if (req.user) {
    return res.json({ username: req.user.username });
  }
  res.json({ username: null });
});

app.get('/allCamps', async (req, res, next) => {
  try {
    const users = await User.find({});
    console.log("users :" + users);
    const camps = await Campground.find({});
    res.render('allcamps', { camps });
  } catch (err) {
    next(err);
  }
});

app.get('/showcamp/:id', async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id).populate('reviews');
    console.log("camp : " + camp);
    res.render('showcamp', { camp });
  } catch (err) {
    next(err);
  }
});

app.get('/addcamp', isLoggedIn, async (req, res, next) => {
  try {
    res.render('form');
  } catch (err) {
    next(err);
  }
});

app.post('/addcamp', isLoggedIn, upload.single('image'), async (req, res, next) => {
  try {
    const { title, price, description, location } = req.body;
    const image = req.file;
    const newCampground = new Campground({
      title,
      price,
      description,
      location,
      imageUrl: image.path,
      imageId: image.filename
    });

    const camp = await newCampground.save();
    res.redirect(`/showcamp/${camp.id}`);
  } catch (err) {
    next(err);
  }
});

app.post('/deletecamp/:id', isLoggedIn, async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id);
    if (!camp) {
      const err = new Error("Campground not found");
      err.status = 404;
      throw err;
    }
    await Campground.deleteOne({ _id: req.params.id });
    res.redirect('/allcamps');
  } catch (err) {
    next(err);
  }
});

app.get('/editcamp/:id', isLoggedIn, async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id);
    res.render('editform', { camp });
  } catch (err) {
    next(err);
  }
});

app.post('/editcamp/:id', isLoggedIn, upload.single('image'), async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id);
    camp.title = req.body.title;
    camp.price = req.body.price;
    camp.description = req.body.description;
    camp.location = req.body.location;

    if (req.file) {
      // Delete the old image from Cloudinary
      await cloudinary.uploader.destroy(camp.imageId);
      // Update with the new image
      camp.imageUrl = req.file.path;
      camp.imageId = req.file.filename;
    }

    await camp.save();
    res.redirect(`/showcamp/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

// User registration route
app.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const newUser = new User({ email, username });
    await User.register(newUser, password);
    res.redirect('/');
  } catch (err) {
    next(err);
  }
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login logic
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// Logout route
app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

app.post('/camp/:id/reviews', isLoggedIn, async (req, res, next) => {
  try {
    const campground = await Campground.findById(req.params.id);
    const review = new Review({
      body: req.body.body,
      rating: req.body.rating,
      author: req.user.username
    });
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/showcamp/${req.params.id}`);
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

app.listen(3000, () => {
  console.log("server started at port 3000");
});

module.exports = app;
