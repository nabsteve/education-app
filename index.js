const dotenv = require("dotenv");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = express();
dotenv.config();

app.use(express.json());

// Connect to DB
mongoose.connect(process.env.MONGO_SERVER, {
    useUnifiedTopology: true,
    useNewUrlParser: true
  },
  () => console.log("Connected to DB successfully.")
);

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true
  },
  last_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: Number,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

const subjectSchema = new mongoose.Schema({
  subject_name: {
    type: String,
    required: true
  },
  created_by: userSchema
});

const topicSchema = new mongoose.Schema({
  topic_name: {
    type: String,
    required: true
  },
  subject_name: subjectSchema
});

const teacherSchema = new mongoose.Schema({
  user: userSchema
});

const studentSchema = new mongoose.Schema({
  user: userSchema
});

const answerSchema = new mongoose.Schema({
  answer: {
    type: String,
    required: true
  },
  answered_by: userSchema,
  date: Date,
  correct: Boolean
});

const questionSchema = new mongoose.Schema({
  topic_name: topicSchema,
  asked_by: userSchema,
  date: Date,
  question: String,
  answers: [answerSchema]
});

const User = mongoose.model("User", userSchema);
const Teacher = mongoose.model("Teacher", teacherSchema);
const Student = mongoose.model("Student", studentSchema);
const Subject = mongoose.model("Subject", subjectSchema);
const Topic = mongoose.model("Topic", topicSchema);
const Question = mongoose.model("Question", questionSchema);
const Answer = mongoose.model("Answer", answerSchema);

app.get("/", (req, res) => {
  res.send("This is the homepage!")
})

app.post("/api/questions/answer/verify", verifyToken, async (req, res) => {
  //Check if the person trying to access the route is a teacher
  const user = await User.findOne({
    _id: req.user._id
  });
  const isTeacher = await Teacher.findOne({
    user: user
  });
  if (!isTeacher) return res.status(401).send("This route is for teachers only");

  // Check if the answer exists
  const answerExist = await Answer.findOne({
    _id: req.body._id
  });
  if (!answerExist) return res.status(400).send("The answer does not exist.")
  
  Answer.updateOne({_id: req.body._id}, { correct: true }, (err) => {
    if (err){
      console.log(err)
    } else {
      res.send("Answer verified as correct!")
    }
  });
});

app.post("/api/questions/answer", verifyToken, async (req, res) => {
  // Check if the question exists
  const questionExist = await Question.findOne({
    _id: req.body._id
  });
  if (!questionExist) return res.status(400).send("The question does not exist.")
  
  // Get the user's details
  const user = await User.findOne({
    _id: req.user._id
  });

  const answer = new Answer({
    answer: req.body.answer,
    answered_by: user,
    date: new Date().toLocaleDateString(),
    correct: null
  });

  answer.save((err) => {
    if (err) {
      console.log(err)
    } else {
      Question.updateOne({ _id: req.body._id }, { $push: { answers: answer }}, async (err) => {
        if (err){
          console.log(err)
        } else {
          const questionUpdate = await Question.findOne({
            _id: req.body._id
          });
          res.send(questionUpdate);
        }
      });
    }
  });
});

app.post("/api/questions/create", verifyToken, async (req, res) => {
  //Check if the person trying to access the route is a Student
  const user = await User.findOne({
    _id: req.user._id
  });
  const isStudent = await Student.findOne({
    user: user
  });
  if (!isStudent) return res.status(401).send("This route is for Students only");

  // Check if the topic name exists
  const topic = await Topic.findOne({
    _id: req.body._id
  });
  if (!topic) return res.status(400).send("Topic does not exist.");

  // Create new question
  const question = new Question({
    topic_name: topic,
    asked_by: user,
    date: new Date().toLocaleDateString(),
    question: req.body.question,
    answers: []
  });

  question.save((err) => {
    if (err) {
      res.status(400).send(err)
    } else {
      res.status(201).send(question)
    }
  })
});

app.post("/api/subjects/create", verifyToken, async (req, res) => {
  //Check if the person trying to access the route is a teacher
  const user = await User.findOne({
    _id: req.user._id
  });
  const isTeacher = await Teacher.findOne({
    user: user
  });
  if (!isTeacher) return res.status(401).send("This route is for teachers only");

  // Find the name of the subject and confirm it doesn't already exist
  const existingSubject = await Subject.findOne({ subject_name: req.body.subject_name })
  if(existingSubject) return res.status(400).send("Subject exists already, use another name.")

  // Create a new subject
  const subject = new Subject({
    subject_name: req.body.subject_name,
    created_by: user
  });
  
  // Save new subject
  subject.save((err) => {
    if (err) {
      console.log(err);
    } else {
      res.send("New subject added successfully.");
    }
  });
});

app.post("/api/topics/create", verifyToken, async (req, res) => {
  //Find out if the subject entered is valid. If yes, get the topic name 
  const subjectDetails = await Subject.findOne({ subject_name: req.body.subject_name });
  if(!subjectDetails) return res.status(400).send("The subject does not exist, input a valid subject.")
  const topic_name = req.body.topic_name

  // Create a new topic
  const topic = new Topic({
    topic_name: topic_name,
    subject_name: subjectDetails
  });

  //Save new topic
  topic.save((err) => {
    if (err) {
      res.send(err)
    } else {
      res.send("New topic added successfully!")
    }
  });
});

app.post("/api/teachers/register", checkUser, async (req, res) => {
  // Hash password
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  
  // Create a new user
  const user = new User({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    phone: req.body.phone,
    password: hashedPassword
  });
  user.save((err) => {
    if (err) {
      console.log(err)
    } else {
      // Create new teacher
      const teacher = new Teacher({
        user: user
      });

      teacher.save((err) => {
        if (err) {
          console.log(err)
        } else {
          res.send({
            teacher
          })
        }
      });
    }
  })    
});

app.post("/api/students/register", checkUser, async (req, res) => {
  // Hash password
  const hashedPassword = await bcrypt.hash(req.body.password, 10)
  
  // Create a new user
  const user = new User({
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    phone: req.body.phone,
    password: hashedPassword
  });
  user.save((err) => {
    if (err) {
      console.log(err)
    } else {
      // Create new student
      const student = new Student({
        user: user
      });

      student.save((err) => {
        if (err) {
          console.log(err)
        } else {
          res.send({
            student
          })
        }
      });
    }
  })    
});

app.post("/api/users/login", async (req, res) => {
  // Check if the user is already registered
  const userExist = await User.findOne({
    email: req.body.email
  });
  if (!userExist) return res.status(400).send("User not registered.");

  // Check password and generate token
  bcrypt.compare(req.body.password, userExist.password, (err, result) => {
    if (result === true) {
      const token = jwt.sign({
          _id: userExist._id
        }, process.env.SECRET_KEY);
        res.header("auth-token", token).send(token);
    } else {
      res.status(401).send("Invalid password")
    }
  });
});


// MIDDLEWARES
function verifyToken (req, res, next) {
  // Get auth header value
  const token = req.header("auth-token");

  if (!token) return res.status(401).send("Access Denied! You're not a logged in user.");
  
  try {
    const verified = jwt.verify(token, process.env.SECRET_KEY);
    req.user = verified;
    next()
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
};

async function checkUser (req, res, next) {
  // Check if the user is already registered
  const emailExist = await User.findOne({
    email: req.body.email
  });
  if (emailExist) return res.status(400).send("User already registered. Login instead.");
  next();
};

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on Port 3000.")
});
