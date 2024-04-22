const express = require('express');
const { io } = require("socket.io-client");
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = process.env.PORT || 3000;
const URL = 'wss://controller-agr-staging.rbihub.in';
var Total_User_Executed = 0;
function generateSessionId() {
  return uuidv4();
}
const createClient = (a) => {
  return new Promise((resolve, reject) => {
    const sessionId = generateSessionId();
    console.log(sessionId);
    var socket = io(URL, { transports: ['websocket'] });
    const dataToSend = {
      "message":{
          "text":"I have been charged 500Rs in my saving account"
      },
      "session_id":sessionId,
      "metadata":{
          "phoneNumber":"8002933187",
          "accountNumber":"SB-456487645",
          "dob":"2024-04-05",
          "language":"en"
      }
  }
  socket.on('connect', () => {
      console.log(`User ${a} Connected to server`);
      socket.emit('request', dataToSend);
      // socket.disconnect();
      // resolve();
    });
    socket.on('response', (message) => {
      // console.log(message);
      if(message.message == 'Do you remember the date of transaction?'){
        console.log(`remember the date of transaction of user ${a}`)
        const Res_Body = {
          "message":{
              "text":"No, I don't remember"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
    }
      else if(message.message == 'Please enter the start date and end date for the transaction'){
        // socket.disconnect();
        // resolve();
        console.log(`enter the start date and end date of user ${a}`)
        const Res_Body = {
          "message":{
              "text":"{\"startDate\": \"2024/04/04\",\"endDate\": \"2024/04/04\"}"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
    }
      else if(message.message == 'Please confirm your transactions'){
        console.log(`confirm your transactions for user ${0}`)
        const Res_Body = {
          "message":{
              "text":"March 13, 2024|Excess wdl charges|300.000"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
      }else if(message.message == 'Are you satisfied with the resolution provided?'){
        console.log(`satisfied with the resolution provided for user ${a}`)
        const Res_Body = {
          "message":{
              "text":"Yes, I am satisfied"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
      }else if(message.message == 'Do you want to know about the other transactions too?'){
        console.log(`want to know about the other transactions for user ${a}`)
        const Res_Body = {
          "message":{
              "text":"No, I don't want to know"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
      }else if(message.message == 'Please give a rating on a scale of 1 to 5'){
        console.log(`rating given by user ${0}`)
        const Res_Body = {
          "message":{
              "text":"4"
          },
          "session_id":sessionId,
          "metadata":{
              "phoneNumber":"8002933187",
              "accountNumber":"SB-456487645",
              "dob":"2024-04-05",
              "language":"en"
          }
      }
        socket.emit('request', Res_Body);
      }
      else if(message.end_connection == true){
        Total_User_Executed++;
        console.log(`Total User Executed :- ${Total_User_Executed}`)
        socket.disconnect();
        resolve();
      }
      // console.log('Received message from server:'+sessionId, message);
    });
  });
};

app.get('/:numRequests', async (req, res) => {
  const startTime = new Date().getTime(); // Record start time
  const numRequests = parseInt(req.params.numRequests, 10);;
  // Create an array of promises for each request
  const promises = Array.from({ length: numRequests }, (i,index) => createClient(index));

  // Execute all promises concurrently
  await Promise.all(promises);

  const endTime = new Date().getTime(); // Record end time
  const executionTime = (endTime - startTime) / 1000; // Calculate execution time in milliseconds
  console.log(`Total time taken: ${executionTime} milliseconds`);
  res.json({ executionTime });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
