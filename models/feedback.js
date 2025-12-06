const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    subject: { 
        type: String, 
        required: true, 
        enum: ['Complaints', 'Suggestions', 'Enquiry', 'General', 'Compliment'] 
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, required: true },
    date: { type: String, required: true }   // keeps frontend date as string
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
