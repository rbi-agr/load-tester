const express = require("express");
const { io } = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const csv = require("csv-parser");
const { time } = require("console");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const app = express();
const PORT = process.env.PORT || 3000;
const URL = "wss://agr-controller.rbih.dev.esmagico.in/";
var Total_User_Executed = 0;
var Total_User_Failed = 0;
let totalResponseTime = 0;
let totalRequests = 0;

const doYouRememberDateOfTransaction = [
  "Yes, I remember",
  "No, I don't remember",
];
const pleaseEnterTheDateOfTransaction = [
  `{"startDate": "13/02/2025","endDate": "19/02/2025"}`,
];
const pleaseConfirmYourTransactions = [
  "March 13, 2024|Excess wdl charges|300.000",
  "March 13, 2024|ATM AMC CHGS|118.000",
  "March 14, 2024|Cash handling charges|1000.000",
  "March 14, 2024|MIN BAL CHGS|36.000",
];
const areYouSatisfiedWithTheResolutionProvided = [
  "Yes, I am satisfied",
  "No, I am not satisfied",
];
const doYouWantToKnowAboutTheOtherTransactionsToo = [
  "Yes, I want to know",
  "No, I don't want to know",
];
const pleaseSelectFromTheFollowingTransactions = [
  "March 13, 2024|ATM AMC CHGS|118.000",
  "March 14, 2024|Cash handling charges|1000.000",
  "March 14, 2024|ATM WDL CHARGES|14.000",
  "March 14, 2024|MIN BAL CHGS|36.000",
];

const pleaseSelectYesToEndTheConversation = ["Yes, end the conversation"];

const pleaseEnterTheStartDateAndEndDateForTheTransaction = [
  `{"startDate": "13/02/2025","endDate": "19/02/2025"}`,
];
const csvFilePath = "test_results.csv";
const fileExists = fs.existsSync(csvFilePath);
const csvWriter = createCsvWriter({
  path: csvFilePath,
  header: [
    { id: "user_id", title: "User ID" },
    { id: "s_no", title: "S.No" },
    { id: "test_case", title: "Test Case" },
    { id: "message_sent", title: "Message Sent" },
    { id: "response", title: "Response" },
    { id: "response_time", title: "Time To Execute" },
    { id: "totalResponseTime", title: "Total response time" },
    { id: "timestamp", title: "Timestamp" },
    { id: "remark", title: "Remark" },
  ],
  append: fileExists, // Append if the file exists, otherwise write headers
});

if (!fileExists) {
  csvWriter.writeRecords([]); // Ensures headers are written
}

const logToCsv = (
  user_id,
  s_no,
  test_case,
  message_sent,
  response,
  response_time,
  totalResponseTime,
  timestamp,
  remark = ""
) => {
  csvWriter.writeRecords([
    {
      user_id, // Log User ID
      s_no,
      test_case,
      message_sent,
      response,
      response_time,
      totalResponseTime,
      timestamp,
      remark,
    },
  ]);
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

let questions = [];
let currentQuestionIndex = 0;

// Read all questions from CSV
const readQuestions = () => {
  return new Promise((resolve, reject) => {
    fs.createReadStream("excessBankCharges.csv")
      .pipe(csv())
      .on("data", (row) => {
        questions.push(row.question);
      })
      .on("error", (error) => reject(error))
      .on("end", () => {
        log("CSV read completed.");
        resolve();
      });
  });
};

const getNextQuestion = () => {
  const question = questions[currentQuestionIndex];
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  return question;
};

// Generate a session ID
function generateSessionId() {
  return uuidv4();
}

// Function to create a socket client
const createClient = (user_id) => {
  return new Promise((resolve, reject) => {
    const sessionId = generateSessionId();
    let userQuestions = [...questions]; // Clone questions for each user
    let userQuestionIndex = 0;

    const firstQuestion = getNextQuestion();
    log(`🎉 Session ID for user ${user_id}: ${sessionId}`);

    var socket = io(URL, { transports: ["websocket"] });
    const dataToSend = {
      message: {
        text: firstQuestion,
      },
      session_id: sessionId,
      metadata: {
        phoneNumber: "8002933187",
        accountNumber: "SB-456487645",
        dob: "2024-04-05",
        language: "en",
      },
    };

    let startTime = new Date().getTime();

    socket.on("connect", () => {
      log(`✅ User ${user_id} connected to the server`);
      logToCsv(user_id, 1, firstQuestion, "", "", "", "", "", "User connected");
      socket.emit("request", dataToSend);
      log(`💬 User ${user_id}: ${firstQuestion}`);
    });

    socket.on("connect_error", (error) => {
      log(`❌ User ${user_id} failed to connect: ${error.message}`);
      Total_User_Failed++;
      socket.disconnect();
      resolve();
    });

    socket.on("response", (message) => {
      let endTime = new Date().getTime();
      let responseTime = (endTime - startTime) / 1000;
      totalResponseTime += responseTime;
      totalRequests++;
      log(
        `📥 User ${user_id} received response: "${message.message}" (Response Time: ${responseTime}s)`
      );

      const timestamp = new Date().toISOString();

      if (message.message === "Do you remember the date of transaction?") {
        let messageToSend1 =
          doYouRememberDateOfTransaction[
            Math.floor(Math.random() * doYouRememberDateOfTransaction.length)
          ];
        log(`💬 User ${user_id}: ${messageToSend1}`);
        socket.emit("request", {
          message: { text: messageToSend1 },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend1,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message ===
          "I apologize, but I didn't quite understand that. Could you please rephrase your question?" ||
        message.message ===
          "I could not fetch transactions from the bank. Please try again later."
      ) {
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          "",
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          "Restarting user journey"
        );
        userQuestionIndex = 0; // Reset to the first question
        const firstQuestion = "500 deducted from my bank account";
        logToCsv(user_id, 1, firstQuestion, "", "", "", "User connected");
        socket.emit("request", {
          message: { text: firstQuestion },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.message === "Please enter the date of transaction") {
        let messageToSend2 =
          pleaseEnterTheDateOfTransaction[
            Math.floor(Math.random() * pleaseEnterTheDateOfTransaction.length)
          ];
        log(`💬 User ${user_id}: ${messageToSend2}`);
        socket.emit("request", {
          message: {
            text: messageToSend2,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend2,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (message.message === "Please confirm your transactions") {
        let messageToSend3 =
          pleaseConfirmYourTransactions[
            Math.floor(Math.random() * pleaseConfirmYourTransactions.length)
          ];
        log(`💬 User ${user_id}: ${messageToSend3}`);
        socket.emit("request", {
          message: {
            text: messageToSend3,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend3,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message === "Are you satisfied with the resolution provided?"
      ) {
        let messageToSend4 =
          areYouSatisfiedWithTheResolutionProvided[
            Math.floor(
              Math.random() * areYouSatisfiedWithTheResolutionProvided.length
            )
          ];
        log(`💬 User ${user_id}: ${messageToSend4}`);
        socket.emit("request", {
          message: {
            text: messageToSend4,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend4,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message ===
        "Do you want to know about the other transactions too?"
      ) {
        let messageToSend5 =
          doYouWantToKnowAboutTheOtherTransactionsToo[
            Math.floor(
              Math.random() * doYouWantToKnowAboutTheOtherTransactionsToo.length
            )
          ];
        log(`💬 User ${user_id}: ${messageToSend5}`);
        socket.emit("request", {
          message: {
            text: messageToSend5,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend5,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message === "Please select from the following transactions"
      ) {
        let messageToSend6 =
          pleaseSelectFromTheFollowingTransactions[
            Math.floor(
              Math.random() * pleaseSelectFromTheFollowingTransactions.length
            )
          ];
        log(`💬 User ${user_id}: ${messageToSend6}`);
        socket.emit("request", {
          message: {
            text: messageToSend6,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend6,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message === "Please select Yes to end the conversation."
      ) {
        let messageToSend7 =
          pleaseSelectYesToEndTheConversation[
            Math.floor(
              Math.random() * pleaseSelectYesToEndTheConversation.length
            )
          ];
        log(`💬 User ${user_id}: ${messageToSend7}`);
        socket.emit("request", {
          message: {
            text: messageToSend7,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend7,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message ===
        "Please enter the start date and end date for the transaction"
      ) {
        let messageToSend8 =
          pleaseEnterTheStartDateAndEndDateForTheTransaction[
            Math.floor(
              Math.random() *
                pleaseEnterTheStartDateAndEndDateForTheTransaction.length
            )
          ];
        log(`💬 User ${user_id}: ${messageToSend8}`);
        socket.emit("request", {
          message: {
            text: messageToSend8,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          messageToSend8,
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
      } else if (
        message.message === "Thanks for your feedback. Happy to serve you."
      ) {
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          "",
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
        socket.disconnect();
        resolve();
      } else if (message.message === "Thank You") {
        log(`💬 User ${user_id}: ${messageToSend}`);
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          "",
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          ""
        );
        socket.disconnect();
        resolve();
      } else if (
        message.message ===
        "I apologize, but I didn't quite understand that. Could you please rephrase your question?"
      ) {
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          "",
          message.message,
          message.message,
          responseTime,
          time_to_execute,
          timestamp,
          "Restarting user journey"
        );
        userQuestionIndex = 0; // Reset to the first question
        const firstQuestion = getNextUserQuestion();
        socket.emit("request", {
          message: { text: firstQuestion },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message ===
        "Please refresh to restart the conversation or select yes to end the conversation."
      ) {
        logToCsv(
          user_id,
          userQuestionIndex,
          "",
          "",
          message.message,
          responseTime,
          totalResponseTime,
          timestamp,
          "Conversation ended by bot"
        );
        socket.disconnect();
        resolve();
      }
    });

    // Add a timeout to forcefully disconnect the socket if it gets stuck
    const timeout = setTimeout(() => {
      log(`⏰ User ${user_id} timed out. Forcefully disconnecting.`);
      socket.disconnect();
      resolve();
    }, 120000); // 2min

    socket.on("disconnect", () => {
      clearTimeout(timeout);
    });

    socket.on("error", (error) => {
      log(`❌ Error occurred for user ${user_id}: ${error.message}`);
      Total_User_Failed++;
      socket.disconnect();
      resolve();
    });
  });
};

app.get("/:numRequests", async (req, res) => {
  const startTime = new Date().getTime();
  const numRequests = parseInt(req.params.numRequests, 10);

  await readQuestions();

  const promises = Array.from(
    { length: numRequests },
    (_, index) => createClient(index + 1) // User ID starts from 1
  );

  await Promise.all(promises);

  const endTime = new Date().getTime();
  const executionTime = (endTime - startTime) / 1000;
  const avgResponseTime =
    totalRequests > 0 ? (totalResponseTime / totalRequests).toFixed(2) : 0;

  log(`⏱️ Total time taken: ${executionTime} seconds`);
  log(`📊 Average response time: ${avgResponseTime} seconds`);
  log(`✅ Total Users Executed Successfully: ${Total_User_Executed}`);
  log(`❌ Total Users Failed: ${Total_User_Failed}`);

  res.json({
    executionTime,
    avgResponseTime,
    Total_User_Executed,
    Total_User_Failed,
  });
});

app.listen(PORT, () => {
  log(`🚀 Server is running on port ${PORT}`);
});
