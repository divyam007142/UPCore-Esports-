const mongoose = require('mongoose');
const chalk = require('chalk');

function fixMongoUri(uri) {
  if (!uri) return uri;
  // Handle case where password contains @ — re-encode if needed
  // Pattern: mongodb+srv://user:password@host
  // If there are multiple @ signs, the last one before the host is the real separator
  const srvPrefix = 'mongodb+srv://';
  const stdPrefix = 'mongodb://';
  let prefix = '';
  let rest = uri;

  if (uri.startsWith(srvPrefix)) {
    prefix = srvPrefix;
    rest = uri.slice(srvPrefix.length);
  } else if (uri.startsWith(stdPrefix)) {
    prefix = stdPrefix;
    rest = uri.slice(stdPrefix.length);
  } else {
    return uri;
  }

  // Find the last @ before the host (host starts after last @)
  const atIndex = rest.lastIndexOf('@');
  if (atIndex === -1) return uri;

  const userInfo = rest.slice(0, atIndex); // everything before last @
  const hostAndRest = rest.slice(atIndex + 1); // host/db/options

  // userInfo is "user:password" — find first colon to split
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex === -1) return uri;

  const user = userInfo.slice(0, colonIndex);
  const password = userInfo.slice(colonIndex + 1);

  // URL-encode special chars in password if not already encoded
  const encodedPassword = encodeURIComponent(password);
  const encodedUser = encodeURIComponent(user);

  return `${prefix}${encodedUser}:${encodedPassword}@${hostAndRest}`;
}

async function connectDatabase() {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    console.error(chalk.red.bold('  ✘ MONGODB_URI not set'));
    process.exit(1);
  }

  const uri = fixMongoUri(rawUri);

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      family: 4,
      bufferCommands: false,
    });
    console.log(chalk.green('  • MongoDB connected'));
  } catch (err) {
    console.error(chalk.red.bold('  ✘ MongoDB connection failed:'), err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.log(chalk.yellow('  ⚠ MongoDB disconnected. Attempting reconnect...'));
  });

  mongoose.connection.on('reconnected', () => {
    console.log(chalk.green('  ✔ MongoDB reconnected'));
  });

  mongoose.connection.on('error', (err) => {
    console.error(chalk.red('  ✘ MongoDB error:'), err.message);
  });
}

module.exports = { connectDatabase };
