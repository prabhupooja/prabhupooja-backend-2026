const db = require("../config/db")
const {Translate} = require('@google-cloud/translate').v2;

const translate = new Translate({
    keyFilename: 'path/to/your/service-account-file.json' // Google Cloud credentials file path
  });

exports.Transaltion = async (req,res) =>{

try {
    const { text, targetLanguage } = req.body;
    try {
      const [translation] = await translate.translate(text, targetLanguage);
      res.send({ translation });
    } catch (error) {
      console.error(error);
      res.status(500).send('Error in translation');
    }
} catch (error) {
    console.log(error);
        res.status(500).send({
            success: false,
            message: "Error in create users",
            error,
        })
}   

}