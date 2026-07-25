const axios = require("axios");

exports.getQuestions = async () => {

  const res = await axios.get("http://localhost:8000/ema/questions");

  return res.data;

};

exports.submitAnswers = async (answers) => {

  const res = await axios.post(
    "http://localhost:8000/ema/submit",
    { answers }
  );

  return res.data;

};