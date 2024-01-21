const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('express-flash');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring'); 
const multer = require('multer');
const bcrypt = require('bcrypt');

const app = express();
const port = 8081;


app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: true }));
app.use(flash());


const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'nisarga',
    database: 'details',
    port: 3305,
    namedPlaceholders: true
});


db.connect(err => {
    if (err) {
        console.error('Error connecting to MariaDB database:', err);
    } else {
        console.log('Connected to MariaDB database');
    }
});


app.use(express.static('C:/Users/nisar/Desktop/Elearning'));


app.use(bodyParser.urlencoded({ extended: true }));


app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'nisargagowda141@gmail.com', 
        pass: 'lzkjukwbhsbiukbv' 
    }
});

app.post('/index', (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    if (!username || !email || !password) {
        req.flash('error', 'Please fill in all the fields.');
        res.redirect('/page-register.html');
        return;
    }

    const checkEmailSql = 'SELECT * FROM signup WHERE email = ?';
    db.query(checkEmailSql, [email], (checkEmailError, emailResults) => {
        if (checkEmailError) {
            console.error('Error checking email existence:', checkEmailError);
            req.flash('error', 'Error during registration. Please try again.');
            res.redirect('/page-register.html');
            return;
        }

        if (emailResults.length > 0) {
          
req.flash('error', 'Email already exists. Please choose a different email.');
req.flash('existingEmail', email);
res.redirect('/page-register.html');
return;

        }

       
        const verificationCode = randomstring.generate(6);

        const insertSql = 'INSERT INTO signup (username, email, password, verification_code) VALUES (?, ?, ?, ?)';
        db.query(insertSql, [username, email, password, verificationCode], (insertError, results) => {
            if (insertError) {
                console.error('Error inserting data into the database:', insertError);
                req.flash('error', 'Error during registration. Please try again.');
                res.redirect('/page-register.html');
            } else {
                console.log('User data inserted successfully');

                const mailOptions = {
                    from: 'nisargagowda141@gmail.com',
                    to: email,
                    subject: 'Email Verification',
                    text: `Your verification code is: ${verificationCode}`
                };

                transporter.sendMail(mailOptions, (emailError, info) => {
                    if (emailError) {
                        console.error('Error sending verification email:', emailError);
                        req.flash('error', 'Error sending verification email. Please contact support.');
                        res.redirect('/otp.html');
                    } else {
                        console.log('Verification email sent:', info.response);
                        req.session.userId = results.insertId;
                        req.flash('success', 'Signup successful! Check your email for verification.');
                        res.redirect('/otp.html');
                    }
                });
            }
        });
    });
});

           
app.post('/verify-otp', (req, res) => {
    const otp = req.body.otp;
    const userId = req.session.userId;

    if (!userId || !otp) {
        req.flash('error', 'Invalid request.');
        res.redirect('/page-register.html');
        return;
    }

    const sql = 'SELECT * FROM signup WHERE id = ? AND verification_code = ?';
    db.query(sql, [userId, otp], (err, results) => {
        if (err) {
            console.error('Error verifying OTP:', err);
            req.flash('error', 'Error verifying OTP. Please try again.');
            res.redirect('/otp.html');
        } else if (results.length === 1) {
          
            const updateSql = 'UPDATE signup SET is_verified = true WHERE id = ?';
            db.query(updateSql, [userId], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating user verification status:', updateErr);
                    req.flash('error', 'Error verifying OTP. Please try again.');
                    res.redirect('/otp.html');
                } else {
                   
                    const { username, email } = results[0];
                    res.redirect(`/app-profile.html?username=${username}&email=${email}`);
                }
            });
        } else {
          
            req.flash('error', 'Invalid OTP. Please try again.');
            res.redirect('/otp.html');
        }
    });
});



app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.Password;

    if (!email || !password) {
        req.flash('error', 'Please enter both email and password.');
        return res.redirect('/page-login.html');
    }

    const loginSql = 'SELECT * FROM signup WHERE email = ? AND is_verified = true';
    db.query(loginSql, [email], (loginError, loginResults) => {
        if (loginError) {
            console.error('Error during login:', loginError);
            req.flash('error', 'Error during login. Please try again.');
            return res.redirect('/page-login.html');
        }

        if (loginResults.length === 1) {
            const storedHashedPassword = loginResults[0].password;

           
            bcrypt.compare(password, storedHashedPassword, (bcryptError, passwordMatch) => {
                if (bcryptError || !passwordMatch) {
                    req.flash('error', 'Invalid email or password. Please try again.');
                    return res.redirect('/page-login.html');
                }

               
                const { id, username, email } = loginResults[0];
                req.session.userId = id;
                return res.redirect(`/app-profile.html?username=${username}&email=${email}`);
            });
        } else {
            req.flash('error', 'Invalid email or password. Please try again.');
            return res.redirect('/page-login.html');
        }
    });
});


app.post('/add-courses', (req, res) => {
   
    const {
        courseName,
        courseCode,
        courseDetails,
        courseDuration,
        coursePrice,
        professorName,
        maxStudents,
        contactNumber
    } = req.body;

    if (!courseCode) {
        console.error('Error inserting course data into the database: Course Code cannot be null');
        req.flash('error', 'Course Code cannot be empty.');
        res.redirect('/add-courses.html'); 
        return;
    }
    const sql = 'INSERT INTO course (course_name, course_code, course_details, course_duration, course_price, professor_name, max_students, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [courseName, courseCode, courseDetails, courseDuration, coursePrice, professorName, maxStudents, contactNumber], (err) => {
        if (err) {
            console.error('Error inserting course data into the database:', err);
            req.flash('error', 'Error adding course. Please try again.');
            res.redirect('/add-courses.html'); 
        } else {
            console.log('Course data inserted successfully');
            req.flash('success', 'Course added successfully!');
            res.redirect(`/courses.html?courseName=${courseName}&courseCode=${courseCode}&courseDetails=${courseDetails}&courseDuration=${courseDuration}&coursePrice=${coursePrice}&professorName=${professorName}&maxStudents=${maxStudents}&contactNumber=${contactNumber}`);

        }
    });
});




app.get('/get-courses', (req, res) => {
    const sql = 'SELECT * FROM course';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching courses from the database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results); 
        }
    });
});








app.post('/add-student', (req, res) => {
  
    const {
        firstName,
        lastName,
        email,
        rollNo,
        className,
        gender,
        mobileNumber,
        parentsName,
        parentsMobileNumber,
        bloodGroup,
        address
    } = req.body;

    
    if (!firstName || !lastName || !email || !rollNo || !className || !gender || !mobileNumber) {
        req.flash('error', 'Please fill in all the mandatory fields.');
        res.redirect('/add-student.html'); 
        return; 
    }


    const sql = 'INSERT INTO student (first_name, last_name, email, roll_no, class, gender, mobile_number, parents_name, parents_mobile_number, blood_group, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [firstName, lastName, email, rollNo, className, gender, mobileNumber, parentsName, parentsMobileNumber, bloodGroup, address], (err) => {
        if (err) {
            console.error('Error inserting student data into the database:', err);
            req.flash('error', 'Error adding student. Please try again.');
            res.redirect('/add-student.html'); 
        } else {
            console.log('Student data inserted successfully');
            req.flash('success', 'Student added successfully!');
            
            res.redirect(`/students.html?firstName=${firstName}&lastName=${lastName}&email=${email}&rollNo=${rollNo}&className=${className}&gender=${gender}&mobileNumber=${mobileNumber}&parentsName=${parentsName}&parentsMobileNumber=${parentsMobileNumber}&bloodGroup=${bloodGroup}&address=${address}`);

        }
    });
});




app.get('/get-students', (req, res) => {
    const sql = 'SELECT * FROM student';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching students from the database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.json(results); 
        }
    });
});


const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });


app.post('/add-professor', upload.single('file'), (req, res) => {
  
    const {
        firstname,
        lastname,
        email,
        password,
        confirmpassword,
        mobilenumber,
        gender,
        designation,
        department,
        education
    } = req.body;

    const fileData = req.file ? req.file.buffer : null;

    if (!firstname || !lastname || !email || !password || !confirmpassword || !mobilenumber || !gender || !designation || !department || !education) {
        req.flash('error', 'Please fill in all the mandatory fields.');
        res.redirect('/add-professor.html');
        return; 
    }

    
    const sql = 'INSERT INTO professor (firstname, lastname, email, password, confirmpassword, mobilenumber, gender, designation, department, education, file) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [firstname, lastname, email, password, confirmpassword, mobilenumber, gender, designation, department, education, fileData], (err) => {
        if (err) {
            console.error('Error inserting professor data into the database:', err);
            req.flash('error', 'Error adding professor. Please try again.');
            res.redirect('/add-professor.html'); 
        } else {
            console.log('Professor data inserted successfully');

            res.redirect(`/professors.html?firstname=${firstname}&lastname=${lastname}&email=${email}&mobilenumber=${mobilenumber}&gender=${gender}&designation=${designation}&department=${department}&education=${education}`);
        }
    });
});


app.get('/professors.html', (req, res) => {
    
    const sql = 'SELECT professor_id, firstname, lastname, email, mobilenumber, gender, designation, department, education FROM professor';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching professors from the database:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
          
            res.render('professors.html', { professors: results });
        }
    });
});



app.post('/add-assessment', (req, res) => {
    const { question, option1, option2, option3, option4 } = req.body;

    const sql = `INSERT INTO assessment_questions (question, option1, option2, option3, option4)
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [question, option1, option2, option3, option4], (err, result) => {
        if (err) {
            console.error('Error inserting assessment:', err);
            res.status(500).send('Error inserting assessment');
        } else {
            console.log('Assessment added successfully');
            // Redirect to the "nextpage" after successful assessment addition
            res.redirect(`/assessment-details?question=${encodeURIComponent(question)}&option1=${encodeURIComponent(option1)}&option2=${encodeURIComponent(option2)}&option3=${encodeURIComponent(option3)}&option4=${encodeURIComponent(option4)}`);
        }
    });
});

app.get('/assessment-details', (req, res) => {
    // Get the query parameters
    const { question, option1, option2, option3, option4 } = req.query;

    // Select rows from the assessment_questions table based on the provided query parameters
    const sql = `SELECT * FROM assessment_questions WHERE question = ? AND option1 = ? AND option2 = ? AND option3 = ? AND option4 = ?`;

    // Execute the query with the provided parameters
    db.query(sql, [question, option1, option2, option3, option4], (err, result) => {
        if (err) {
            console.error('Error fetching assessment details:', err);
            res.status(500).send('Error fetching assessment details');
        } else {
            // Send the result as JSON response
            res.status(200).json(result);
        }
    });
});




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
