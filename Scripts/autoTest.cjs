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
let totalResponseTime = 0;
let totalRequests = 0;

const csvWriter = createCsvWriter({
  path: "test_results.csv",
  header: [
    { id: "s_no", title: "S.No" },
    { id: "test_case", title: "Test Case" },
    { id: "message_sent", title: "Message Sent" },
    { id: "response", title: "Response" },
    { id: "status", title: "Status" },
    { id: "time_to_execute", title: "Time To Execute" },
  ],
});

const logToCsv = (s_no, test_case, message_sent, response, status, time) => {
  csvWriter.writeRecords([
    { s_no, test_case, message_sent, response, status, time_to_execute: time },
  ]);
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

const readTestCases = () => {
  return new Promise((resolve, reject) => {
    const testCases = [];
    fs.createReadStream("excessBankCharges.csv")
      .pipe(csv())
      .on("data", (row) => {
        testCases.push(row);
      })
      .on("error", (error) => reject(error))
      .on("end", () => resolve(testCases));
  });
};

const createClient = (s_no, test_case) => {
  return new Promise((resolve) => {
    const sessionId = uuidv4();
    log(`Session ID for test case ${s_no}: ${sessionId}`);

    var socket = io(URL, { transports: ["websocket"] });
    const dataToSend = {
      message: { text: test_case },
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
      log(`Test case ${s_no} connected`);
      socket.emit("request", dataToSend);
    });

    socket.on("response", (message) => {
      let endTime = new Date().getTime();
      let responseTime = (endTime - startTime) / 1000;
      totalResponseTime += responseTime;
      totalRequests++;
      log(`Response for ${s_no}: "${message.message}" (Time: ${responseTime}s)`);
      logToCsv(s_no, test_case, dataToSend.message.text, message.message, "Success", responseTime);
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (error) => {
      log(`Test case ${s_no} failed: ${error.message}`);
      Total_User_Failed++;
      logToCsv(s_no, test_case, dataToSend.message.text, "", "Failed", "-");
      socket.disconnect();
      resolve();
    });
  });
};

app.get("/run-tests", async (req, res) => {
  const testCases = await readTestCases();
  const startTime = new Date().getTime();

  const promises = testCases.map((testCase, index) =>
    createClient(index + 1, testCase.question)
  );

  await Promise.all(promises);

  const endTime = new Date().getTime();
  const executionTime = (endTime - startTime) / 1000;
  const avgResponseTime =
    totalRequests > 0 ? (totalResponseTime / totalRequests).toFixed(2) : 0;

  log(`Execution time: ${executionTime} seconds`);
  log(`Average response time: ${avgResponseTime} seconds`);
  log(`Total Passed: ${Total_User_Executed}`);
  log(`Total Failed: ${Total_User_Failed}`);

  res.json({ executionTime, avgResponseTime, Total_User_Executed, Total_User_Failed });
});

app.listen(PORT, () => {
  log(`Server running on port ${PORT}`);
});
