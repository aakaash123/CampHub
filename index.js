const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const Campground = require('./models/campground');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const uri = "mongodb://localhost:27017/camphubs";
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect(uri, {})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Error connecting to MongoDB", err));

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(err.status || 500);
  res.render('error', { error: err });
}

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/allCamps', async (req, res, next) => {
  try {
    const camps = await Campground.find({});
    res.render('allcamps', { camps });
  } catch (err) {
    next(err);
  }
});

app.get('/showcamp/:id', async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id);
    console.log("camp : " + req.params.id);
    res.render('showcamp', { camp });
  } catch (err) {
    next(err);
  }
});

app.get('/addcamp', async (req, res, next) => {
  try {
    if (!mongoose.connection.readyState) {
      const err = new Error("Not connected to MongoDB");
      err.status = 500;
      throw err;
    }
    res.render('form');
  } catch (err) {
    next(err);
  }
});

app.post('/addcamp', async (req, res, next) => {
  try {
      const newCampground = new Campground({
      title: req.body.title,
      price: req.body.price,
      description: req.body.description,
      location: req.body.location
    });

    const camp = await newCampground.save();
    res.redirect('/showcamp/${camp.id}');
  } catch (err) {
    next(err);
  }
});

app.post('/deletecamp/:id', async (req, res, next) => {
  try {
    if (!mongoose.connection.readyState) {
      const err = new Error("Not connected to MongoDB");
      err.status = 500;
      throw err;
    }
    res.redirect('/allcamps');
    await Campground.deleteOne({ _id: req.params.id });
  } catch (err) {
    next(err);
  }
});

app.get('/editcamp/:id', async (req, res, next) => {
  try {
    if (!mongoose.connection.readyState) {
      const err = new Error("Not connected to MongoDB");
      err.status = 500;
      throw err;
    }
    const camp = await Campground.findById(req.params.id);
    res.render('editform', { camp });
  } catch (err) {
    next(err);
  }
});

app.post('/editcamp/:id', async (req, res, next) => {
  try {
    const camp = await Campground.findById(req.params.id);
    camp.title = req.body.title;
    camp.price = req.body.price;
    camp.description = req.body.description;
    camp.location = req.body.location;
    await camp.save(); // Save the updated campground document
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
