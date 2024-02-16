const express = require("express");
const { dirname } = require("path");
const app = express();
const methodOverride = require("method-override");
// express 라이브러리 사용하겠다는 뜻
const bcrypt = require("bcrypt"); // bcrypt 셋팅 (for hashing)
const MongoStore = require("connect-mongo"); // connect-mongo 셋팅
require("dotenv").config();

app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

// 요청.body 쓰려면 이거 필요
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const { MongoClient, ObjectId } = require("mongodb");

// passport 라이브러리 셋팅
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = new S3Client({
  region: "ap-northeast-2",
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "sinsohiforum",
    key: function (요청, file, cb) {
      cb(null, Date.now().toString()); //업로드시 파일명 변경가능
    },
  }),
});

app.use(passport.initialize());
app.use(
  session({
    secret: "암호화에 쓸 비번",
    resave: false, // 유저가 서버로 요청할 때마다 세션 갱신할건지
    saveUninitialized: false, // 로그인 안해도 세션 만들것인지
    cookie: { maxAge: 60 * 60 * 1000 }, // 세션 document 유효기간 변경
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: "forum",
    }),
  })
);

app.use(passport.session());

let connectDB = require("./database.js");

let db;
connectDB
  .then((client) => {
    console.log("DB연결성공");
    db = client.db("forum");

    app.listen(process.env.PORT, () => {
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

app.get("/login", (요청, 응답) => {
  console.log(요청.user);
  응답.render("login.ejs");
});

app.post("/login", async (요청, 응답, next) => {
  passport.authenticate("local", (error, user, info) => {
    if (error) return 응답.status(500).json(error);
    if (!user) return 응답.status(401).json(info.message);
    요청.logIn(user, (err) => {
      // 실행하면 세션 만들어줌
      if (err) return next(err);
      응답.redirect("/");
    });
  })(요청, 응답, next);
});

app.get("/register", (요청, 응답) => {
  응답.render("register.ejs");
});

app.post("/register", async (요청, 응답) => {
  let 해시 = await bcrypt.hash(요청.body.password, 10);
  console.log(해시);
  await db.collection("user").insertOne({
    username: 요청.body.username,
    password: 해시,
  });
  응답.redirect("/");
});

function checkLogin(요청, 응답, next) {
  // 미들웨어
  if (!요청.user) {
    응답.send("로그인하세요"); // 응답해버리면 남은 코드 실행 안되기 때문에 next()
  }
  next();
}

app.use(checkLogin); // 여기 밑에 있는 모든 API는 checkLogin 미들웨어 적용됨

app.get("/news", (요청, 응답) => {
  db.collection("post").insertOne({
    title: "어쩌구",
  });
  //   응답.send("오늘 비옴"); // 이거 보내주셈
});

app.get("/list", async (요청, 응답) => {
  let result = await db.collection("post").find().toArray();
  // console.log(result[0].title);
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
  // name="img1" 가진 이미지 들어오면 S3에 자동 업로드
  upload.single("img1")(요청, 응답, async (err) => {
    if (err) return 응답.send("UploadErr");
    try {
      if (요청.body.title != "" && 요청.body.content != "") {
        await db.collection("post").insertOne({
          title: 요청.body.title,
          content: 요청.body.content,
          img: 요청.file.location,
        });
        응답.redirect("/list"); //유저를 다른 페이지로 이동
      } else {
        응답.send("제목과 내용 모두 적어주세요");
      }
    } catch (e) {
      console.log(e);
      응답.status(500).send("서버 에러남");
    }
  });
});

app.get("/detail/:id", async (요청, 응답) => {
  try {
    // console.log(요청.params.num);
    let result = await db
      .collection("post")
      .findOne({ _id: new ObjectId(요청.params.id) });
    // console.log(result);
    if (result == null) {
      응답.status(404).send("URL 입력을 제대로 입력해주세요");
    }
    응답.render("detail.ejs", { ShowDetail: result });
  } catch (e) {
    console.log(e);
    응답.status(404).send("URL 입력을 제대로 입력해주세요");
  }
});

app.get("/edit/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .findOne({ _id: new ObjectId(요청.params.id) });
  응답.render("edit.ejs", { result: result });
});

app.put("/edit", async (요청, 응답) => {
  // await db.collection("post").updateOne({ _id: 1 }, { $inc: { like: 1 } });
  let result = await db
    .collection("post")
    .updateOne(
      { _id: new ObjectId(요청.body.id) },
      { $set: { title: 요청.body.title, content: 요청.body.content } }
    );

  응답.redirect("/list");
});

app.post("/abc", (응답, 요청) => {
  console.log("안녕2");
  console.log(요청.body);
  console.log(요청.query);
});

app.delete("/delete", (요청, 응답) => {
  console.log(요청.query);
  db.collection("post").deleteOne({ _id: new ObjectId(요청.query.docid) });
  // db에 있던 document 삭제하기 ~
  응답.send("삭제 완료");
});

app.get("/list/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find()
    .skip((요청.params.id - 1) * 5)
    .limit(5)
    .toArray();
  응답.render("list.ejs", { posts: result });
});

app.get("/list/next/:id", async (요청, 응답) => {
  let result = await db
    .collection("post")
    .find({ _id: { $gt: new ObjectId(요청.params.id) } })
    .limit(5)
    .toArray();
  응답.render("list.ejs", { posts: result });
});

// 제출한 아이디/비번 검사 -> passport.authenticate('local')() 쓰면 실행됨
passport.use(
  new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db
      .collection("user")
      .findOne({ username: 입력한아이디 });
    if (!result) {
      return cb(null, false, { message: "아이디 DB에 없음" });
    }

    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result);
    } else {
      return cb(null, false, { message: "비번불일치" });
    }
  })
);

// 로그인시 세션 만들기 (요청.logIn() 쓰면 자동 실행됨)
passport.serializeUser((user, done) => {
  // console.log(user);
  process.nextTick(() => {
    // 내부 코드를 비동기적으로 처리해줌
    done(null, { id: user._id, username: user.username });
  });
});

// 유저가 보낸 쿠키 분석 (세션 정보 적힌 쿠키 가지고 있는 유저가 요청 날릴 때마다 실행됨)
passport.deserializeUser(async (user, done) => {
  let result = await db
    .collection("user")
    .findOne({ _id: new ObjectId(user.id) });
  delete result.password;
  process.nextTick(() => {
    done(null, result); // result : 요청.user에 들어감
  });
});

app.use("/shop", require("./routes/shop.js"));
app.use("/board/sub", require("./routes/board.js"));

app.get("/search", async (요청, 응답) => {
  console.log(요청.query.val);
  let result = await db
    .collection("post")
    .find({ $text: { $search: 요청.query.val } })
    .toArray();
  응답.render("search.ejs", { posts: result });
});
