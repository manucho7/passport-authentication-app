import mongoose, { Error } from 'mongoose';
import express, { Request, Response } from 'express';
import cors from 'cors';
import passport from 'passport';
import passportLocal from 'passport-local';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import User from './User';
import dotenv from 'dotenv';
import { UserInterface, DatabaseUserInterface } from './Interfaces/UserInterface';

const LocalStrategy = passportLocal.Strategy

mongoose.connect("mongodb+srv://manu:manucho7@passportcluster.jmn63.mongodb.net/<dbname>?retryWrites=true&w=majority", {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
}, (err : Error) => {
    if (err) throw err;
    console.log('DB is online')
});

//Middlewares
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }))
app.use(
  session({
    secret: "secretCode",
    resave: true,
    saveUninitialized: true
  })
);
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

//Passport
passport.use(new LocalStrategy((username: string, password: string, done) => {
  User.findOne({ username: username }, (err: Error, user: DatabaseUserInterface) => {
    if (err) throw err;
    if (!user) return done(null, false);
    bcrypt.compare(password, user.password, (err, result: boolean) => {
      if (err) throw err;
      if (result === true) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  });
})
);

//Interaction with cookies in the browser
passport.serializeUser((user: DatabaseUserInterface, cb) => {
  cb(null, user._id);
});

passport.deserializeUser((id: string, cb) => {
  User.findOne({ _id: id }, (err: Error, user: DatabaseUserInterface) => {
    const userInformation: UserInterface = {
      username: user.username,
      isAdmin: user.isAdmin,
      id: user._id
    };
    cb(err, userInformation);
  });
});

// Routes
app.post('/register', async (req: Request, res: Response) => {
  //username and password
  const { username, password } = req?.body;
  //Validation for our endpoint = no invalid credentials
  if (!username || !password || typeof username !== "string"  || typeof password !== "string" ) {
    res.send("Credentials are not valid");
    return;
  }

  //Check DB to see if user already exists
  User.findOne({ username }, async (err: Error, doc: UserInterface) => {
    if (err) throw err;
    if (doc) res.send("User already exists in Database");
    if (!doc) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username,
        password: hashedPassword
      });
    
      await newUser.save();
      res.send('Success');
    }
  })

});

//Login Route
app.post("/login", passport.authenticate("local"), (req, res) => {
  res.send("Succesfully Authenticated");
});

//Get user currently logged in Route
app.get("/user", (req, res) => {
  res.send(req.user);
});

//Logout Route
app.get("/logout", (req, res) => {
  req.logOut();
  res.send("Successfully logged out");
});

app.listen('4000', () => {
  console.log("Server started successfully");
});