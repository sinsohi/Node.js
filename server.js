const express = require("express");
const { dirname } = require("path");
const app = express();
// express 라이브러리 사용하겠다는 뜻

app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

// 요청.body 쓰려면 이거 필요
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { MongoClient } = require("mongodb");

let db;
const url =
  "mongodb+srv://sosin_303:tlsthgml4033!@cluster0.zrw2oxx.mongodb.net/?retryWrites=true&w=majority";
new MongoClient(url)
  .connect()
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");

    app.listen(8080, () => {
      console.log("http://localhost:8080 에서 서버 실행중");
    });
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (요청, 응답) => {
  // 누가 메인페이지 접속시
  응답.sendFile(__dirname + "/index.html"); // server.js 담긴 폴더
});

app.get("/news", (요청, 응답) => {
  db.collection("post").insertOne({
    title: "어쩌구",
  });
  //   응답.send("오늘 비옴"); // 이거 보내주셈
});

app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  console.log(result[0].title);
  // 응답.send(result[0].title);
  응답.render("list.ejs", { posts: result });
});

app.get("/time", (요청, 응답) => {
  응답.render("time.ejs", { time: new Date() });
});

app.get("/write", (요청, 응답) => {
  응답.render("write.ejs");
});

app.post("/add", (요청, 응답) => {
  console.log(요청.body);
  db.collection("post").insertOne(요청.body);
});
