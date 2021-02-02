import mongoose from 'mongoose';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import passport from 'passport';
import passportLocal from 'passport-local';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import User from './User';
import { UserInterface, DatabaseUserInterface } from './Interfaces/UserInterface';

const LocalStrategy = passportLocal.Strategy

mongoose.connect("mongodb+srv://manu:manucho7@passportcluster.jmn63.mongodb.net/<dbname>?retryWrites=true&w=majority", {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true
}, (err) => {
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
  User.findOne({ username: username }, (err: any, user: DatabaseUserInterface) => {
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
  User.findOne({ _id: id }, (err: any, user: DatabaseUserInterface) => {
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
  User.findOne({ username }, async (err: any, doc: DatabaseUserInterface) => {
    if (err) throw err;
    if (doc) res.send("User already exists in Database");
    if (!doc) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        username,
        password: hashedPassword,
        isAdmin: false
      });
    
      await newUser.save();
      res.send('Success');
    }
  })

});

//Middleware
const isAdministratorMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const { user }: any = req;
  if (user) {
    User.findOne({ username: user.username }, (err: any, doc: DatabaseUserInterface) => {
      if (err) throw err;
      if (doc?.isAdmin) {
        next();
      }
      else {
        res.send("Sorry only admins can perform this");
      }
    })
  }
  else {
    res.send("Sorry you are not logged in.")
  }
}

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

//Delete user Route
// app.post("/deleteuser",isAdministratorMiddleware , async (req, res) => {
//   const { id } = req?.body;
//   await User.findByIdAndDelete(id, (err: any) => {
//     if (err) throw err;
//   });
//   res.send("Successfully deleted");
// });

app.get("/getallusers",isAdministratorMiddleware, async (req, res) => {
  await User.find({}, (err, data: DatabaseUserInterface[]) => {
    if (err) throw err;
    const filteredUsers: UserInterface[] = [];
    data.forEach((item: DatabaseUserInterface) => {
      const userInformation = {
        id: item._id,
        username: item.username,
        isAdmin: item.isAdmin
      }
      filteredUsers.push(userInformation);
    });
    res.send(filteredUsers);
  })
});

app.listen('4000', () => {
  console.log("Server started successfully");
});