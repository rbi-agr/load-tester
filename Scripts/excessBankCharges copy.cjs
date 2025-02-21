const express = require("express");
const { io } = require("socket.io-client");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const PORT = process.env.PORT || 3000;
const URL = "wss://agr-controller.rbih.dev.esmagico.in/";
var Total_User_Executed = 0;
var Total_User_Failed = 0;
let firstQuestion = "";
let totalResponseTime = 0;
let totalRequests = 0;

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

      if (message.message === "Do you remember the date of transaction?") {
        const rememberDate = Math.random() < 0.5;
        if (rememberDate) {
          log(`User ${a}: "Yes, I remember"`);
          socket.emit("request", {
            message: { text: "Yes, I remember" },
            session_id: sessionId,
            metadata: dataToSend.metadata,
          });
        } else {
          log(`User ${a}: "No, I don't remember"`);
          socket.emit("request", {
            message: { text: "No, I don't remember" },
            session_id: sessionId,
            metadata: dataToSend.metadata,
          });
        }
      } else if (message.message === "Please enter the date of transaction") {
        log(`User ${a}: "20/02/2025"`);
        socket.emit("request", {
          message: { text: "20/02/2025" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message ===
        "Please enter the start date and end date for the transaction"
      ) {
        log(`User ${a}: '{"startDate": "13/02/2025","endDate": "19/02/2025"}'`);
        socket.emit("request", {
          message: {
            text: '{"startDate": "13/02/2025","endDate": "19/02/2025"}',
          },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.message === "Please confirm your transactions") {
        log(`User ${a}: "March 13, 2024|Excess wdl charges|300.000"`);
        socket.emit("request", {
          message: { text: "March 13, 2024|Excess wdl charges|300.000" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message.includes("Reason:- Excess withdrawal charges")
      ) {
        log(`User ${a}: "Yes, I am satisfied"`);
        socket.emit("request", {
          message: { text: "Yes, I am satisfied" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message ===
        "Do you want to know about the other transactions too?"
      ) {
        log(`User ${a}: "Yes, I want to know"`);
        socket.emit("request", {
          message: { text: "Yes, I want to know" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message === "Please select from the following transactions"
      ) {
        log(`User ${a}: "March 13, 2024|ATM AMC CHGS|118.000"`);
        socket.emit("request", {
          message: { text: "March 13, 2024|ATM AMC CHGS|118.000" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.message.includes("AMC for your ATM Card")) {
        log(`User ${a}: "No, I am not satisfied"`);
        socket.emit("request", {
          message: { text: "No, I am not satisfied" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (
        message.message === "Please select Yes to end the conversation."
      ) {
        log(`User ${a}: "Yes, end the conversation"`);
        socket.emit("request", {
          message: { text: "Yes, end the conversation" },
          session_id: sessionId,
          metadata: dataToSend.metadata,
        });
      } else if (message.end_connection === true) {
        Total_User_Executed++;
        log(`Total User Executed: ${Total_User_Executed}`);
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
