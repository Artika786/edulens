require('dotenv').config();
var express = require("express");
var app = express();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var multer = require('multer'),
    bodyParser = require('body-parser'),
    path = require('path');
var mongoose = require("mongoose");
const axios = require('axios');
const nodemailer = require('nodemailer');

// Database connection
mongoose.connect("mongodb://localhost/courseDB", { useNewUrlParser: true, useUnifiedTopology: true });
var fs = require('fs');

// --- OTP/EMAIL CONFIGURATION ---
const otpStore = new Map();

// IMPORTANT: Replace these with your actual email credentials
const EMAIL_USER = process.env.EMAIL_USER || 'your-email@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'your-app-password';

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    }
});

// Verify transporter configuration on startup
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
        console.log('Please set up your email credentials in environment variables or directly in code');
    } else {
        console.log('Email server is ready to send messages');
    }
});

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- MULTER CONFIGURATION FOR FILE UPLOADS ---
var dir = './uploads';
var upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, callback) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            callback(null, './uploads');
        },
        filename: function (req, file, callback) { 
            callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname)); 
        }
    }),
    fileFilter: function (req, file, callback) {
        var ext = path.extname(file.originalname)
        if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx' && ext !== '.txt') {
            return callback(null, false);
        }
        callback(null, true);
    }
});

var Course = require("./model/course.js"); 
var User = require("./model/user.js"); 

app.use(cors());
app.use(express.static("uploads"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware for auth
app.use((req, res, next) => {
    try {
        // Exempt public routes
        if (req.path === "/login" || 
            req.path === "/register" || 
            req.path === "/" || 
            req.path === "/send-otp" || 
            req.path === "/verify-otp") {
            return next();
        }

        const token = req.headers.token;
        if (!token) {
            return res.status(401).json({
                errorMessage: "Token missing!",
                status: false,
            });
        }

        jwt.verify(token, "shhhhh11111", (err, decoded) => {
            if (err || !decoded?.id) { 
                return res.status(401).json({
                    errorMessage: "User unauthorized!",
                    status: false,
                });
            }
            req.user = { id: decoded.id, username: decoded.user }; 
            next();
        });
    } catch (e) {
        return res.status(400).json({
            errorMessage: "Something went wrong!",
            status: false,
        });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({
        status: true,
        title: "EduLens API is running",
    });
});

// --- AUTHENTICATION ROUTES ---

// Send OTP endpoint
app.post('/send-otp', async (req, res) => {
    try {
        const { email, role } = req.body; 

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                errorMessage: 'Invalid email format' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username: email }); 
        if (existingUser) {
            return res.status(400).json({ 
                errorMessage: 'Email already registered' 
            });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP with expiration (5 minutes)
        otpStore.set(email, {
            otp: otp,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        console.log(`Generated OTP for ${email}: ${otp}`); // For testing purposes

        // Send email
        const mailOptions = {
            from: EMAIL_USER,
            to: email,
            subject: 'EduLens - Email Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="color: white; margin: 0; text-align: center;">EduLens</h1>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
                        <p style="color: #666; font-size: 16px;">Hello,</p>
                        <p style="color: #666; font-size: 16px;">Your OTP for email verification is:</p>
                        <div style="background-color: white; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 10px; margin: 30px 0; border: 2px dashed #667eea; border-radius: 8px; color: #667eea;">
                            ${otp}
                        </div>
                        <p style="color: #666; font-size: 14px;">This OTP will expire in <strong>5 minutes</strong>.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            Best regards,<br>
                            <strong>EduLens Team</strong>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ 
            message: 'OTP sent successfully to your email' 
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        
        // Provide more specific error messages
        if (error.code === 'EAUTH') {
            return res.status(500).json({ 
                errorMessage: 'Email authentication failed. Please check email configuration.' 
            });
        }
        
        res.status(500).json({ 
            errorMessage: 'Failed to send OTP. Please try again later.' 
        });
    }
});

// Verify OTP endpoint
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Check if OTP exists
        const storedData = otpStore.get(email);
        
        if (!storedData) {
            return res.status(400).json({ 
                errorMessage: 'OTP not found or expired. Please request a new one.' 
            });
        }

        // Check if OTP is expired
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ 
                errorMessage: 'OTP has expired. Please request a new one.' 
            });
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            return res.status(400).json({ 
                errorMessage: 'Invalid OTP. Please check and try again.' 
            });
        }

        // OTP verified successfully
        otpStore.delete(email);
        
        res.status(200).json({ 
            message: 'Email verified successfully' 
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ 
            errorMessage: 'Failed to verify OTP' 
        });
    }
});

// Register endpoint
app.post('/register', async (req, res) => {
    try {
        const { email, password, role, school, course } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                errorMessage: 'Invalid email format' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username: email }); 
        if (existingUser) {
            return res.status(400).json({ 
                errorMessage: 'Email already registered' 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            username: email,
            email: email,
            password: hashedPassword,
            role: role,
            school: school,
            course: course
        });

        await newUser.save();

        res.status(201).json({ 
            message: 'Registration successful! You can now login.' 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            errorMessage: 'Registration failed. Please try again.' 
        });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                errorMessage: 'Invalid email format' 
            });
        }

        // Find user by email and role
        const user = await User.findOne({ username: email, role });
        
        if (!user) {
            return res.status(400).json({ 
                errorMessage: 'Invalid email or password' 
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(400).json({ 
                errorMessage: 'Invalid email or password' 
            });
        }

        // Generate token
        const token = jwt.sign(
            { userId: user._id, user: user.username, id: user._id, role: user.role },
            'shhhhh11111',
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            token: token,
            message: 'Login successful',
            userId: user._id,
            status: true
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            errorMessage: 'Login failed' 
        });
    }
});

// --- COURSE MANAGEMENT ROUTES (Existing routes) ---

app.post("/add-course", upload.single('syllabus_file'), async (req, res) => {
    try {
        const requestBody = req.body;
        
        if (!requestBody.class_name || !requestBody.subject_name || !requestBody.unit_title) {
            return res.status(400).json({ errorMessage: 'Class, Subject, and Unit Title are required!', status: false });
        }

        if (requestBody.resource_type === 'File' && !req.file) {
            return res.status(400).json({ errorMessage: 'File upload failed or syllabus file is missing.', status: false });
        }
        if (requestBody.resource_type === 'Text' && (!requestBody.syllabus_text || requestBody.syllabus_text.trim() === '')) {
            return res.status(400).json({ errorMessage: 'Syllabus content cannot be empty!', status: false });
        }
        
        const existingCourse = await Course.findOne({
            user_id: req.user.id,
            class_name: requestBody.class_name,
            subject_name: requestBody.subject_name,
            is_delete: false
        });
        
        if (existingCourse) {
            return res.status(400).json({ 
                errorMessage: `You have already added ${requestBody.subject_name} for ${requestBody.class_name}. Please choose a different subject or semester.`, 
                status: false 
            });
        }
        
        const newCourseData = {
            class_name: requestBody.class_name,
            subject_name: requestBody.subject_name,
            unit_title: requestBody.unit_title,
            resource_type: requestBody.resource_type,
            user_id: req.user.id, 
            syllabus_file_path: (requestBody.resource_type === 'File' && req.file) ? req.file.filename : null, 
            syllabus_text: requestBody.resource_type === 'Text' ? requestBody.syllabus_text : null,
            collaborators: [],
            isLocked: false
        };
        
        const createdCourse = await Course.create(newCourseData);
        
        if (!createdCourse) {
            return res.status(400).json({ errorMessage: 'Failed to add course.', status: false });
        }
        
        res.status(200).json({ status: true, title: 'Course added successfully.' });

    } catch (e) {
        console.error("Unexpected error:", e);
        res.status(400).json({ errorMessage: 'Something went wrong!', status: false });
    }
});

app.get("/get-used-subjects/:semester", async (req, res) => {
    try {
        const semester = req.params.semester;
        const userId = req.user.id;
        
        if (!semester) {
            return res.status(400).json({ errorMessage: 'Semester is required', status: false });
        }
        
        const courses = await Course.find({
            user_id: userId,
            class_name: semester,
            is_delete: false
        }, { subject_name: 1 });
        
        const usedSubjects = courses.map(course => course.subject_name);
        
        res.json({ 
            status: true, 
            usedSubjects: usedSubjects 
        });
        
    } catch (error) {
        console.error("Get used subjects error:", error);
        res.status(500).json({ errorMessage: 'Failed to fetch used subjects', status: false });
    }
});

app.post("/delete-course", async (req, res) => {
    try {
        const { id } = req.body;
        const userId = req.user.id;
        
        if (!id) {
            return res.status(400).json({ errorMessage: 'Course ID is required', status: false });
        }
        
        const courseToDelete = await Course.findById(id);
        
        if (!courseToDelete || courseToDelete.is_delete) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }

        const isCourseCreator = courseToDelete.user_id.toString() === userId.toString();

        if (!isCourseCreator) {
            return res.status(403).json({ errorMessage: 'Only the course creator can delete this course.', status: false });
        }
        
        if (courseToDelete.resource_type === 'File' && courseToDelete.syllabus_file_path) {
            const filePath = path.join(__dirname, 'uploads', courseToDelete.syllabus_file_path);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (unlinkErr) => {
                    if (unlinkErr) console.error("Error deleting old file:", unlinkErr);
                });
            }
        }
        
        courseToDelete.is_delete = true;
        await courseToDelete.save();
        
        res.status(200).json({ status: true, title: 'Course deleted successfully.' });
    } catch (e) {
        console.error("Delete course error:", e);
        res.status(500).json({ errorMessage: 'Failed to delete course', status: false });
    }
});

app.get("/get-courses", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const search = req.query.search || '';
        const userId = req.user.id;
        
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ errorMessage: 'User not found', status: false });
        }
        
        const schoolTeachers = await User.find({ school: currentUser.school, role: 'teacher' });
        const teacherIds = schoolTeachers.map(t => t._id);
        
        let query = { 
            is_delete: false, 
            user_id: { $in: teacherIds }
        };
        
        if (search) {
            query.$or = [
                { class_name: { $regex: search, $options: 'i' } },
                { subject_name: { $regex: search, $options: 'i' } },
                { unit_title: { $regex: search, $options: 'i' } }
            ];
        }

        const projection = {
            date: 1, class_name: 1, subject_name: 1, unit_title: 1, 
            resource_type: 1, syllabus_file_path: 1, syllabus_text: 1,
            isLocked: 1, lockedBy: 1, user_id: 1, collaborators: 1
        };
        
        const courses = await Course.find(query, projection)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        const totalCourses = await Course.countDocuments(query);
        const pages = Math.ceil(totalCourses / limit);
        
        res.json({
            status: true,
            title: 'Courses retrieved.',
            courses: courses,
            current_page: page,
            pages: pages,
            total: totalCourses
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ errorMessage: 'Failed to fetch courses', status: false });
    }
});

app.get("/get-course-by-id/:id", async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id;
        
        const courseData = await Course.findOne({ 
            _id: courseId,
            is_delete: false 
        });

        if (!courseData) {
            return res.status(404).json({ errorMessage: 'Course not found!', status: false });
        }

        const isCreator = courseData.user_id.toString() === userId.toString();
        const isCollaborator = courseData.collaborators && courseData.collaborators.some(
            collab => collab.toString() === userId.toString()
        );
        
        const canAccess = isCreator || isCollaborator || !courseData.isLocked;
        
        if (!canAccess) {
            return res.status(403).json({ errorMessage: 'You do not have permission to view this course', status: false });
        }

        res.status(200).json({ status: true, course: courseData });
    } catch (e) {
        console.error("Get course by ID error:", e);
        res.status(500).json({ errorMessage: 'Something went wrong!', status: false });
    }
});

app.post('/toggle-course-lock', async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user.id;
        
        if (!courseId) {
            return res.status(400).json({ errorMessage: 'Course ID is required', status: false });
        }
        
        const courseData = await Course.findById(courseId);
        
        if (!courseData || courseData.is_delete) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }
        
        if (courseData.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ 
                errorMessage: 'Only the course creator can lock/unlock this course.',
                status: false
            });
        }
        
        if (courseData.isLocked) {
            courseData.isLocked = false;
            courseData.lockedBy = null;
            courseData.lockedAt = null;
            
            await courseData.save();
            return res.json({ 
                status: true,
                title: 'Course unlocked successfully. All teachers can now edit.',
                course: courseData 
            });
        } else {
            courseData.isLocked = true;
            courseData.lockedBy = userId;
            courseData.lockedAt = new Date();
            
            await courseData.save();
            return res.json({ 
                status: true,
                title: 'Course locked successfully. Only you and collaborators can edit.',
                course: courseData 
            });
        }
    } catch (error) {
        console.error("Toggle lock error:", error);
        res.status(500).json({ errorMessage: 'Failed to toggle lock', status: false });
    }
});

app.post('/add-collaborator', async (req, res) => {
    try {
        const { courseId, collaboratorEmail } = req.body;
        const userId = req.user.id;
        
        if (!courseId || !collaboratorEmail) {
            return res.status(400).json({ errorMessage: 'Course ID and collaborator email are required', status: false });
        }
        
        const courseData = await Course.findById(courseId);
        
        if (!courseData || courseData.is_delete) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }
        
        if (courseData.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ 
                errorMessage: 'Only the course creator can add collaborators.',
                status: false
            });
        }
        
        const currentUser = await User.findById(userId);
        const collaborator = await User.findOne({ 
            username: collaboratorEmail, 
            role: 'teacher',
            school: currentUser.school
        });
        
        if (!collaborator) {
            return res.status(404).json({ 
                errorMessage: 'Teacher not found in your school. Please check the email.',
                status: false 
            });
        }
        
        if (courseData.collaborators && courseData.collaborators.some(collab => collab.toString() === collaborator._id.toString())) {
            return res.status(400).json({ 
                errorMessage: 'This teacher is already a collaborator.',
                status: false 
            });
        }
        
        if (!courseData.collaborators) {
            courseData.collaborators = [];
        }
        courseData.collaborators.push(collaborator._id);
        
        await courseData.save();
        
        res.json({ 
            status: true,
            title: `${collaborator.username} added as collaborator successfully.`,
            course: courseData 
        });
    } catch (error) {
        console.error("Add collaborator error:", error);
        res.status(500).json({ errorMessage: 'Failed to add collaborator', status: false });
    }
});

app.post('/remove-collaborator', async (req, res) => {
    try {
        const { courseId, collaboratorId } = req.body;
        const userId = req.user.id;
        
        if (!courseId || !collaboratorId) {
            return res.status(400).json({ errorMessage: 'Course ID and collaborator ID are required', status: false });
        }
        
        const courseData = await Course.findById(courseId);
        
        if (!courseData || courseData.is_delete) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }
        
        if (courseData.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ 
                errorMessage: 'Only the course creator can remove collaborators.',
                status: false
            });
        }
        
        courseData.collaborators = courseData.collaborators.filter(
            collab => collab.toString() !== collaboratorId
        );
        
        await courseData.save();
        
        res.json({ 
            status: true,
            title: 'Collaborator removed successfully.',
            course: courseData 
        });
    } catch (error) {
        console.error("Remove collaborator error:", error);
        res.status(500).json({ errorMessage: 'Failed to remove collaborator', status: false });
    }
});

app.get('/get-collaborators/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        
        const courseData = await Course.findById(courseId).populate('collaborators', 'username _id');
        
        if (!courseData || courseData.is_delete) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }
        
        if (courseData.user_id.toString() !== userId.toString()) {
            return res.status(403).json({ 
                errorMessage: 'Only the course creator can view collaborators.',
                status: false
            });
        }
        
        res.json({ 
            status: true,
            collaborators: courseData.collaborators || []
        });
    } catch (error) {
        console.error("Get collaborators error:", error);
        res.status(500).json({ errorMessage: 'Failed to get collaborators', status: false });
    }
});

app.get("/search-videos/:query", async (req, res) => {
    try {
        const searchQuery = req.params.query;
        const maxResults = req.query.maxResults || 6; // ← changed from 12 to 6
        const YOUTUBE_API_KEY = 'AIzaSyDFjBotODaBr7-N3tQWXbEpWX-WYE7_4yw'; 
        
        const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(searchQuery + ' tutorial')}&type=video&key=${YOUTUBE_API_KEY}`;
        
        const response = await axios.get(youtubeUrl);
        const videos = response.data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        res.status(200).json({ status: true, videos: videos });

    } catch (e) {
        console.error("YouTube search error:", e);
        res.status(500).json({ errorMessage: 'Failed to search videos', status: false });
    }
});


// Save selected videos to a course independently from class code generation
app.post("/save-course-videos", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { courseId, selectedVideos } = req.body;
        if (!courseId) {
            return res.status(400).json({ errorMessage: 'Course ID is required', status: false });
        }
        const courseData = await Course.findOne({ _id: courseId, is_delete: false });
        if (!courseData) {
            return res.status(404).json({ errorMessage: 'Course not found', status: false });
        }
        const isCreator = courseData.user_id.toString() === teacherId.toString();
        const isCollaborator = courseData.collaborators && courseData.collaborators.some(c => c.toString() === teacherId.toString());
        if (!isCreator && !isCollaborator) {
            return res.status(403).json({ errorMessage: 'You do not have permission to update this course', status: false });
        }
        const updatedCourse = await Course.findByIdAndUpdate(courseId, { selectedVideos: Array.isArray(selectedVideos) ? selectedVideos : [] }, { new: true });
        res.json({ status: true, message: 'Videos saved successfully', videoCount: updatedCourse.selectedVideos.length });
    } catch (e) {
        console.error("Save course videos error:", e);
        res.status(500).json({ errorMessage: 'Failed to save videos', status: false });
    }
});

app.post("/generate-class-code", async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { courseId, selectedVideos } = req.body;
        
        if (!courseId) {
            return res.status(400).json({ errorMessage: 'Course ID is required to generate a class code', status: false });
        }
        
        const courseData = await Course.findOne({ _id: courseId, user_id: teacherId, is_delete: false });
        
        if (!courseData) {
            return res.status(404).json({ errorMessage: 'Course not found or does not belong to this teacher', status: false });
        }

        // Always save/update selected videos when provided
        const updatePayload = {};
        if (Array.isArray(selectedVideos) && selectedVideos.length > 0) {
            updatePayload.selectedVideos = selectedVideos;
        }

        if (courseData.classCode) {
            // Code exists — just update videos if provided
            if (Object.keys(updatePayload).length > 0) {
                await Course.findByIdAndUpdate(courseId, updatePayload);
            }
            return res.json({ status: true, classCode: courseData.classCode, courseId, message: 'Class code retrieved successfully (existing code)', isNew: false });
        }
        
        const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        updatePayload.classCode = generateCode();
        
        const updatedCourse = await Course.findByIdAndUpdate(courseId, updatePayload, { new: true });
        
        if (!updatedCourse) {
            return res.status(400).json({ errorMessage: 'Failed to generate class code', status: false });
        }
        
        res.json({ status: true, classCode: updatedCourse.classCode, courseId, message: 'Class code generated successfully', isNew: true });
    } catch (e) {
        console.error("Generate code error:", e);
        res.status(500).json({ errorMessage: 'Failed to generate class code', status: false });
    }
});

app.get("/student/available-courses", async (req, res) => {
    try {
        const courses = await Course.find({ is_delete: false }, { _id: 1, class_name: 1, subject_name: 1, unit_title: 1, resource_type: 1, user_id: 1, date: 1 })
            .populate('user_id', 'username')
            .sort({ date: -1 });

        if (!courses || courses.length === 0) {
            return res.status(400).json({ errorMessage: 'No courses available!', status: false });
        }

        res.status(200).json({ status: true, title: 'Available courses retrieved.', courses: courses, total: courses.length });
    } catch (e) {
        console.error("Fetch courses error:", e);
        res.status(500).json({ errorMessage: 'Something went wrong!', status: false });
    }
});

// Get user information (school and course)
app.get('/get-user-info', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId, 'username role school course');
    
    if (!user) {
      return res.status(404).json({ 
        errorMessage: 'User not found',
        status: false 
      });
    }
    
    res.status(200).json({ 
      status: true,
      user: {
        username: user.username,
        role: user.role,
        school: user.school,
        course: user.course
      }
    });
    
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ 
      errorMessage: 'Failed to fetch user information',
      status: false 
    });
  }
});

app.post("/student/verify-class-code", async (req, res) => {
    try {
        const { courseId, classCode } = req.body;
        if (!courseId || !classCode) {
            return res.status(400).json({ errorMessage: 'Course ID and class code are required!', status: false });
        }

        const courseData = await Course.findOne({ _id: courseId, is_delete: false }).populate('user_id', 'username');

        if (!courseData) {
            return res.status(404).json({ errorMessage: 'Course not found!', status: false });
        }

        if (!courseData.classCode || courseData.classCode !== classCode) {
            return res.status(401).json({ errorMessage: 'Invalid class code!', status: false });
        }
        
        res.status(200).json({ status: true, message: 'Class code verified successfully', course: {
            _id: courseData._id, class_name: courseData.class_name, subject_name: courseData.subject_name, unit_title: courseData.unit_title, resource_type: courseData.resource_type, syllabus_file_path: courseData.syllabus_file_path, syllabus_text: courseData.syllabus_text, topics: courseData.topics, teacher: courseData.user_id?.username, teacherId: courseData.user_id?._id,
            selectedVideos: courseData.selectedVideos || []
        }});
    } catch (e) {
        console.error("Verify code error:", e);
        res.status(500).json({ errorMessage: 'Something went wrong!', status: false });
    }
});

app.post("/student/enroll-course", async (req, res) => {
    try {
        const { courseId } = req.body;
        if (!courseId) {
            return res.status(400).json({ errorMessage: 'Course ID is required!', status: false });
        }

        const courseData = await Course.findOne({ _id: courseId, is_delete: false });

        if (!courseData) {
            return res.status(404).json({ errorMessage: 'Course not found!', status: false });
        }

        res.status(200).json({ status: true, message: 'Successfully enrolled in course', courseId: courseId });

    } catch (e) {
        console.error("Enrollment error:", e);
        res.status(500).json({ errorMessage: 'Failed to enroll in course', status: false });
    }
});



app.listen(2000, () => {
    console.log("Server is Running On port 2000");
    console.log("========================================");
    console.log("IMPORTANT: Configure your email settings");
    console.log("Set EMAIL_USER and EMAIL_PASS environment variables");
    console.log("Or update them directly in the code");
    console.log("========================================");
});

module.exports = app;