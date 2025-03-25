const cron = require("node-cron");
const nodemailer = require("nodemailer");
const Task = require("./models/Task"); // Adjust path as needed
const User = require("./models/User"); // Assuming each task has a userId
const dotenv = require("dotenv");
dotenv.config();
// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use an app password for security
  },
});

// Function to send emails
const sendReminderEmail = async (email, task) => {
  try {
    await transporter.sendMail({
      from: "nodemailer3005@gmail.com",
      to: email,
      subject: "Task Due Soon Reminder",
      text: `Reminder: Your task "${task.title}" is due on ${task.dueDate}. Please take action and comeplet it the dec "${task.description}"!`,
    });
    console.log(`Reminder sent to ${email} for task: ${task.title}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

// Cron job to check tasks every hour
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await Task.find({ 
      dueDate: { $gte: now, $lte: next24Hours }, 
      notified: false // Prevent duplicate emails
    });
    for (const task of tasks) {
      const user = await User.findById(task.user);
      if (user) {
        await sendReminderEmail(user.email, task); // Ensure this runs
    
        await Task.findByIdAndUpdate(task._id, { notified: true });
        console.log(`Email sent and task updated: ${task._id}`);
      }
    }
    
  } catch (error) {
    console.error("Error checking tasks for reminders:", error);
  }
});


console.log("Task Reminder Scheduler Started.");
 