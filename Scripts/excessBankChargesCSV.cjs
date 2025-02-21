const express = require("express");
const { io } = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

const app = express();
const PORT = process.env.PORT || 3000;
const URL = "wss://agr-controller.rbih.dev.esmagico.in/";
var Total_User_Executed = 0;
var Total_User_Failed = 0;
let firstQuestion = "";
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

const csvWriter = createCsvWriter({
  path: "request_response_log.csv",
  header: [
    { id: "user", title: "User" },
    { id: "request", title: "Request" },
    { id: "response", title: "Response" },
    { id: "responseTime", title: "Response Time (s)" },
    { id: "totalResponseTime", title: "Total Response Time (s)" },
  ],
});

const logToCsv = (user, request, response, responseTime, totalResponseTime) => {
  csvWriter.writeRecords([
    {
      user,
      request,
      response,
      responseTime,
      totalResponseTime,
    },
  ]);
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Read the first question from CSV
const readFirstQuestion = () => {
  return new Promise((resolve, reject) => {
    let firstRowRead = false;
    fs.createReadStream("excessBankCharges.csv")
      .pipe(csv())
      .on("data", (row) => {
        if (!firstRowRead) {
          firstQuestion = row.question;
          firstRowRead = true;
          resolve(firstQuestion);
        }
      })
      .on("error", (error) => reject(error))
      .on("end", () => log("CSV read completed."));
  });
};

// Generate a session ID
function generateSessionId() {
  return uuidv4();
}

// Function to create a socket client
const createClient = (a) => {
  return new Promise((resolve, reject) => {
    const sessionId = generateSessionId();
    log(`Session ID for user ${a}: ${sessionId}`);

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
      log(`User ${a} connected to the server`);
      socket.emit("request", dataToSend);
    });

    socket.on("connect_error", (error) => {
      log(`User ${a} failed to connect: ${error.message}`);
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
        `User ${a} received response: "${message.message}" (Response Time: ${responseTime}s)`
      );

      logToCsv(
        a,
        dataToSend.message.text,
        message.message,
        responseTime,
        totalResponseTime
      );

      if (message.message === "Do you remember the date of transaction?") {
        let messageToSend =
          doYouRememberDateOfTransaction[
            Math.floor(Math.random() * doYouRememberDateOfTransaction.length)
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: { text: messageToSend },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.message === "Please enter the date of transaction") {
        let messageToSend =
          pleaseEnterTheDateOfTransaction[
            Math.floor(Math.random() * pleaseEnterTheDateOfTransaction.length)
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.message === "Please confirm your transactions") {
        let messageToSend =
          pleaseConfirmYourTransactions[
            Math.floor(Math.random() * pleaseConfirmYourTransactions.length)
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message === "Are you satisfied with the resolution provided?"
      ) {
        let messageToSend =
          areYouSatisfiedWithTheResolutionProvided[
            Math.floor(
              Math.random() * areYouSatisfiedWithTheResolutionProvided.length
            )
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message ===
        "Do you want to know about the other transactions too?"
      ) {
        let messageToSend =
          doYouWantToKnowAboutTheOtherTransactionsToo[
            Math.floor(
              Math.random() * doYouWantToKnowAboutTheOtherTransactionsToo.length
            )
          ];
        log(`User ${a}: ${messageToSend}`);
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message === "Please select from the following transactions"
      ) {
        let messageToSend =
          pleaseSelectFromTheFollowingTransactions[
            Math.floor(
              Math.random() * pleaseSelectFromTheFollowingTransactions.length
            )
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message === "Please select Yes to end the conversation."
      ) {
        let messageToSend =
          pleaseSelectYesToEndTheConversation[
            Math.floor(
              Math.random() * pleaseSelectYesToEndTheConversation.length
            )
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message ===
        "Please enter the start date and end date for the transaction"
      ) {
        let messageToSend =
          pleaseEnterTheStartDateAndEndDateForTheTransaction[
            Math.floor(
              Math.random() *
                pleaseEnterTheStartDateAndEndDateForTheTransaction.length
            )
          ];
        log(`User ${a}: ${messageToSend}`);
        socket.emit("request", {
          message: {
            text: messageToSend,
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      }
      if (message.message === "Thanks for your feedback. Happy to serve you.") {
        socket.disconnect();
        resolve();
      }
      if (message.message === "Thank You") {
        socket.disconnect();
        resolve();
      }
    });

    socket.on("error", (error) => {
      log(`Error occurred for user ${a}: ${error.message}`);
      Total_User_Failed++;
      socket.disconnect();
      resolve();
    });
  });
};

app.get("/:numRequests", async (req, res) => {
  const startTime = new Date().getTime();
  const numRequests = parseInt(req.params.numRequests, 10);

  await readFirstQuestion();

  const promises = Array.from({ length: numRequests }, (_, index) =>
    createClient(index)
  );

  await Promise.all(promises);

  const endTime = new Date().getTime();
  const executionTime = (endTime - startTime) / 1000;
  const avgResponseTime =
    totalRequests > 0 ? (totalResponseTime / totalRequests).toFixed(2) : 0;

  log(`Total time taken: ${executionTime} seconds`);
  log(`Average response time: ${avgResponseTime} seconds`);
  log(`Total Users Executed Successfully: ${Total_User_Executed}`);
  log(`Total Users Failed: ${Total_User_Failed}`);

  res.json({
    executionTime,
    avgResponseTime,
    Total_User_Executed,
    Total_User_Failed,
  });
});

app.listen(PORT, () => {
  log(`Server is running on port ${PORT}`);
});
