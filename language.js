// language.js - Language names only

const languageNames = {
  en: "English",
  sn: "Shona",
  nd: "Ndebele",
  af: "Afrikaans",
  zu: "Zulu",
  xh: "Xhosa",
  pt: "Portuguese",
  sw: "Swahili",
  hi: "Hindi",
  ar: "Arabic",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
  de: "German",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  ku: "Kurdish",
  fa: "Persian",
  he: "Hebrew",
  tr: "Turkish",
  it: "Italian",
  ru: "Russian",
  nl: "Dutch",
  el: "Greek",
  pl: "Polish",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Filipino",
  ms: "Malay",
  vmw: "Makua",
  seh: "Sena",
  ts: "Tsonga",
  ki: "Kikuyu",
  luo: "Luo",
  luh: "Luhya",
  kal: "Kalenjin",
  qu: "Quechua"
};

const languageSections = [
  {
    title: "🌍 Southern Africa",
    rows: [
      { title: "English", description: "EN", rowId: ".setlang en" },
      { title: "Shona", description: "SN - Zimbabwe", rowId: ".setlang sn" },
      { title: "Ndebele", description: "ND - Zimbabwe", rowId: ".setlang nd" },
      { title: "Afrikaans", description: "AF - South Africa", rowId: ".setlang af" },
      { title: "Zulu", description: "ZU - South Africa", rowId: ".setlang zu" },
      { title: "Xhosa", description: "XH - South Africa", rowId: ".setlang xh" }
    ]
  },
  {
    title: "🌍 Mozambique",
    rows: [
      { title: "Portuguese", description: "PT - Mozambique", rowId: ".setlang pt" },
      { title: "Makua", description: "VMW - Mozambique", rowId: ".setlang vmw" },
      { title: "Sena", description: "SEH - Mozambique", rowId: ".setlang seh" },
      { title: "Tsonga", description: "TS - Mozambique", rowId: ".setlang ts" }
    ]
  },
  {
    title: "🌍 Kenya",
    rows: [
      { title: "Swahili", description: "SW - Kenya/TZ", rowId: ".setlang sw" },
      { title: "Kikuyu", description: "KI - Kenya", rowId: ".setlang ki" },
      { title: "Luo", description: "LUO - Kenya", rowId: ".setlang luo" },
      { title: "Luhya", description: "LUH - Kenya", rowId: ".setlang luh" },
      { title: "Kalenjin", description: "KAL - Kenya", rowId: ".setlang kal" }
    ]
  },
  {
    title: "🌍 Nigeria",
    rows: [
      { title: "Hausa", description: "HA - Nigeria", rowId: ".setlang ha" },
      { title: "Igbo", description: "IG - Nigeria", rowId: ".setlang ig" },
      { title: "Yoruba", description: "YO - Nigeria", rowId: ".setlang yo" }
    ]
  },
  {
    title: "🌍 India",
    rows: [
      { title: "Hindi", description: "HI - India", rowId: ".setlang hi" },
      { title: "Bengali", description: "BN - India", rowId: ".setlang bn" },
      { title: "Tamil", description: "TA - India", rowId: ".setlang ta" },
      { title: "Telugu", description: "TE - India", rowId: ".setlang te" },
      { title: "Marathi", description: "MR - India", rowId: ".setlang mr" },
      { title: "Gujarati", description: "GU - India", rowId: ".setlang gu" }
    ]
  },
  {
    title: "🌍 Middle East",
    rows: [
      { title: "Arabic", description: "AR - Iraq", rowId: ".setlang ar" },
      { title: "Kurdish", description: "KU - Iraq", rowId: ".setlang ku" },
      { title: "Persian", description: "FA - Iran", rowId: ".setlang fa" },
      { title: "Hebrew", description: "HE - Israel", rowId: ".setlang he" },
      { title: "Turkish", description: "TR - Turkey", rowId: ".setlang tr" }
    ]
  },
  {
    title: "🌍 Europe",
    rows: [
      { title: "French", description: "FR - France", rowId: ".setlang fr" },
      { title: "Spanish", description: "ES - Spain", rowId: ".setlang es" },
      { title: "German", description: "DE - Germany", rowId: ".setlang de" },
      { title: "Italian", description: "IT - Italy", rowId: ".setlang it" },
      { title: "Russian", description: "RU - Russia", rowId: ".setlang ru" },
      { title: "Dutch", description: "NL - Netherlands", rowId: ".setlang nl" },
      { title: "Greek", description: "EL - Greece", rowId: ".setlang el" },
      { title: "Polish", description: "PL - Poland", rowId: ".setlang pl" }
    ]
  },
  {
    title: "🌍 Asia",
    rows: [
      { title: "Chinese", description: "ZH - China", rowId: ".setlang zh" },
      { title: "Japanese", description: "JA - Japan", rowId: ".setlang ja" },
      { title: "Korean", description: "KO - Korea", rowId: ".setlang ko" },
      { title: "Thai", description: "TH - Thailand", rowId: ".setlang th" },
      { title: "Vietnamese", description: "VI - Vietnam", rowId: ".setlang vi" },
      { title: "Indonesian", description: "ID - Indonesia", rowId: ".setlang id" },
      { title: "Filipino", description: "TL - Philippines", rowId: ".setlang tl" },
      { title: "Malay", description: "MS - Malaysia", rowId: ".setlang ms" }
    ]
  },
  {
    title: "🌍 South America",
    rows: [
      { title: "Spanish", description: "ES - Latin America", rowId: ".setlang es" },
      { title: "Portuguese", description: "PT - Brazil", rowId: ".setlang pt" },
      { title: "Quechua", description: "QU - Peru", rowId: ".setlang qu" }
    ]
  }
];

module.exports = { languageNames, languageSections };