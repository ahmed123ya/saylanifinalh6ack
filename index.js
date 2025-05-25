const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");
const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const axios = require('axios');


const apiKey =
  process.env.GEMINI_API_KEY || "AIzaSyDY0Q7Kx6zvjOgmlyGCVI-B5PwmRmMaxrE";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 200,
  responseMimeType: "text/plain",
};

async function runChat(queryText) {
  const chatSession = model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(queryText);
  return result.response.text(); // Return the response text
}



const app = express();
const PORT = process.env.PORT || 8080;


app.use(bodyParser.json());

// Endpoint for basic server status
app.get("/", (req, res) => {
  res.status(200).send("Server is running!");
});


app.post('/webhook', async (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  if (intent === 'translatetext') {
    const text = req.body.queryResult.parameters.text || 'No text provided';

    const translated = await translateText(text); // Use Hugging Face here

    return res.json({
      fulfillmentText: `Translated to Hindi: ${translated}`,
    });
  }
  var id = (res.req.body.session).substr(43);
  console.log(id)
  const agent = new WebhookClient({
      request: req,
      response: res
  });
  const modelMap = {
    hi: 'Helsinki-NLP/opus-mt-en-hi',
    fr: 'Helsinki-NLP/opus-mt-en-fr',
    es: 'Helsinki-NLP/opus-mt-en-es',
    de: 'Helsinki-NLP/opus-mt-en-de',
    it: 'Helsinki-NLP/opus-mt-en-it',
    ar: 'Helsinki-NLP/opus-mt-en-ar',
    ja: 'Helsinki-NLP/opus-mt-en-jap',
    zh: 'Helsinki-NLP/opus-mt-en-zh',
    ru: 'Helsinki-NLP/opus-mt-en-ru',
    pt: 'Helsinki-NLP/opus-mt-en-pt',
    nl: 'Helsinki-NLP/opus-mt-en-nl',
    tr: 'Helsinki-NLP/opus-mt-en-tr',
    ur: 'Helsinki-NLP/opus-mt-en-ur',
    // add more as needed
  };
  async function translateText(text, langCode) {
    const model = modelMap[langCode];

    if (!model) return `Sorry, translation to '${langCode}' is not supported.`;

    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: text },
      {
        headers: { Authorization: `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` },
      }
    );

    return response.data[0]?.translation_text || 'Translation failed';
  }

  async function fallback() {
      let action = req.body.queryResult.action;
      let queryText = req.body.queryResult.queryText;

      if (action === 'input.unknown') {
          let result = await runChat(queryText);
          agent.add(result);
          console.log(result)
      }else{
          agent.add(result);
          console.log(result)
      }
  }
  function hi(agent) {
      console.log(`intent  =>  hi`);
      agent.add('Hi, I am your virtual assistant, Tell me how can I help you')
  }
  function OrderStatus(agent) 
   {
    const {email,name, time} = agent.parameters;
   agent.add(
     `The Email Address is ${email} and Your Name is ${name} and your order will arrive at your desired time which is ${time}`
      );
   }
//order custom intent
     function order(agent) 
      {
       const {food,date, time, person, number, location} = agent.parameters;
      agent.add(
        `Hi, ${person.name} your order ${food} will be delivered on $date.original at ${time.original} at your location: ${location} please ready the cash or if you transfer online show reciept to delivery rider on date ${date} should be on to Avoid Any inconvience thanks for ordering with us`
         );
   }
   
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', hi);
  intentMap.set('Default Fallback Intent', fallback);
   intentMap.set('translatetext', translateText);
  intentMap.set('OrderStatus', OrderStatus);
  intentMap.set('order',order);
  agent.handleRequest(intentMap);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});