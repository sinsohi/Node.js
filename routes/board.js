const router = require("express").Router();

function checkLogin(요청, 응답, next) {
  // 미들웨어
  if (!요청.user) {
    응답.send("로그인하세요"); // 응답해버리면 남은 코드 실행 안되기 때문에 next()
  }
  next();
}

router.use(checkLogin);

router.get("/sports", (요청, 응답) => {
  응답.send("스포츠 게시판");
});

router.get("/game", (요청, 응답) => {
  응답.send("게임 게시판");
});

module.exports = router;
