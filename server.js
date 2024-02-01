const express = require("express");
const { dirname } = require("path");
const app = express();
// express 라이브러리 사용하겠다는 뜻

app.use(express.static(__dirname + "/public"));

app.listen(8080, () => {
  console.log("http://localhost:8080 에서 서버 실행중");
});

app.get("/", (요청, 응답) => {
  // 누가 메인페이지 접속시
  응답.sendFile(__dirname + "/index.html"); // server.js 담긴 폴더
});

app.get("/news", (요청, 응답) => {
  응답.send("오늘 비옴"); // 이거 보내주셈
});

app.get("/about", (요청, 응답) => {
  응답.sendFile(__dirname + "/index.html"); // 이거 보내주셈
});
