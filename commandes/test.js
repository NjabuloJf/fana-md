const {fana } = require("../njabulo/fana");
const axios = require('axios');
const cheerio = require('cheerio');
let func = require('../fana/mesfonctions') ;
let hdb = require('../bdd/hentai') ;

fana({
  nomCom: "hwaifu",
  categorie: "Hentai",
  reaction: "🍑"
},
async (origineMessage, zk, commandeOptions) => {
  const { repondre, ms,verifGroupe, superUser} = commandeOptions;

   if (!verifGroupe &&!superUser ) { repondre(`This command is reserved for groups only.`) ; return ;}

    let isHentaiGroupe = await hdb.checkFromHentaiList(origineMessage) ;

    if(!isHentaiGroupe &&!superUser) { repondre(`This group is not a group of perverts, calm down my friend.`) ; return ;}

  const url = 'https://api.waifu.im/images'; // Changed API

  try {
    for (let i = 0 ; i < 5 ; i++ ) {
      // waifu.im uses query params
      const response = await axios.get(url, {
        params: {
          included_tags: 'waifu', // tag you want
          is_nsfw: true, // NSFW = true for hentai command
          many: false
        }
      });

      const imageUrl = response.data.images[0].url; // waifu.im returns images[0].url

      zk.sendMessage(origineMessage, { image: { url: imageUrl } }, { quoted: ms });
    }
  } catch (error) {
    console.error(error);
    repondre('Error occurred while retrieving the data: ' + error.message);
  }
}); 
