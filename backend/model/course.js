var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const courseSchema = new Schema({
    class_name: String,
    subject_name: String,
    unit_title: String,
    user_id: Schema.ObjectId, // Creator of the course
    resource_type: String,
    syllabus_file_path: String,
    syllabus_text: String,
    topics: [{
        topic_name: String,
        description: String,
        keywords: [String]
    }],
    classCode: {
        type: String,
        default: null,
        sparse: true
    },
    // Selected videos published by the teacher for students
    selectedVideos: [
        {
            videoId:      { type: String },
            title:        { type: String },
            thumbnail:    { type: String },
            topic:        { type: String },
            isPaid:       { type: Boolean, default: false },
            price:        { type: String },
            platform:     { type: String },
            platformLogo: { type: String },
            instructor:   { type: String },
        }
    ],
    // Lock feature fields
    isLocked: {
        type: Boolean,
        default: false
    },
    lockedBy: {
        type: Schema.ObjectId,
        default: null,
        ref: 'User'
    },
    lockedAt: {
        type: Date,
        default: null
    },
    is_delete: { 
        type: Boolean, 
        default: false 
    },
    date: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.models.course || mongoose.model('course', courseSchema);