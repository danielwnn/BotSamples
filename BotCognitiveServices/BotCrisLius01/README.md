# Prerequisites
1. Install NodeJS 6.9+ [download link](https://nodejs.org/en/)
2. Install Python and the version must be 2.7.x [download link](https://www.python.org/downloads/release/python-2714/)
-- Due to the NodeJs speaker library is only compatible with Python 2.7.x, which is used for assisting to compile the native code.
3. Install Bot Framework Emulator - [download link](https://github.com/Microsoft/BotFramework-Emulator)

# Steps to run the code locally
1. Change directory to the one where the app.js file resides
2. Run "node install"
3. Run "node app.js"
4. Start Bot Emulator, point to http://localhost:3978/api/messages and connect. 
-- For App ID and Password, please open the .env file and find them inside
