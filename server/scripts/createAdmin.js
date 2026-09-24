// Create an admin account, or promote an existing account to admin.
//
// Usage (from the server folder):
//   node scripts/createAdmin.js <email> <password> [name] [phone]

const path = require("path");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const User = require("../models/User");

const [email, password, name = "Admin", phone = "0000000000"] =
  process.argv.slice(2);

if (!email || !password) {
  console.log(
    "Usage: node scripts/createAdmin.js <email> <password> [name] [phone]"
  );
  process.exit(1);
}

if (password.length < 6) {
  console.log("Password must be at least 6 characters");
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash(password, 10);
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    existingUser.role = "admin";
    existingUser.password = hashedPassword;
    existingUser.isActive = true;

    // Older accounts may have been saved without a phone number
    if (!existingUser.phone) {
      existingUser.phone = phone;
    }
    await existingUser.save();

    console.log(`Updated ${existingUser.email} to admin ✅`);
  } else {
    await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "admin",
    });

    console.log(`Created admin ${email} ✅`);
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to create admin:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
