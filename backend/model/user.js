var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// The redundant 'userSchemaDraft' has been removed to fix the 'Identifier has already been declared' SyntaxError.
// The new 'email' field has been integrated into the main 'userSchema' below.

const userSchema = new Schema({
    // New field integrated from the requested draft
    email: {
        type: String,
        // Making email required as it's typically used for identification/login
        required: true 
    },
    username: { 
        type: String, 
        required: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        required: true, 
        enum: ['teacher', 'student'] 
    },
    school: { 
        type: String, 
        default: '' 
    },
    course: { 
        type: String, 
        default: '' 
    },
    classCode: { 
        type: String, 
        default: null 
    },
    // This field serves the same purpose as 'createdAt' in the draft
    date: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('user', userSchema);